import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadGhostPackage, resolveGhostPackage } from "../src/package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/review/review-packet.js";
import { runCli } from "./cli-test-utils.js";

const PURPOSE =
  "Rules for writing copy.\n\nSelect only for legal copy.\n\n- Keep the qualification.\n- Do not apply to informal messages.";
const BODY =
  "## Wording\n\nState the unique approved phrase.\n\n## Tone\n\nUse the unique restrained tone.";

describe("agent-facing semantic delivery", () => {
  let dir: string;
  let packageDir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-semantic-"));
    packageDir = join(dir, ".ghost");
    await mkdir(join(packageDir, "checks"), { recursive: true });
    await writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.package/v1\nid: semantic-test\n",
    );
    await writeFile(
      join(packageDir, "glossary.md"),
      `---\nkinds:\n  - name: rule\n  - name: unused\n---\n\n# rule\n\n${PURPOSE}\n\n# unused\n\nUnused meaning.\n`,
    );
    await writeFile(
      join(packageDir, "rule.voice.md"),
      `---\nfor: Writing legal copy.\n---\n\n${BODY}\n`,
    );
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function check(id: string, reference: string): Promise<void> {
    await writeFile(
      join(packageDir, "checks", `${id}.md`),
      `---\nname: ${id}\ndescription: Review wording.\nseverity: high\nreferences:\n  - ${reference}\n---\n\nCompare the change with its referenced guidance.\n`,
    );
  }

  async function packet(diff = "") {
    const loaded = await loadGhostPackage(resolveGhostPackage(packageDir, dir));
    return buildReviewPacket(loaded, diff, { cwd: dir, packageDir });
  }

  it("delivers every paragraph of kind meaning in JSON and Markdown", async () => {
    await writeFile(
      join(packageDir, "rule.other.md"),
      "---\nfor: Writing legal copy.\n---\n\nOther rule.\n",
    );
    const json = await runCli(
      ["gather", "legal copy", "--format", "json"],
      dir,
    );
    expect(json.code).toBe(0);
    const menu = JSON.parse(json.stdout);
    expect(
      menu.kinds.find((kind: { name: string }) => kind.name === "rule").purpose,
    ).toBe(PURPOSE);

    const markdown = await runCli(["gather", "legal copy"], dir);
    expect(markdown.code).toBe(0);
    expect(markdown.stdout.split(PURPOSE)).toHaveLength(2);
    expect(markdown.stdout).not.toContain("Unused meaning.");
    expect(markdown.stdout.indexOf(PURPOSE)).toBeLessThan(
      markdown.stdout.indexOf("`rule.other`"),
    );
    expect(markdown.stdout).toContain(menu.contract.selection.instruction);
  });

  it("renders the baseline and applicability for a prose-only review check", async () => {
    await check("voice", "rule.voice");
    const result = await packet();
    expect(result.materialNodes).toEqual([]);
    expect(result.checks[0]?.baseline[0]?.body).toBe(BODY);
    const markdown = formatReviewPacket(result);
    expect(markdown).toContain("Applies when: Writing legal copy.");
    expect(markdown).toContain("> State the unique approved phrase.");
    expect(markdown).toContain("> Use the unique restrained tone.");
  });

  it("renders a repeated baseline section once and points back to it", async () => {
    await check("first", "rule.voice > Wording");
    await check("second", "rule.voice > wording");
    const markdown = formatReviewPacket(await packet());
    expect(markdown.split("State the unique approved phrase.")).toHaveLength(2);
    expect(markdown).not.toContain("Use the unique restrained tone.");
    expect(markdown).toContain("prose shown above");
  });

  it("preserves distinct baseline sections", async () => {
    await check("first", "rule.voice > Wording");
    await check("second", "rule.voice > Tone");
    const markdown = formatReviewPacket(await packet());
    expect(markdown).toContain("State the unique approved phrase.");
    expect(markdown).toContain("Use the unique restrained tone.");
  });

  it("keeps missing-heading warnings and the whole-body fallback", async () => {
    await check("first", "rule.voice > Missing");
    await check("second", "rule.voice > Tone");
    const markdown = formatReviewPacket(await packet());
    expect(markdown).toContain("heading 'Missing' not found");
    expect(markdown.split("State the unique approved phrase.")).toHaveLength(2);
    expect(markdown.split("Use the unique restrained tone.")).toHaveLength(2);
    expect(markdown).toContain("prose shown above");
  });

  it("reuses a matched material node's prose for whole-node and section references", async () => {
    await writeFile(
      join(packageDir, "rule.voice.md"),
      `---\nfor: Writing legal copy.\nmaterials:\n  - copy.txt\n---\n\n${BODY}\n`,
    );
    await check("first", "rule.voice");
    await check("second", "rule.voice > Wording");
    const result = await packet(
      "diff --git a/copy.txt b/copy.txt\n--- a/copy.txt\n+++ b/copy.txt\n@@ -1 +1 @@\n-old\n+new\n",
    );
    expect(result.materialNodes).toHaveLength(1);
    const markdown = formatReviewPacket(result);
    expect(markdown.split("State the unique approved phrase.")).toHaveLength(2);
    expect(markdown.split("Use the unique restrained tone.")).toHaveLength(2);
    expect(markdown.split("prose shown above")).toHaveLength(3);
  });
});
