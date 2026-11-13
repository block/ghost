import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { runCli } from "./cli-test-utils.js";

interface ParsedSkillMarkdown {
  frontmatter: Record<string, unknown>;
  body: string;
}

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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
        "references/making.md",
        "references/materials.md",
        "references/nodes.md",
        "references/preventive-authoring.md",
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

  it("bundles preventive authoring structure and scenario markers", async () => {
    const reference = await readFile(
      resolve(
        REPO_ROOT,
        "packages/ghost/src/skill-bundle/references/preventive-authoring.md",
      ),
      "utf-8",
    );
    const fixture = await readFile(
      resolve(
        REPO_ROOT,
        "packages/ghost/test/fixtures/authoring/preventive-example.md",
      ),
      "utf-8",
    );

    for (const heading of [
      "## Preventive authoring loop",
      "## Shared knowledge versus brand decision",
      "## Additions must earn space",
      "## Important ambiguity triage",
      "## Small example pattern",
      "## Existing component and material first",
      "## Worked authoring patterns",
      "## Handoff to validation and review",
    ]) {
      expect(reference).toContain(heading);
    }

    for (const pattern of [
      "### Correct components with wrong composition",
      "### Exact tokens without emphasis rules",
      "### Voice adjectives without a usable decision",
      "### Conflicting legacy implementation",
    ]) {
      const start = reference.indexOf(pattern);
      expect(start, pattern).toBeGreaterThanOrEqual(0);
      const next = reference.indexOf("### ", start + pattern.length);
      const block = reference.slice(start, next === -1 ? undefined : next);
      for (const marker of [
        "**Warning sign:**",
        "**Inspection:**",
        "**Possible causes:**",
        "**Small repair:**",
        "**Limits:**",
      ]) {
        expect(block, `${pattern} ${marker}`).toContain(marker);
      }
    }

    for (const marker of [
      "design assessment without silent override",
      "no package addition is needed",
      "Near miss:",
      "ranks the action contrast and trust-order gaps first",
      "This example is normative",
      "incidental",
      "Use this pattern only",
      "src/components/ReceiptConfirmation.tsx",
    ]) {
      expect(fixture).toContain(marker);
    }
  });
});
