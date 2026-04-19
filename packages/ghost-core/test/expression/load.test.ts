import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadExpression,
  parseExpression,
  serializeExpression,
} from "../../src/expression/index.js";
import type { DesignFingerprint } from "../../src/types.js";

const SAMPLE_FINGERPRINT: DesignFingerprint = {
  id: "claude",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  palette: {
    dominant: [{ role: "accent", value: "#c96442" }],
    neutrals: { steps: ["#141413", "#4d4c48", "#87867f"], count: 3 },
    semantic: [{ role: "error", value: "#b53333" }],
    saturationProfile: "muted",
    contrast: "moderate",
  },
  spacing: { scale: [4, 8, 12, 16, 24], baseUnit: 8, regularity: 0.85 },
  typography: {
    families: ["Anthropic Serif", "Anthropic Sans"],
    sizeRamp: [14, 16, 20, 32, 64],
    weightDistribution: { 400: 0.6, 500: 0.4 },
    lineHeightPattern: "loose",
  },
  surfaces: {
    borderRadii: [8, 12, 16],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },
  embedding: Array.from({ length: 8 }, (_, i) => i / 10),
};

const SAMPLE_MD = `---
name: Claude
slug: claude
schema: 2
generator: ghost@0.8.0
confidence: 0.87
id: claude
source: llm
timestamp: 2026-04-17T00:00:00.000Z
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals:
    steps: ['#141413', '#4d4c48', '#87867f']
    count: 3
  semantic:
    - { role: error, value: '#b53333' }
  saturationProfile: muted
  contrast: moderate
spacing:
  scale: [4, 8, 12, 16, 24]
  baseUnit: 8
  regularity: 0.85
typography:
  families: ['Anthropic Serif', 'Anthropic Sans']
  sizeRamp: [14, 16, 20, 32, 64]
  weightDistribution: { 400: 0.6, 500: 0.4 }
  lineHeightPattern: loose
surfaces:
  borderRadii: [8, 12, 16]
  shadowComplexity: subtle
  borderUsage: moderate
embedding: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]
---

# Character

A literary salon reimagined as a product page — warm, unhurried, and quietly intellectual.

# Signature

- Warm ring-shadows instead of drop-shadows
- Editorial serif/sans split
- Light/dark section alternation

# Decisions

### Warm-only neutrals
Every gray has a yellow-brown undertone. No cool blue-grays.
**Evidence:** #5e5d59, #87867f, #4d4c48

### Serif authority sans utility
All headlines serif 500. UI sans 400-500.
**Evidence:**
- H1-H6 all serif 500
- Buttons and labels sans 400-500

# Values

## Do
- Use Parchment as primary background
- Keep all neutrals warm-toned

## Don't
- Use cool blue-grays anywhere
- Mix sans-serif into headlines
`;

