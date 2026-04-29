import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadExpression } from "../../src/core/index.js";

const HEX_ONLY_EXPRESSION = `---
id: hex-only
source: llm
timestamp: 2026-04-29T00:00:00Z
observation:
  personality: [restrained]
palette:
  dominant:
    - { role: ink, value: "#1a1a1a" }
  neutrals: { steps: ["#ffffff", "#1a1a1a"], count: 2 }
  semantic:
    - { role: danger, value: "#f94b4b" }
  saturationProfile: muted
  contrast: high
spacing: { scale: [4, 8, 16], baseUnit: 4, regularity: 1 }
typography:
  families: ["Inter"]
  sizeRamp: [12, 16, 24]
  weightDistribution: { 400: 1 }
  lineHeightPattern: normal
surfaces:
  borderRadii: [4, 8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---

# Character

Test.

# Signature

- Test.

# Decisions
`;

describe("loadExpression — backfills palette oklch", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-load-oklch-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("populates oklch on dominant colors when missing from frontmatter", async () => {
    const path = join(dir, "expression.md");
    await writeFile(path, HEX_ONLY_EXPRESSION);

    const { expression } = await loadExpression(path, {
      noEmbeddingBackfill: true,
    });

    const dominant = expression.palette.dominant[0];
    expect(dominant.value).toBe("#1a1a1a");
    expect(dominant.oklch).toBeDefined();
    expect(dominant.oklch?.length).toBe(3);
  });

  it("populates oklch on semantic colors when missing", async () => {
    const path = join(dir, "expression.md");
    await writeFile(path, HEX_ONLY_EXPRESSION);

    const { expression } = await loadExpression(path, {
      noEmbeddingBackfill: true,
    });

    const danger = expression.palette.semantic.find((c) => c.role === "danger");
    expect(danger?.value).toBe("#f94b4b");
    expect(danger?.oklch).toBeDefined();
    expect(danger?.oklch?.length).toBe(3);
  });

  it("is deterministic — two loads of the same file produce identical oklch", async () => {
    const path = join(dir, "expression.md");
    await writeFile(path, HEX_ONLY_EXPRESSION);

    const a = await loadExpression(path, { noEmbeddingBackfill: true });
    const b = await loadExpression(path, { noEmbeddingBackfill: true });

    expect(a.expression.palette.dominant[0].oklch).toEqual(
      b.expression.palette.dominant[0].oklch,
    );
  });

  it("preserves existing oklch when present (does not recompute)", async () => {
    const withExisting = HEX_ONLY_EXPRESSION.replace(
      `- { role: ink, value: "#1a1a1a" }`,
      `- { role: ink, value: "#1a1a1a", oklch: [0.5, 0.1, 200] }`,
    );
    const path = join(dir, "expression.md");
    await writeFile(path, withExisting);

    const { expression } = await loadExpression(path, {
      noEmbeddingBackfill: true,
    });

    // The frontmatter-supplied oklch wins, even if it's not the "correct"
    // value for the hex. This is the expected contract: backfill only
    // when missing.
    expect(expression.palette.dominant[0].oklch).toEqual([0.5, 0.1, 200]);
  });
});
