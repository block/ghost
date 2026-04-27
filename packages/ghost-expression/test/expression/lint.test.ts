import { describe, expect, it } from "vitest";
import { lintExpression } from "../../src/core/index.js";

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

describe("lintExpression", () => {
  it("reports no errors on a clean file", () => {
    const md = build(
      `\nobservation:
  personality: []
  resembles: []
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
    const report = lintExpression(md);
    expect(report.errors).toBe(0);
  });

  it("flags a dimension declared in frontmatter with no matching body block", () => {
    const md = build(
      `\ndecisions:
  - dimension: warm-neutrals`,
      `# Only a stray heading`,
    );
    const report = lintExpression(md);
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
    const report = lintExpression(md);
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
  resembles: []
values:
  do: ["stray YAML"]
  dont: []`,
      ``,
    );
    const report = lintExpression(md);
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

  it("accepts a role palette reference that resolves", () => {
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { background: '{palette.dominant.accent}' }
    evidence: ["src/ui/button.tsx:12"]`,
      "",
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "broken-role-reference")).toBe(
      false,
    );
  });

  it("flags a role reference that points at a missing palette role", () => {
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { background: '{palette.dominant.ghost}' }
    evidence: ["src/ui/button.tsx:12"]`,
      "",
    );
    const report = lintExpression(md);
    const broken = report.issues.filter(
      (i) => i.rule === "broken-role-reference",
    );
    expect(broken.length).toBe(1);
    expect(broken[0].severity).toBe("error");
    expect(broken[0].path).toBe("roles[0].tokens.palette.background");
  });

  it("flags a role reference into an unsupported namespace", () => {
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { foreground: '{typography.families.primary}' }
    evidence: ["src/ui/button.tsx:12"]`,
      "",
    );
    const report = lintExpression(md);
    const broken = report.issues.find(
      (i) => i.rule === "broken-role-reference",
    );
    expect(broken).toBeDefined();
    expect(broken?.message).toMatch(/palette\.dominant.*palette\.semantic/);
  });

  it("leaves raw hex values in role palette alone", () => {
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { background: '#c96442' }
    evidence: ["src/ui/button.tsx:12"]`,
      "",
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "broken-role-reference")).toBe(
      false,
    );
  });

  it("propagates slug-binding citations through `{palette.dominant.X}` references", () => {
    // The role binds `background` to `{palette.dominant.accent}` — the
    // accent's hex (#c96442) must be treated as cited even though it
    // never appears as a literal in any body Evidence bullet.
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette:
        background: '{palette.dominant.accent}'
    evidence:
      - "components/button.tsx using #4d4c48 for hover and #b53333 for danger and #141413 muted"`,
      "",
    );
    const report = lintExpression(md);
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    // #c96442 is cited only via the slug binding — must NOT be flagged.
    expect(unused.some((i) => i.message.includes("#c96442"))).toBe(false);
    // The other three are name-dropped in role evidence, so the file
    // should be fully clean.
    expect(unused.length).toBe(0);
  });

  it("counts a hex used in a role's evidence string as cited (no unused-palette info)", () => {
    // The PALETTE_BLOCK ships #c96442, #141413, #4d4c48, #b53333.
    // A role binding that cites every hex (some in palette field, some
    // inline in evidence) should silence unused-palette entirely.
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { background: '#c96442', foreground: '#141413' }
    evidence:
      - "components/button.tsx using #4d4c48 for hover and #b53333 for danger"`,
      "",
    );
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "unused-palette")).toBe(false);
  });

  it("still flags palette colors absent from both decisions and roles", () => {
    // Add a role that cites only one of the four palette hexes; the
    // other three should still fire unused-palette as info.
    const md = build(
      `
roles:
  - name: button
    tokens:
      palette: { background: '#c96442' }
    evidence: ["src/ui/button.tsx:12"]`,
      "",
    );
    const report = lintExpression(md);
    const unused = report.issues.filter((i) => i.rule === "unused-palette");
    expect(unused.length).toBeGreaterThan(0);
    // #c96442 is now cited via the role binding — must NOT appear in
    // the unused list.
    expect(unused.some((i) => i.message.includes("#c96442"))).toBe(false);
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
embedding: [0]
---
`;
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(false);
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
embedding: [0]
---
`;
    const report = lintExpression(md);
    expect(report.issues.some((i) => i.rule === "schema-invalid")).toBe(true);
  });
});
