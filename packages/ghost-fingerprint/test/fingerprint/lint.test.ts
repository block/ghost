import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lintSurvey } from "@ghost/core";
import { describe, expect, it } from "vitest";
import { lintFingerprint } from "../../src/core/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "../fixtures");

const HEADER = `---
name: Claude
slug: claude
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
  borderUsage: moderate`;

function build(frontmatterExtras: string, body: string): string {
  return `${HEADER}${frontmatterExtras}\n${PALETTE_BLOCK}\n---\n\n${body}`;
}

describe("lintFingerprint", () => {
  it("reports no errors on a clean file", () => {
    const md = build(
      `\nobservation:
  personality: []
  resembles: []
decisions:
  - dimension: warm-neutrals`,
      `# Character

Warm, editorial

# Decisions

### warm-neutrals
No cool grays

**Evidence:**
- \`#141413\`
`,
    );
    const report = lintFingerprint(md);
    expect(report.errors).toBe(0);
  });

  it("accepts partial child overlays when extends is present", () => {
    const md = `---
extends: ../fingerprint.md
id: checkout
decisions:
  - dimension: density
---

# Decisions

### density
Checkout uses tighter rows than the parent.
`;
    const report = lintFingerprint(md);
    expect(report.errors).toBe(0);
    expect(report.issues.some((issue) => issue.rule === "schema-invalid")).toBe(
      false,
    );
  });

  it("keeps a surface-derived composition-patterns fixture lint-clean", () => {
    const fixtureDir = resolve(FIXTURES, "surface-fingerprint");
    const survey = JSON.parse(
      readFileSync(resolve(fixtureDir, "survey.json"), "utf-8"),
    );
    const fingerprint = readFileSync(
      resolve(fixtureDir, "fingerprint.md"),
      "utf-8",
    );

    const surveyReport = lintSurvey(survey);
    expect(surveyReport.errors).toBe(0);
    expect(survey.ui_surfaces[0].signals.layout_patterns).toContain(
      "metric strip above timeline",
    );

    const fingerprintReport = lintFingerprint(fingerprint);
    expect(fingerprintReport.errors).toBe(0);
    expect(fingerprint).toContain("### composition-patterns");
    expect(fingerprint).toContain("survey.ui_surfaces[0]");
  });

  it("flags a dimension declared in frontmatter with no matching body block", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals`,
      `# Only a stray heading`,
    );
    const report = lintFingerprint(md);
    expect(
      report.issues.some(
        (i) => i.rule === "orphan-dimension" && /warm-neutrals/.test(i.message),
      ),
    ).toBe(true);
  });

  it("does not flag body `### dimension` when frontmatter omits the entry", () => {
    const md = build(
      ``,
      `# Decisions

### stray-thought
Rationale without frontmatter decisions[] entry — body is authoritative.
`,
    );
    const report = lintFingerprint(md);
    // Schema 5: body ### headings are authoritative and can stand alone;
    // only unmatched frontmatter slugs are flagged.
    expect(report.issues.some((i) => i.rule === "orphan-dimension")).toBe(
      false,
    );
  });

  it("warns when the Decisions section has prose but no parseable H3 blocks", () => {
    const md = build(
      ``,
      `# Decisions

**Color strategy.** This looks like a decision, but it is not addressable.
`,
    );
    const report = lintFingerprint(md);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        rule: "missing-decision-headings",
      }),
    );
  });

  it("warns when a decision block has no Evidence list", () => {
    const md = build(
      ``,
      `# Decisions

### spatial-system
Spacing is compact and regular.
`,
    );
    const report = lintFingerprint(md);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        rule: "missing-evidence",
        path: "decisions[0].evidence",
      }),
    );
  });

  it("rejects prose (summary, decision, values) in the frontmatter via schema-invalid", () => {
    const md = build(
      `\nobservation:
  summary: "prose in YAML — should fail"
  personality: []
  resembles: []
values:
  do: ["stray YAML"]
  dont: []`,
      ``,
    );
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("flags body evidence that cites a hex not in palette", () => {
    const md = build(
      `\ndecisions:
  - dimension: bad-cite`,
      `# Decisions

### bad-cite
refers to a ghost color

**Evidence:**
- \`#000000\`
`,
    );
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "broken-evidence")).toBe(true);
  });

  it("flags palette colors not cited in any decision as info", () => {
    const md = build("", "");
    const report = lintFingerprint(md);
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    expect(unused.length).toBeGreaterThan(0);
    expect(unused.every((i) => i.severity === "info")).toBe(true);
  });

  it("honors --off to silence a rule", () => {
    const md = build("", "");
    const report = lintFingerprint(md, { off: ["unused-palette"] });
    expect(report.issues.some((i) => i.rule === "unused-palette")).toBe(false);
  });

  it("honors --strict to promote a rule to error", () => {
    const md = build("", "");
    const report = lintFingerprint(md, { strict: ["unused-palette"] });
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    expect(unused.length).toBeGreaterThan(0);
    expect(unused.every((i) => i.severity === "error")).toBe(true);
  });

  it("accepts shadowComplexity: deliberate-none on the surfaces block", () => {
    const md = `${HEADER}
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals:
    steps: ['#141413']
    count: 1
  semantic:
    - { role: error, value: '#b53333' }
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [4, 8], baseUnit: 8, regularity: 0.85 }
typography:
  families: ['Anthropic Serif']
  sizeRamp: [14, 16]
  weightDistribution: { 400: 1 }
  lineHeightPattern: loose
surfaces:
  borderRadii: [8]
  shadowComplexity: deliberate-none
  borderUsage: minimal
---
`;
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(false);
  });

  it("rejects root embedding in frontmatter", () => {
    const md = build("\nembedding: [0.1, 0.2]", "");
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("rejects decision embeddings in frontmatter", () => {
    const md = build(
      `\ndecisions:
  - dimension: color-strategy
    embedding: [0.1, 0.2]`,
      `# Decisions

### color-strategy
Use color sparingly.
`,
    );
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("warns on a non-canonical decision dimension with no dimension_kind", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals`,
      `# Decisions

### warm-neutrals
No cool grays.

**Evidence:**
- \`#141413\`
`,
    );
    const report = lintFingerprint(md);
    const issue = report.issues.find(
      (i) => i.rule === "non-canonical-dimension",
    );
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe("warning");
    expect(issue?.path).toBe("decisions[0].dimension");
  });

  it("does not warn when dimension is canonical", () => {
    const md = build(
      `\ndecisions:
  - dimension: color-strategy`,
      `# Decisions

### color-strategy
Hue as opt-in.

**Evidence:**
- \`#141413\`
`,
    );
    const report = lintFingerprint(md);
    expect(
      report.issues.some((i) => i.rule === "non-canonical-dimension"),
    ).toBe(false);
  });

  it("does not warn when non-canonical dimension has canonical dimension_kind", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals
    dimension_kind: color-strategy`,
      `# Decisions

### warm-neutrals
No cool grays.

**Evidence:**
- \`#141413\`
`,
    );
    const report = lintFingerprint(md);
    expect(
      report.issues.some((i) => i.rule === "non-canonical-dimension"),
    ).toBe(false);
  });

  it("warns when dimension_kind itself is not canonical", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals
    dimension_kind: also-bogus`,
      `# Decisions

### warm-neutrals
No cool grays.

**Evidence:**
- \`#141413\`
`,
    );
    const report = lintFingerprint(md);
    const issue = report.issues.find(
      (i) => i.rule === "non-canonical-dimension",
    );
    expect(issue).toBeDefined();
    expect(issue?.path).toBe("decisions[0].dimension_kind");
  });

  it("rejects checks in fingerprint frontmatter because checks.yml owns gates", () => {
    const md = build(
      `\nchecks:
  - id: no-hardcoded-colors
    canonical: color-strategy
    pattern: '#[0-9a-fA-F]{3,8}'`,
      "",
    );
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("rejects the legacy shadowComplexity: none value", () => {
    const md = `${HEADER}
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals:
    steps: ['#141413']
    count: 1
  semantic:
    - { role: error, value: '#b53333' }
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [4, 8], baseUnit: 8, regularity: 0.85 }
typography:
  families: ['Anthropic Serif']
  sizeRamp: [14, 16]
  weightDistribution: { 400: 1 }
  lineHeightPattern: loose
surfaces:
  borderRadii: [8]
  shadowComplexity: none
  borderUsage: minimal
---
`;
    const report = lintFingerprint(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
  });
});
