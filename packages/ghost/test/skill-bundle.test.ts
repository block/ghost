import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { runCli } from "./cli-test-utils.js";

interface ParsedSkillMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

const OLD_MALFORMED_SKILL_HEADER = `---
name: ghost
description: Author, validate, consume, and review against a repo-local ghost package: the medium-agnostic articulation of a product's brand. Use when the user wants to set up a .ghost package, write or update guidance nodes, gather brand context before generation, or assemble a review packet from ghost checks.
license: Apache-2.0
metadata:
  homepage: https://github.com/block/ghost
  cli: ghost
---

# ghost: Brand Guidance Packages
`;

function parseSkillMarkdown(raw: string): ParsedSkillMarkdown {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) throw new Error("SKILL.md is missing YAML frontmatter");
  const frontmatter = parseYaml(match[1] ?? "");
  if (
    !frontmatter ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  ) {
    throw new Error("SKILL.md frontmatter must be a YAML mapping");
  }
  return {
    frontmatter: frontmatter as Record<string, unknown>,
    body: match[2] ?? "",
  };
}

describe("ghost skill bundle frontmatter", () => {
  it("documents the old malformed description as a YAML parse failure", () => {
    expect(() => parseSkillMarkdown(OLD_MALFORMED_SKILL_HEADER)).toThrow(
      /Nested mappings are not allowed in compact mappings/,
    );
  });

  it("installs a SKILL.md whose frontmatter is valid YAML metadata", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ghost-skill-bundle-"));
    try {
      const install = await runCli(
        ["skill", "install", "--dest", "skills/ghost"],
        dir,
      );
      expect(install.code).toBe(0);

      const raw = await readFile(
        join(dir, "skills", "ghost", "SKILL.md"),
        "utf-8",
      );
      const parsed = parseSkillMarkdown(raw);

      expect(parsed.frontmatter).toMatchObject({
        name: "ghost",
        description:
          "Author, validate, consume, and review against a repo-local package of brand guidance. Use when the user wants to set up a .ghost package, write or update guidance nodes, gather brand context before generation, or assemble a review packet from ghost checks.",
        license: "Apache-2.0",
        metadata: {
          homepage: "https://github.com/block/ghost",
          cli: "ghost",
        },
      });
      expect(typeof parsed.frontmatter.description).toBe("string");
      expect(parsed.body).toContain("# ghost: Brand Guidance Packages");
      expect(parsed.body).toContain("When the package is silent");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps frontmatter valid for every bundled markdown file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ghost-skill-bundle-all-"));
    try {
      const install = await runCli(
        ["skill", "install", "--dest", "skills/ghost"],
        dir,
      );
      expect(install.code).toBe(0);

      const skillRoot = join(dir, "skills", "ghost");
      const files = [
        "SKILL.md",
        "references/authoring.md",
        "references/ground.md",
        "references/intake.md",
        "references/making.md",
        "references/materials.md",
        "references/nodes.md",
        "references/schema.md",
        "references/steering-audit.md",
      ];

      for (const file of files) {
        const raw = await readFile(join(skillRoot, file), "utf-8");
        if (!raw.startsWith("---\n")) continue;
        expect(() => parseSkillMarkdown(raw), file).not.toThrow();
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("delivers machine-led intake guidance with the handoff structure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ghost-skill-bundle-intake-"));
    try {
      const install = await runCli(
        ["skill", "install", "--dest", "skills/ghost"],
        dir,
      );
      expect(install.code).toBe(0);

      const raw = await readFile(
        join(dir, "skills", "ghost", "references", "intake.md"),
        "utf-8",
      );
      const parsed = parseSkillMarkdown(raw);
      expect(parsed.frontmatter).toMatchObject({
        name: "intake",
      });
      for (const heading of [
        "## Intended use",
        "## Accessible evidence",
        "## Facts checked by the agent",
        "## Machine inferences",
        "## Proposed brand decisions for approval",
        "## Approved brand decisions",
        "## Excluded or weak evidence",
        "## Open questions",
        "## Scope limits",
      ]) {
        expect(parsed.body).toContain(heading);
      }
      expect(parsed.body).toContain(".ghost-workbench/intake.md");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("uses the loose-material fixture as a qualitative intake scenario", async () => {
    const fixture = await readFile(
      resolve(
        import.meta.dirname,
        "fixtures",
        "authoring",
        "intake-loose-material.md",
      ),
      "utf-8",
    );

    for (const heading of [
      "### Facts checked by the agent",
      "### Machine inferences",
      "### Proposed brand decisions for approval",
      "### Open questions",
    ]) {
      expect(fixture).toContain(heading);
    }
    expect(fixture).toContain("None. Explicit approval required");
    expect(fixture).toContain("not a semantic guarantee");
  });
});
