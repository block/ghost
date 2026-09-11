import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadGhostPackage, resolveGhostPackage } from "../src/package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../src/review/review-packet.js";

const BUTTON =
  "## Usage\n\nKeep the action accountable.\n\n## Rules\n\nUse the approved button.";
const VOICE = "State what happened without applause.";
const changed = (path: string) =>
  `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1 +1 @@\n-old\n+new\n`;

describe("explicit review packet", () => {
  let dir: string;
  let packageDir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ghost-review-explicit-"));
    packageDir = join(dir, ".ghost");
    await mkdir(join(packageDir, "checks"), { recursive: true });
    await writeFile(
      join(packageDir, "manifest.yml"),
      "schema: ghost.package/v1\nid: explicit-review\ncover: brand\n",
    );
    await writeFile(
      join(packageDir, "brand.md"),
      "---\nfor: All brand work.\n---\n\nBrand stance.\n",
    );
    await writeFile(
      join(packageDir, "component.button.md"),
      `---\nfor: Composing an action.\nmaterials:\n  - locator: components/button.tsx\n    note: Canonical control implementation\n  - https://example.com/button\n---\n\n${BUTTON}\n`,
    );
    await writeFile(
      join(packageDir, "voice.md"),
      `---\nfor: Writing copy.\n---\n\n${VOICE}\n`,
    );
    await writeFile(
      join(packageDir, "checks", "button.md"),
      "---\nname: Button\ndescription: Check the action.\nseverity: high\nreferences:\n  - component.button > Rules\n  - voice\n---\n\nAssess both control and copy.\n",
    );
    await writeFile(
      join(packageDir, "checks", "voice.md"),
      "---\nname: Voice\ndescription: Check copy.\nseverity: medium\nreferences:\n  - voice\n---\n\nAssess the voice.\n",
    );
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function packet(
    nodeIds?: readonly string[],
    diff = changed("checkout.tsx"),
  ) {
    return buildReviewPacket(
      await loadGhostPackage(resolveGhostPackage(packageDir, dir)),
      diff,
      { cwd: dir, packageDir, nodeIds },
    );
  }

  it("includes unchanged material guidance, full declarations, and every check baseline", async () => {
    const result = await packet(["component.button"]);
    expect(result.materialNodes).toEqual([]);
    expect(result.explicitNodeIds).toEqual(["component.button"]);
    expect(result.explicitNodes).toEqual([
      {
        id: "component.button",
        kind: "component",
        for: "Composing an action.",
        prose: BUTTON,
        materials: [
          {
            locator: "components/button.tsx",
            note: "Canonical control implementation",
          },
          "https://example.com/button",
        ],
      },
    ]);
    const check = result.checks.find((item) => item.id === "button");
    expect(check).toMatchObject({
      offered: "explicit",
      via: ["component.button > Rules"],
      explicitVia: ["component.button > Rules"],
    });
    expect(check?.baseline.map((baseline) => baseline.body)).toEqual([
      "Use the approved button.",
      VOICE,
    ]);
    expect(result.checks.map((item) => item.id)).toEqual(["button", "voice"]);
    expect(
      result.gaps.find((gap) => gap.kind === "unmatched-file")?.files,
    ).toEqual(["checkout.tsx"]);
    const markdown = formatReviewPacket(result);
    expect(markdown).toContain("Explicit guidance");
    expect(markdown).toContain(BUTTON);
    expect(markdown).toContain("Canonical control implementation");
    expect(markdown).toContain("https://example.com/button");
    expect(markdown).toContain(VOICE);
    expect(markdown).toContain("Offered via explicit guidance");
    expect(markdown.split("Use the approved button.")).toHaveLength(2);
    expect(markdown).toContain(result.diff.trimEnd());
  });

  it("preserves load diagnostics alongside explicit guidance, checks, and coverage gaps", async () => {
    await writeFile(
      join(packageDir, "broken.md"),
      "---\nfor: [not, text]\n---\n\nInvalid guidance.\n",
    );
    await writeFile(
      join(packageDir, "checks", "broken.md"),
      "No frontmatter.\n",
    );
    const result = await packet(["component.button"]);
    expect(result.diagnostics.map((entry) => entry.file)).toEqual([
      "broken.md",
      "checks/broken.md",
    ]);
    expect(result.explicitNodeIds).toEqual(["component.button"]);
    expect(result.materialNodes).toEqual([]);
    expect(result.checks.find((check) => check.id === "button")).toMatchObject({
      offered: "explicit",
      explicitVia: ["component.button > Rules"],
    });
    expect(result.checks.map((check) => check.id)).toEqual(["button", "voice"]);
    expect(result.gaps).toContainEqual(
      expect.objectContaining({
        kind: "unmatched-file",
        files: ["checkout.tsx"],
      }),
    );
    const markdown = formatReviewPacket(result);
    for (const diagnostic of result.diagnostics) {
      expect(markdown).toContain(diagnostic.file);
      expect(markdown).toContain(diagnostic.message);
    }
    expect(markdown).toContain("ghost validate");
    expect(markdown).toContain("## Explicit guidance");
    expect(markdown).toContain(BUTTON);
    expect(markdown.split("Use the approved button.")).toHaveLength(2);
    expect(markdown).toContain("Baseline prose shown above.");
    expect(markdown).toContain(VOICE);
    expect(markdown).toContain("## Coverage gaps");
    expect(markdown).toContain(result.diff.trimEnd());
  });

  it("keeps matched and always-offered provenance when explicit selection overlaps", async () => {
    const result = await packet(
      ["voice", "component.button", "voice"],
      changed("components/button.tsx"),
    );
    expect(result.explicitNodeIds).toEqual(["voice", "component.button"]);
    expect(result.explicitNodes?.map((node) => node.id)).toEqual(["voice"]);
    expect(result.materialNodes.map((node) => node.id)).toEqual([
      "component.button",
    ]);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "button",
          offered: "matched",
          via: ["component.button > Rules"],
          explicitVia: ["component.button > Rules", "voice"],
        }),
        expect.objectContaining({
          id: "voice",
          offered: "always",
          via: ["voice"],
          explicitVia: ["voice"],
        }),
      ]),
    );
    const markdown = formatReviewPacket(result);
    expect(markdown.split(BUTTON)).toHaveLength(2);
    expect(markdown.split(VOICE)).toHaveLength(2);
    expect(markdown).toContain("https://example.com/button");
    expect(markdown).toContain("Also selected explicitly");
    expect(markdown).toContain("`component.button` (prose shown above)");
  });

  it("includes a selected cover with no checks without manufacturing a check or fallback", async () => {
    const result = await packet(["brand"]);
    expect(result.explicitNodes?.[0]).toMatchObject({
      id: "brand",
      prose: "Brand stance.",
    });
    expect(result.checks.map((check) => check.id)).toEqual(["voice"]);
    expect(formatReviewPacket(result)).not.toContain("# ghost default");
  });

  it("does not auto-add the cover and preserves default packet shape without selection", async () => {
    const result = await packet();
    expect(result).not.toHaveProperty("explicitNodeIds");
    expect(result).not.toHaveProperty("explicitNodes");
    expect(result.checks.map((check) => check.id)).toEqual(["voice"]);
    expect(result.checks[0]).not.toHaveProperty("explicitVia");
    expect(formatReviewPacket(result)).not.toContain("Brand stance.");
    expect(formatReviewPacket(result)).not.toContain("Explicit guidance");
  });

  it("preserves a complete long explicit node with no referencing checks", async () => {
    const body = Array.from(
      { length: 4000 },
      (_, index) => `Decision ${index}: 日本語 🧭.`,
    ).join("\n");
    await writeFile(
      join(packageDir, "long.md"),
      `---\nfor: Long guidance.\n---\n\n${body}\n`,
    );
    const result = await packet(["long"]);
    expect(result.explicitNodes?.[0].prose).toBe(body);
    expect(formatReviewPacket(result)).toContain(body);
    expect(result.checks.map((check) => check.id)).toEqual(["voice"]);
  });

  it("accepts a nested ID with external-only materials without inventing local matches", async () => {
    await mkdir(join(packageDir, "email"));
    await writeFile(
      join(packageDir, "email", "receipt.md"),
      "---\nfor: Transactional email.\nmaterials:\n  - https://example.com/receipt\n---\n\nKeep the receipt factual.\n",
    );
    await writeFile(
      join(packageDir, "checks", "receipt.md"),
      "---\nname: Receipt\ndescription: Review the receipt.\nseverity: medium\nreferences:\n  - email/receipt\n---\n\nCheck the receipt.\n",
    );
    const result = await packet(["email/receipt"]);
    expect(result.explicitNodeIds).toEqual(["email/receipt"]);
    expect(result.materialNodes).toEqual([]);
    expect(result.explicitNodes?.[0]).toMatchObject({
      id: "email/receipt",
      materials: ["https://example.com/receipt"],
      prose: "Keep the receipt factual.",
    });
    expect(result.checks.find((check) => check.id === "receipt")).toMatchObject(
      { offered: "always", explicitVia: ["email/receipt"] },
    );
    expect(formatReviewPacket(result)).toContain("https://example.com/receipt");
  });

  it("rejects unknown explicit IDs for programmatic packet callers too", async () => {
    await expect(packet(["voice", "unknown"])).rejects.toThrow("unknown");
  });
});
