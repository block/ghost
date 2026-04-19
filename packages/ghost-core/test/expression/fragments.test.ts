import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadExpression } from "../../src/expression/index.js";

const BASE_EXPRESSION = `---
schema: 2
id: base
source: llm
timestamp: 2026-04-17T00:00:00.000Z
palette:
  dominant: []
  neutrals: { steps: [], count: 0 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [8], baseUnit: 8, regularity: 1 }
typography:
  families: ['Serif']
  sizeRamp: [16]
  weightDistribution: { 400: 1 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [8]
  shadowComplexity: none
  borderUsage: minimal
embedding: [0]
decisions:
  - dimension: inline-rule
    decision: "from the main file"
    evidence: []
---
`;

describe("decision fragments", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-frags-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("assembles decisions/*.md into the fingerprint", async () => {
    const expressionPath = join(dir, "expression.md");
    await writeFile(expressionPath, BASE_EXPRESSION, "utf-8");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(
      join(dir, "decisions", "warm-neutrals.md"),
      `---
dimension: warm-neutrals
evidence: ['#111', '#222']
---

No cool grays anywhere.
`,
      "utf-8",
    );
    await writeFile(
      join(dir, "decisions", "from-filename.md"),
      `Plain body — dimension comes from the filename.
`,
      "utf-8",
    );

    const { fingerprint } = await loadExpression(expressionPath);
    const dims = fingerprint.decisions?.map((d) => d.dimension) ?? [];
    expect(dims).toContain("inline-rule");
    expect(dims).toContain("warm-neutrals");
    expect(dims).toContain("from-filename");
    const warm = fingerprint.decisions?.find(
      (d) => d.dimension === "warm-neutrals",
    );
    expect(warm?.evidence).toEqual(["#111", "#222"]);
    expect(warm?.decision).toBe("No cool grays anywhere.");
  });

  it("fragment overrides inline decision with same dimension", async () => {
    const expressionPath = join(dir, "expression.md");
    await writeFile(expressionPath, BASE_EXPRESSION, "utf-8");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(
      join(dir, "decisions", "inline-rule.md"),
      `---
dimension: inline-rule
---

Overridden by fragment.
`,
      "utf-8",
    );

    const { fingerprint } = await loadExpression(expressionPath);
    const rule = fingerprint.decisions?.find(
      (d) => d.dimension === "inline-rule",
    );
    expect(rule?.decision).toBe("Overridden by fragment.");
  });

  it("noFragments: true skips the decisions/ directory", async () => {
    const expressionPath = join(dir, "expression.md");
    await writeFile(expressionPath, BASE_EXPRESSION, "utf-8");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(
      join(dir, "decisions", "extra.md"),
      `---\ndimension: extra\n---\n\nShould be skipped.\n`,
      "utf-8",
    );

    const { fingerprint } = await loadExpression(expressionPath, {
      noFragments: true,
    });
    const dims = fingerprint.decisions?.map((d) => d.dimension) ?? [];
    expect(dims).not.toContain("extra");
  });

  it("ignores absent decisions/ directory silently", async () => {
    const expressionPath = join(dir, "expression.md");
    await writeFile(expressionPath, BASE_EXPRESSION, "utf-8");
    const { fingerprint } = await loadExpression(expressionPath);
    expect(fingerprint.decisions).toHaveLength(1);
  });
});