describe("parseExpression", () => {
  it("extracts frontmatter fields into the fingerprint", () => {
    const { fingerprint, meta } = parseExpression(SAMPLE_MD);
    expect(fingerprint.id).toBe("claude");
    expect(fingerprint.palette.dominant[0].value).toBe("#c96442");
    expect(fingerprint.palette.neutrals.steps).toHaveLength(3);
    expect(fingerprint.typography.families).toContain("Anthropic Serif");
    expect(fingerprint.spacing.baseUnit).toBe(8);
    expect(fingerprint.surfaces.borderRadii).toEqual([8, 12, 16]);
    expect(fingerprint.embedding).toHaveLength(8);
    expect(meta.name).toBe("Claude");
    expect(meta.confidence).toBe(0.87);
  });

  it("exposes body Character/Signature via ParsedExpression.body (diagnostic)", () => {
    const { body } = parseExpression(SAMPLE_MD);
    expect(body.character).toContain("literary salon");
    expect(body.signature).toEqual([
      "Warm ring-shadows instead of drop-shadows",
      "Editorial serif/sans split",
      "Light/dark section alternation",
    ]);
  });

  it("does NOT merge body narrative into the fingerprint (frontmatter authoritative)", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    // SAMPLE_MD has no `observation:` in frontmatter — body is informational only
    expect(fingerprint.observation).toBeUndefined();
    expect(fingerprint.decisions).toBeUndefined();
    expect(fingerprint.values).toBeUndefined();
  });

  it("parses body Decisions with evidence into ParsedExpression.body", () => {
    const { body } = parseExpression(SAMPLE_MD);
    expect(body.decisions).toHaveLength(2);
    const warm = body.decisions?.[0];
    expect(warm?.dimension).toBe("warm-only-neutrals");
    expect(warm?.evidence.length).toBeGreaterThan(0);
    const serif = body.decisions?.[1];
    expect(serif?.evidence).toEqual([
      "H1-H6 all serif 500",
      "Buttons and labels sans 400-500",
    ]);
  });

  it("parses Values Do/Don't lists into ParsedExpression.body", () => {
    const { body } = parseExpression(SAMPLE_MD);
    expect(body.values?.do).toHaveLength(2);
    expect(body.values?.dont).toContain("Use cool blue-grays anywhere");
  });

  it("throws when the frontmatter delimiter is missing", () => {
    expect(() => parseExpression("# just a heading")).toThrow(/frontmatter/i);
  });

  it("rejects stale schema versions with a helpful error", () => {
    const stale = SAMPLE_MD.replace("schema: 2", "schema: 1");
    expect(() => parseExpression(stale)).toThrow(
      /schema version mismatch.*schema: 1.*schema: 2/s,
    );
  });

  it("surfaces the bad field path when validation fails", () => {
    const bad = SAMPLE_MD.replace(
      "saturationProfile: muted",
      "saturationProfile: electric",
    );
    expect(() => parseExpression(bad)).toThrow(/palette\.saturationProfile/);
  });

  it("skipValidation bypasses both schema gate and zod (for lint tooling)", () => {
    const stale = SAMPLE_MD.replace("schema: 2", "schema: 1");
    expect(() =>
      parseExpression(stale, { skipValidation: true }),
    ).not.toThrow();
  });

  it("tolerates an hrule `---` in the markdown body (not confused with frontmatter close)", () => {
    const withHrule = `${SAMPLE_MD}\n\n---\n\nSome trailing paragraph after an hrule.\n`;
    const { fingerprint, body } = parseExpression(withHrule);
    expect(fingerprint.id).toBe("claude");
    // The body parse should have captured everything after the frontmatter.
    expect(body.character).toContain("literary salon");
  });

  it("throws when the frontmatter is opened but never closed", () => {
    const unterminated = `---\nid: foo\nsource: unknown\n`;
    expect(() => parseExpression(unterminated)).toThrow(/unterminated/i);
  });

  it("frontmatter wins over body when they disagree (frontmatter-authoritative contract)", () => {
    const md = `---
id: claude
source: llm
timestamp: 2026-04-17T00:00:00.000Z
observation:
  summary: "FRONTMATTER WINS"
  personality: []
  distinctiveTraits: ["authoritative frontmatter trait"]
  closestSystems: []
decisions:
  - dimension: frontmatter-decision
    decision: "This came from YAML"
    evidence: ["yaml-evidence"]
values:
  do: ["YAML-do"]
  dont: ["YAML-dont"]
palette:
  dominant: []
  neutrals: { steps: [], count: 0 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [], baseUnit: null, regularity: 0 }
typography:
  families: []
  sizeRamp: []
  weightDistribution: {}
  lineHeightPattern: normal
surfaces:
  borderRadii: []
  shadowComplexity: none
  borderUsage: minimal
embedding: []
---

# Character

BODY LOSES — this should never reach the fingerprint.

# Signature

- body trait that should be ignored

# Decisions

### body decision
This should not appear.

# Values

## Do
- body-do

## Don't
- body-dont
`;
    const { fingerprint, body } = parseExpression(md);
    expect(fingerprint.observation?.summary).toBe("FRONTMATTER WINS");
    expect(fingerprint.observation?.distinctiveTraits).toEqual([
      "authoritative frontmatter trait",
    ]);
    expect(fingerprint.decisions).toHaveLength(1);
    expect(fingerprint.decisions?.[0].dimension).toBe("frontmatter-decision");
    expect(fingerprint.values?.do).toEqual(["YAML-do"]);
    expect(fingerprint.values?.dont).toEqual(["YAML-dont"]);
    // Body is still exposed for diagnostic tools
    expect(body.character).toContain("BODY LOSES");
    expect(body.decisions?.[0].dimension).toBe("body-decision");
  });
});

