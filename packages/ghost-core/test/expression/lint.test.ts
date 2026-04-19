import { describe, expect, it } from "vitest";
import { lintExpression } from "../../src/expression/index.js";

const HEADER = `---
name: Claude
slug: claude
schema: 4
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
  it("reports no errors on a clean file", () => {
    const md = build(
      `\nobservation:
  personality: []
  closestSystems: []
decisions:
  - dimension: warm-neutrals
    evidence: ["#141413"]`,
      `# Character

Warm, editorial

# Signature

- warm-only neutrals

# Decisions

### warm-neutrals
No cool grays
`,
    );
    const report = lintExpression(md);
    expect(report.errors).toBe(0);
  });

  it("flags stale schema version", () => {
    const md = build("", "").replace("schema: 4", "schema: 3");
    const report = lintExpression(md);
    expect(
      report.issues.some((i) => i.rule === "schema-version-mismatch"),
    ).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("flags missing rationale when a frontmatter decision has no body block", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals
    evidence: ["#141413"]`,
      `# Only a stray heading`,
    );
    const report = lintExpression(md);
    expect(
      report.issues.some(
        (i) =>
          i.rule === "missing-rationale" && /warm-neutrals/.test(i.message),
      ),
    ).toBe(true);
  });

  it("flags orphan prose when the body has a ### with no frontmatter entry", () => {
    const md = build(
      ``,
      `# Decisions

### stray-thought
Rationale with no frontmatter entry.
`,
    );
    const report = lintExpression(md);
    expect(
      report.issues.some(
        (i) => i.rule === "orphan-prose" && /stray-thought/.test(i.message),
      ),
    ).toBe(true);
  });

  it("flags legacy **Evidence:** bullets in the body", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals
    evidence: ["#141413"]`,
      `# Decisions

### warm-neutrals
No cool grays

**Evidence:** #141413
`,
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "stray-evidence-in-body")).toBe(
      true,
    );
  });

  it("rejects prose (summary, decision, values) in the frontmatter via schema-invalid", () => {
    const md = build(
      `\nobservation:
  summary: "prose in YAML — should fail"
  personality: []
  closestSystems: []
values:
  do: ["stray YAML"]
  dont: []`,
      ``,
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("flags evidence that cites a hex not in palette", () => {
    const md = build(
      `\ndecisions:
  - dimension: bad-cite
    evidence: ["#000000"]`,
      `# Decisions

### bad-cite
refers to a ghost color
`,
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "broken-evidence")).toBe(true);
  });

  it("flags palette colors not cited in any decision as info", () => {
    const md = build("", "");
    const report = lintExpression(md);
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
