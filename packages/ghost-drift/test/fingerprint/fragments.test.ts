import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EMBEDDING_FRAGMENT_FILENAME,
  findFragmentLinks,
  loadFingerprint,
  serializeEmbeddingFragment,
  serializeFingerprint,
} from "../../src/core/fingerprint/index.js";
import type { Fingerprint } from "../../src/core/types.js";

const BASE_EXPRESSION = `---
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

  it("assembles decisions/*.md into the fingerprint", async () => {
    const fingerprintPath = join(dir, "fingerprint.md");
    await writeFile(fingerprintPath, BASE_EXPRESSION, "utf-8");
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

    const { fingerprint } = await loadFingerprint(fingerprintPath);
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
    const fingerprintPath = join(dir, "fingerprint.md");
    await writeFile(fingerprintPath, BASE_EXPRESSION, "utf-8");
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

    const { fingerprint } = await loadFingerprint(fingerprintPath);
    const rule = fingerprint.decisions?.find(
      (d) => d.dimension === "inline-rule",
    );
    expect(rule?.decision).toBe("Overridden by fragment.");
  });

  it("noFragments: true skips the decisions/ directory", async () => {
    const fingerprintPath = join(dir, "fingerprint.md");
    await writeFile(fingerprintPath, BASE_EXPRESSION, "utf-8");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(
      join(dir, "decisions", "extra.md"),
      `---\ndimension: extra\n---\n\nShould be skipped.\n`,
      "utf-8",
    );

    const { fingerprint } = await loadFingerprint(fingerprintPath, {
      noFragments: true,
    });
    const dims = fingerprint.decisions?.map((d) => d.dimension) ?? [];
    expect(dims).not.toContain("extra");
  });

  it("ignores absent decisions/ directory silently", async () => {
    const fingerprintPath = join(dir, "fingerprint.md");
    await writeFile(fingerprintPath, BASE_EXPRESSION, "utf-8");
    const { fingerprint } = await loadFingerprint(fingerprintPath);
    expect(fingerprint.decisions).toHaveLength(1);
  });
});

const V4_FINGERPRINT: Fingerprint = {
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
    const fingerprintPath = join(dir, "fingerprint.md");
    const md = serializeFingerprint(V4_FINGERPRINT);
    await writeFile(fingerprintPath, md, "utf-8");

    const vector = [0.9, 0.8, 0.7, 0.6, 0.5];
    const fragPath = join(dir, EMBEDDING_FRAGMENT_FILENAME);
    await writeFile(
      fragPath,
      serializeEmbeddingFragment(vector, V4_FINGERPRINT.id),
      "utf-8",
    );

    const { fingerprint } = await loadFingerprint(fingerprintPath);
    // The sibling vector wins over the recomputed one
    expect(fingerprint.embedding).toEqual(vector);
  });

  it("loader recomputes the embedding when no sibling file exists", async () => {
    const fingerprintPath = join(dir, "fingerprint.md");
    const md = serializeFingerprint(V4_FINGERPRINT);
    await writeFile(fingerprintPath, md, "utf-8");

    const { fingerprint } = await loadFingerprint(fingerprintPath);
    // No sibling; loader falls back to computeEmbedding — which produces a
    // 49-dim vector. Length tells us the recompute path fired.
    expect(fingerprint.embedding).toHaveLength(49);
  });

  it("noEmbeddingBackfill skips both fragment read and recompute", async () => {
    const fingerprintPath = join(dir, "fingerprint.md");
    const md = serializeFingerprint(V4_FINGERPRINT);
    await writeFile(fingerprintPath, md, "utf-8");

    const { fingerprint } = await loadFingerprint(fingerprintPath, {
      noEmbeddingBackfill: true,
    });
    // Frontmatter had no embedding and backfill is off — stays empty.
    expect(fingerprint.embedding ?? []).toHaveLength(0);
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
    const raw = serializeEmbeddingFragment([0.1, 0.2, 0.3], "sys");
    expect(raw).toMatch(/^---\n/);
    expect(raw).toMatch(/\n---\n$/);
    expect(raw).toContain("kind: embedding");
    expect(raw).toContain("of: sys");
    expect(raw).toContain("dimensions: 3");
    expect(raw).toContain("vector:");
  });
});