describe("loadExpression", () => {
  it("parses .md files as expressions", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.md`);
    await writeFile(path, SAMPLE_MD, "utf-8");
    const { fingerprint: fp } = await loadExpression(path);
    expect(fp.id).toBe("claude");
    expect(fp.palette.dominant[0].value).toBe("#c96442");
  });

  it("parses .json files via legacy passthrough", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.json`);
    await writeFile(path, JSON.stringify(SAMPLE_FINGERPRINT), "utf-8");
    const { fingerprint: fp } = await loadExpression(path);
    expect(fp.id).toBe(SAMPLE_FINGERPRINT.id);
    expect(fp.palette.neutrals.count).toBe(3);
    expect(fp.embedding).toHaveLength(8);
  });
});

describe("serializeExpression round-trip", () => {
  it("preserves every structured field when serialized and re-parsed", () => {
    const fpWithProse: DesignFingerprint = {
      ...SAMPLE_FINGERPRINT,
      observation: {
        summary: "Warm, editorial, unhurried.",
        personality: ["warm", "editorial"],
        distinctiveTraits: ["ring-shadows", "warm-only neutrals"],
        closestSystems: ["notion"],
      },
      decisions: [
        {
          dimension: "warm-only-neutrals",
          decision: "No cool blue-grays in the system.",
          evidence: ["#5e5d59", "#87867f"],
        },
      ],
    };

    const md = serializeExpression(fpWithProse, {
      meta: { name: "Claude", slug: "claude" },
    });

    const { fingerprint, meta } = parseExpression(md);

    expect(meta.name).toBe("Claude");
    expect(fingerprint.id).toBe(fpWithProse.id);
    expect(fingerprint.palette).toEqual(fpWithProse.palette);
    expect(fingerprint.spacing).toEqual(fpWithProse.spacing);
    expect(fingerprint.typography).toEqual(fpWithProse.typography);
    expect(fingerprint.surfaces).toEqual(fpWithProse.surfaces);
    expect(fingerprint.embedding).toEqual(fpWithProse.embedding);
    expect(fingerprint.observation?.summary).toBe(
      fpWithProse.observation?.summary,
    );
    expect(fingerprint.observation?.distinctiveTraits).toEqual(
      fpWithProse.observation?.distinctiveTraits,
    );
    expect(fingerprint.observation?.personality).toEqual(
      fpWithProse.observation?.personality,
    );
    expect(fingerprint.decisions).toHaveLength(1);
    expect(fingerprint.decisions?.[0].decision).toBe(
      fpWithProse.decisions?.[0].decision,
    );
    expect(fingerprint.decisions?.[0].evidence).toEqual(
      fpWithProse.decisions?.[0].evidence,
    );
  });

  it("emits a frontmatter-only file when observation and decisions are absent", () => {
    const md = serializeExpression(SAMPLE_FINGERPRINT);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n$/);
    expect(md).not.toMatch(/^# Character/m);
    expect(md).not.toMatch(/^# Signature/m);
  });

  it("round-trips values (Do/Don't) through serialize → parse", () => {
    const fpWithValues: DesignFingerprint = {
      ...SAMPLE_FINGERPRINT,
      values: {
        do: [
          "Use Parchment as primary background",
          "Keep all neutrals warm-toned",
        ],
        dont: ["Use cool blue-grays anywhere", "Mix sans into headline slots"],
      },
    };
    const md = serializeExpression(fpWithValues);
    expect(md).toMatch(/^# Values/m);
    expect(md).toMatch(/^## Do/m);
    expect(md).toMatch(/^## Don't/m);
    const { fingerprint } = parseExpression(md);
    expect(fingerprint.values?.do).toEqual(fpWithValues.values?.do);
    expect(fingerprint.values?.dont).toEqual(fpWithValues.values?.dont);
  });
});
