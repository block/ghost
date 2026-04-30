import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { layoutExpression } from "../../src/core/layout.js";

const here = resolve(fileURLToPath(import.meta.url), "..");

const FRONTMATTER = `---
id: test
source: llm
timestamp: 2026-04-22T00:00:00Z
palette:
  dominant: [{ role: accent, value: '#000' }]
  neutrals: { steps: ['#fff', '#000'], count: 2 }
  semantic: []
  saturationProfile: muted
  contrast: high
spacing: { scale: [4, 8], baseUnit: 4, regularity: 0.9 }
typography:
  families: ['system-ui']
  sizeRamp: [12, 16]
  weightDistribution: { '400': 1 }
  lineHeightPattern: tight
surfaces:
  borderRadii: [4]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---`;

const SAMPLE = `${FRONTMATTER}

# Character

Brief.

# Signature

- bullet a
- bullet b

# Decisions

### color-strategy

Prose.

**Evidence:**
- thing

### shape-language

More prose.

# Fragments

- [embedding](embedding.md)
`;

describe("layoutExpression", () => {
  it("maps frontmatter, body sections, and decision H3s on a typical expression", () => {
    const layout = layoutExpression(SAMPLE);

    const fm = layout.sections.find((s) => s.kind === "frontmatter");
    expect(fm).toBeDefined();
    expect(fm?.start).toBe(1);
    // Frontmatter ends at the closing `---` — line 21 in the FRONTMATTER constant.
    expect(fm?.end).toBe(21);
    expect(fm?.partitions).toEqual([
      "palette",
      "spacing",
      "typography",
      "surfaces",
    ]);

    const character = layout.sections.find(
      (s) => s.kind === "body" && s.heading === "Character",
    );
    const signature = layout.sections.find(
      (s) => s.kind === "body" && s.heading === "Signature",
    );
    const decisions = layout.sections.find(
      (s) => s.kind === "body" && s.heading === "Decisions",
    );
    const fragments = layout.sections.find(
      (s) => s.kind === "body" && s.heading === "Fragments",
    );
    expect(character?.start).toBeGreaterThan(fm?.end ?? 0);
    expect(signature?.start).toBeGreaterThan(character?.end ?? 0);
    expect(decisions?.start).toBeGreaterThan(signature?.end ?? 0);
    expect(fragments?.start).toBeGreaterThan(decisions?.end ?? 0);

    const decisionBlocks = layout.sections.filter((s) => s.kind === "decision");
    expect(decisionBlocks.map((d) => d.dimension)).toEqual([
      "color-strategy",
      "shape-language",
    ]);
    // Each decision must sit fully inside the enclosing Decisions section.
    for (const d of decisionBlocks) {
      expect(d.start).toBeGreaterThanOrEqual(decisions?.start ?? 0);
      expect(d.end).toBeLessThanOrEqual(decisions?.end ?? 0);
    }
    // The two decisions must not overlap.
    expect(decisionBlocks[0].end).toBeLessThan(decisionBlocks[1].start);
  });

  it("produces 1-indexed inclusive ranges suitable for the Read tool's offset/limit", () => {
    const layout = layoutExpression(SAMPLE);
    const lines = SAMPLE.split("\n");
    for (const s of layout.sections) {
      // start line is the heading itself for body/decision, or `---` for frontmatter
      const startLine = lines[s.start - 1];
      if (s.kind === "frontmatter") {
        expect(startLine).toMatch(/^---/);
      } else if (s.kind === "body") {
        expect(startLine).toBe(`# ${s.heading}`);
      } else {
        expect(startLine).toBe(`### ${s.dimension}`);
      }
    }
  });

  it("returns no frontmatter section when the file lacks one", () => {
    const layout = layoutExpression("# Character\n\nProse only.\n");
    expect(
      layout.sections.find((s) => s.kind === "frontmatter"),
    ).toBeUndefined();
    expect(
      layout.sections.find(
        (s) => s.kind === "body" && s.heading === "Character",
      ),
    ).toBeDefined();
  });

  it("returns no frontmatter section when the YAML block is unterminated", () => {
    const layout = layoutExpression(
      `---\nid: x\npalette: foo\n# stray heading\n`,
    );
    // No closing `---` → describe must not invent one. The H1 still surfaces.
    expect(
      layout.sections.find((s) => s.kind === "frontmatter"),
    ).toBeUndefined();
  });

  it("falls back to a regex key scan when the YAML cannot be parsed", () => {
    const broken = `---
id: test
palette: [unterminated
spacing: { scale: [1] }
---

# Character

x
`;
    const layout = layoutExpression(broken);
    const fm = layout.sections.find((s) => s.kind === "frontmatter");
    expect(fm?.partitions).toContain("palette");
    expect(fm?.partitions).toContain("spacing");
  });

  it("emits zero decision sections when # Decisions has no H3s", () => {
    const md = `${FRONTMATTER}\n\n# Character\n\nx\n\n# Decisions\n\nNo subheadings yet.\n`;
    const layout = layoutExpression(md);
    expect(layout.sections.filter((s) => s.kind === "decision")).toHaveLength(
      0,
    );
    expect(
      layout.sections.find(
        (s) => s.kind === "body" && s.heading === "Decisions",
      ),
    ).toBeDefined();
  });

  it("matches structural expectations against the real ghost-ui expression", async () => {
    const path = resolve(here, "../../../ghost-ui/expression.md");
    const raw = await readFile(path, "utf-8");
    const layout = layoutExpression(raw);

    const fm = layout.sections.find((s) => s.kind === "frontmatter");
    expect(fm?.start).toBe(1);
    expect(fm?.partitions).toEqual(
      expect.arrayContaining(["palette", "spacing", "typography", "surfaces"]),
    );

    const headings = layout.sections
      .filter((s) => s.kind === "body")
      .map((s) => s.heading);
    expect(headings).toEqual(
      expect.arrayContaining([
        "Character",
        "Signature",
        "Decisions",
        "Fragments",
      ]),
    );

    const dims = layout.sections
      .filter((s) => s.kind === "decision")
      .map((s) => s.dimension);
    // Every decision dimension must round-trip through the slug normalizer.
    expect(dims.length).toBeGreaterThan(0);
    for (const d of dims) {
      expect(d).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});
