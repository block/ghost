import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { runCli } from "./cli-test-utils.js";

it("delivers writing restrictions and their scope through the installed skill", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ghost-vocabulary-"));
  try {
    const result = await runCli(
      ["skill", "install", "--dest", "skills/ghost"],
      dir,
    );
    expect(result.code).toBe(0);
    const root = join(dir, "skills/ghost");
    const vocabulary = await readFile(
      join(root, "references/vocabulary.md"),
      "utf8",
    );
    // This checks instruction delivery, not a model's language compliance.
    for (const word of [
      "ratify",
      "ratification",
      "provenance",
      "attribution",
      "furniture",
      "corpus",
      "taxonomy",
      "standing",
      "altitude",
      "temperature",
      "laundering",
      "ladder",
      "rung",
      "front door",
      "junk drawer",
      "brand soul",
      "worldview",
    ]) {
      expect(vocabulary).toContain(`\`${word}\``);
    }
    expect(vocabulary).toMatch(/literal\s+technical uses/);
    expect(vocabulary).toContain("as metaphors");
    expect(vocabulary).toContain("parents, children, or nested guidance");
    expect(vocabulary).toContain(
      "page, screen, document, presentation, file, or output",
    );
    expect(vocabulary).toContain("## Name the observable choice");
    for (const [word, replacement] of [
      ["signal", "the exact cue: color, copy, position"],
      ["restraint", "the concrete limit: count, spacing"],
      ["personality", "the observable behavior: tone, pace"],
      ["thing", "the actual page, screen, document"],
      ["carry the field", "the background, spacing, hierarchy"],
      ["let the signal land", "the background, spacing, hierarchy"],
    ]) {
      expect(vocabulary).toContain(`\`${word}\``);
      expect(vocabulary).toContain(replacement);
    }
    const nodes = (
      await readFile(join(root, "references/nodes.md"), "utf8")
    ).replace(/\s+/g, " ");
    expect(nodes).toContain("## Edit sentence by sentence");
    expect(nodes).toContain("keep one idea per sentence");
    expect(nodes).toContain(
      "If removing it preserves the decision and reason, remove it",
    );
    expect(nodes).toContain(
      "Cut introductions and summaries that add no instruction",
    );
    expect(nodes).toContain("Every prohibition needs a preferred alternative");
    for (const file of [
      "SKILL.md",
      "references/authoring.md",
      "references/nodes.md",
    ]) {
      expect(await readFile(join(root, file), "utf8")).toContain(
        "vocabulary.md",
      );
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
