import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EMBEDDING_FRAGMENT_FILENAME,
  EXPRESSION_SCHEMA_VERSION,
  findFragmentLinks,
  loadExpression,
  serializeEmbeddingFragment,
  serializeExpression,
} from "../../src/expression/index.js";
import type { Expression } from "../../src/types.js";

const BASE_EXPRESSION = `---
schema: 5
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
---

# Decisions

### inline-rule
from the main file
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

  it("assembles decisions/*.md into the expression", async () => {
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

    const { expression } = await loadExpression(expressionPath);
    const dims = expression.decisions?.map((d) => d.dimension) ?? [];
    expect(dims).toContain("inline-rule");
    expect(dims).toContain("warm-neutrals");
    expect(dims).toContain("from-filename");
    const warm = expression.decisions?.find(
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

    const { expression } = await loadExpression(expressionPath);
    const rule = expression.decisions?.find(
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

    const { expression } = await loadExpression(expressionPath, {
      noFragments: true,
    });
    const dims = expression.decisions?.map((d) => d.dimension) ?? [];
    expect(dims).not.toContain("extra");
  });

  it("ignores absent decisions/ directory silently", async () => {
    const expressionPath = join(dir, "expression.md");
    await writeFile(expressionPath, BASE_EXPRESSION, "utf-8");
    const { expression } = await loadExpression(expressionPath);
    expect(expression.decisions).toHaveLength(1);
  });
});

const V4_FINGERPRINT: Expression = {
  id: "v4-sample",
  source: "llm",
  timestamp: "2026-04-19T00:00:00.000Z",
  palette: {
    dominant: [{ role: "accent", value: "#c96442" }],
    neutrals: { steps: ["#111", "#222"], count: 2 },
    semantic: [],
    saturationProfile: "muted",
    contrast: "moderate",
  },
  spacing: { scale: [4, 8], baseUnit: 8, regularity: 1 },
  typography: {
    families: ["Serif"],
    sizeRamp: [14, 16],
    weightDistribution: { 400: 1 },
    lineHeightPattern: "normal",
  },
  surfaces: {
    borderRadii: [8],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },
  embedding: Array.from({ length: 8 }, (_, i) => i / 10),
};

describe("embedding fragment", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-emb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("loader reads the vector from a sibling embedding.md when frontmatter omits it", async () => {
    const expressionPath = join(dir, "expression.md");
    const md = serializeExpression(V4_FINGERPRINT);
    await writeFile(expressionPath, md, "utf-8");

    const vector = [0.9, 0.8, 0.7, 0.6, 0.5];
    const fragPath = join(dir, EMBEDDING_FRAGMENT_FILENAME);
    await writeFile(
      fragPath,
      serializeEmbeddingFragment(
        vector,
        V4_FINGERPRINT.id,
        EXPRESSION_SCHEMA_VERSION,
      ),
      "utf-8",
    );

    const { expression } = await loadExpression(expressionPath);
    // The sibling vector wins over the recomputed one
    expect(expression.embedding).toEqual(vector);
  });

  it("loader recomputes the embedding when no sibling file exists", async () => {
    const expressionPath = join(dir, "expression.md");
    const md = serializeExpression(V4_FINGERPRINT);
    await writeFile(expressionPath, md, "utf-8");

    const { expression } = await loadExpression(expressionPath);
    // No sibling; loader falls back to computeEmbedding — which produces a
    // 49-dim vector. Length tells us the recompute path fired.
    expect(expression.embedding).toHaveLength(49);
  });

  it("noEmbeddingBackfill skips both fragment read and recompute", async () => {
    const expressionPath = join(dir, "expression.md");
    const md = serializeExpression(V4_FINGERPRINT);
    await writeFile(expressionPath, md, "utf-8");

    const { expression } = await loadExpression(expressionPath, {
      noEmbeddingBackfill: true,
    });
    // Frontmatter had no embedding and backfill is off — stays empty.
    expect(expression.embedding ?? []).toHaveLength(0);
  });
});

describe("fragment body-link discovery", () => {
  it("finds markdown links targeting .md files", () => {
    const body = `
# Fragments

- [embedding](embedding.md)
- [palette details](fragments/palette.md)
- [external](https://example.com/skip.md)
- [anchor](#skip)
- [image](logo.png)
`;
    const links = findFragmentLinks(body);
    expect(links).toEqual(["embedding.md", "fragments/palette.md"]);
  });
});

describe("serializeEmbeddingFragment", () => {
  it("produces a frontmatter-only file with vector and provenance", () => {
    const raw = serializeEmbeddingFragment([0.1, 0.2, 0.3], "sys", 5);
    expect(raw).toMatch(/^---\n/);
    expect(raw).toMatch(/\n---\n$/);
    expect(raw).toContain("schema: 5");
    expect(raw).toContain("kind: embedding");
    expect(raw).toContain("of: sys");
    expect(raw).toContain("dimensions: 3");
    expect(raw).toContain("vector:");
  });
});
