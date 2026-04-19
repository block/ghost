import { describe, expect, it } from "vitest";
import { lintExpression } from "../../src/expression/index.js";

const HEADER = `---
name: Claude
slug: claude
schema: 2
id: claude
source: llm
timestamp: 2026-04-17T00:00:00.000Z`;

const PALETTE_BLOCK = `
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals:
    steps: ['#141413', '#4d4c48']
    count: 2
  semantic:
    - { role: error, value: '#b53333' }
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [4, 8], baseUnit: 8, regularity: 0.85 }
typography:
  families: ['Anthropic Serif']
  sizeRamp: [14, 16]
  weightDistribution: { 400: 0.6, 500: 0.4 }
  lineHeightPattern: loose
surfaces:
  borderRadii: [8]
  shadowComplexity: subtle
  borderUsage: moderate
embedding: [0.1, 0.2]`;

function build(frontmatterExtras: string, body: string): string {
  return `${HEADER}${frontmatterExtras}\n${PALETTE_BLOCK}\n---\n\n${body}`;
}

describe("lintExpression", () => {
  it("reports no issues on a clean file", () => {
    const md = build(
      `\nobservation:
  summary: "Warm, editorial"
  personality: []
  distinctiveTraits: ["warm-only neutrals"]
  closestSystems: []
decisions:
  - dimension: warm-neutrals
    decision: "No cool grays"
    evidence: ["#141413"]`,
      `# Character

Warm, editorial

# Signature

- warm-only neutrals

# Decisions

### warm-neutrals
No cool grays
**Evidence:** #141413
`,
    );
    const report = lintExpression(md);
    expect(report.errors).toBe(0);
    // body-sync, schema, evidence should all be clean
    expect(report.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("flags stale schema version", () => {
    const md = build("", "").replace("schema: 2", "schema: 1");
    const report = lintExpression(md);
    expect(
      report.issues.some((i) => i.rule === "schema-version-mismatch"),
    ).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("flags missing body mirror when frontmatter has narrative", () => {
    const md = build(
      `\nobservation:
  summary: "Warm, editorial"
  personality: []
  distinctiveTraits: ["warm-only neutrals"]
  closestSystems: []`,
      `# Only a stray heading`,
    );
    const report = lintExpression(md);
    expect(
      report.issues.some(
        (i) => i.rule === "body-sync" && i.path === "observation.summary",
      ),
    ).toBe(true);
  });

  it("flags evidence that cites a hex not in palette", () => {
    const md = build(
      `\ndecisions:
  - dimension: bad-cite
    decision: "refers to a ghost color"
    evidence: ["#000000"]`,
      `# Decisions

### bad-cite
refers to a ghost color
**Evidence:** #000000
`,
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "broken-evidence")).toBe(true);
  });

  it("flags palette colors not cited in any decision as info", () => {
    const md = build("", "");
    const report = lintExpression(md);
    // With no decisions at all, every palette color is unused
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    expect(unused.length).toBeGreaterThan(0);
    expect(unused.every((i) => i.severity === "info")).toBe(true);
  });

  it("honors --off to silence a rule", () => {
    const md = build("", "");
    const report = lintExpression(md, { off: ["unused-palette"] });
    expect(report.issues.some((i) => i.rule === "unused-palette")).toBe(false);
  });

  it("honors --strict to promote a rule to error", () => {
    const md = build("", "");
    const report = lintExpression(md, { strict: ["unused-palette"] });
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    expect(unused.length).toBeGreaterThan(0);
    expect(unused.every((i) => i.severity === "error")).toBe(true);
  });
});
