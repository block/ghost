import { describe, expect, it } from "vitest";
import { lintFingerprint } from "../../src/fingerprint/index.js";

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
  borderUsage: moderate
embedding: [0.1, 0.2]`;

function build(frontmatterExtras: string, body: string): string {
  return `${HEADER}${frontmatterExtras}\n${PALETTE_BLOCK}\n---\n\n${body}`;
}

describe("lintFingerprint", () => {
  it("reports no errors on a clean file", () => {
    const md = build(
      `\nobservation:
  personality: []
  closestSystems: []
decisions:
  - dimension: warm-neutrals`,
      `# Character

Warm, editorial

# Signature

- warm-only neutrals

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
});
