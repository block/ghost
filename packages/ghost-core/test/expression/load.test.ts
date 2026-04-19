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

// Schema 3: frontmatter carries machine-facts only (dimension + evidence,
// personality/closestSystems tags). Prose (Character, Signature, decision
// rationale, Values) lives in the body.
const SAMPLE_MD = `---
name: Claude
slug: claude
schema: 4
generator: ghost@0.9.0
confidence: 0.87
id: claude
source: llm
timestamp: 2026-04-17T00:00:00.000Z
observation:
  personality: [restrained, editorial]
  closestSystems: [notion, linear]
decisions:
  - dimension: warm-only-neutrals
    evidence: ['#141413', '#4d4c48', '#87867f']
  - dimension: serif-authority-sans-utility
    evidence: ['H1-H6 all serif 500', 'Buttons and labels sans 400-500']
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

### warm-only-neutrals
Every gray has a yellow-brown undertone. No cool blue-grays.

### serif-authority-sans-utility
All headlines serif 500. UI sans 400-500.

# Values

## Do
- Use Parchment as primary background
- Keep all neutrals warm-toned

## Don't
- Use cool blue-grays anywhere
- Mix sans-serif into headlines
`;

describe("parseExpression", () => {
  it("extracts machine-layer fields from the frontmatter", () => {
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

  it("merges body Character into observation.summary", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    expect(fingerprint.observation?.summary).toContain("literary salon");
  });

  it("merges body Signature into observation.distinctiveTraits", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    expect(fingerprint.observation?.distinctiveTraits).toEqual([
      "Warm ring-shadows instead of drop-shadows",
      "Editorial serif/sans split",
      "Light/dark section alternation",
    ]);
  });

  it("keeps observation tags (personality, closestSystems) from frontmatter", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    expect(fingerprint.observation?.personality).toEqual([
      "restrained",
      "editorial",
    ]);
    expect(fingerprint.observation?.closestSystems).toEqual([
      "notion",
      "linear",
    ]);
  });

  it("joins frontmatter evidence with body rationale by dimension", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    expect(fingerprint.decisions).toHaveLength(2);
    const warm = fingerprint.decisions?.[0];
    expect(warm?.dimension).toBe("warm-only-neutrals");
    expect(warm?.evidence).toEqual(["#141413", "#4d4c48", "#87867f"]);
    expect(warm?.decision).toContain("yellow-brown undertone");
  });

  it("reads Values straight from the body (frontmatter carries no values)", () => {
    const { fingerprint } = parseExpression(SAMPLE_MD);
    expect(fingerprint.values?.do).toEqual([
      "Use Parchment as primary background",
      "Keep all neutrals warm-toned",
    ]);
    expect(fingerprint.values?.dont).toContain("Use cool blue-grays anywhere");
  });

  it("rejects prose in the frontmatter (values, summary, decision rationale)", () => {
    const bad = SAMPLE_MD.replace(
      "observation:\n  personality: [restrained, editorial]",
      `observation:\n  summary: "prose in YAML"\n  personality: [restrained, editorial]`,
    );
    expect(() => parseExpression(bad)).toThrow(
      /Invalid expression frontmatter[\s\S]*observation/,
    );
  });

  it("throws when the frontmatter delimiter is missing", () => {
    expect(() => parseExpression("# just a heading")).toThrow(/frontmatter/i);
  });

  it("rejects stale schema versions with a helpful error", () => {
    const stale = SAMPLE_MD.replace("schema: 4", "schema: 2");
    expect(() => parseExpression(stale)).toThrow(
      /schema version mismatch.*schema: 2.*schema: 4/s,
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
    const stale = SAMPLE_MD.replace("schema: 4", "schema: 2");
    expect(() =>
      parseExpression(stale, { skipValidation: true }),
    ).not.toThrow();
  });

  it("tolerates an hrule `---` in the markdown body (not confused with frontmatter close)", () => {
    const withHrule = `${SAMPLE_MD}\n\n---\n\nSome trailing paragraph after an hrule.\n`;
    const { fingerprint } = parseExpression(withHrule);
    expect(fingerprint.id).toBe("claude");
    expect(fingerprint.observation?.summary).toContain("literary salon");
  });

  it("throws when the frontmatter is opened but never closed", () => {
    const unterminated = `---\nid: foo\nsource: unknown\n`;
    expect(() => parseExpression(unterminated)).toThrow(/unterminated/i);
  });

  it("frontmatter decision with no body block surfaces empty rationale", () => {
    // Strip the # Decisions section entirely
    const md = SAMPLE_MD.replace(/# Decisions[\s\S]*?(?=# Values)/, "");
    const { fingerprint } = parseExpression(md);
    expect(fingerprint.decisions).toHaveLength(2);
    expect(fingerprint.decisions?.[0].decision).toBe("");
    // Evidence from frontmatter is preserved
    expect(fingerprint.decisions?.[0].evidence).toEqual([
      "#141413",
      "#4d4c48",
      "#87867f",
    ]);
  });

  it("body-only decision (no frontmatter entry) appends with empty evidence", () => {
    const md = SAMPLE_MD.replace(
      /decisions:\n(?:\s{2}- [\s\S]*?evidence:[^\n]+\n)+/,
      "",
    );
    const { fingerprint } = parseExpression(md);
    expect(fingerprint.decisions?.map((d) => d.dimension)).toEqual([
      "warm-only-neutrals",
      "serif-authority-sans-utility",
    ]);
    expect(fingerprint.decisions?.[0].evidence).toEqual([]);
    expect(fingerprint.decisions?.[0].decision).toContain("yellow-brown");
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
          evidence: ["#141413", "#4d4c48"],
        },
      ],
    };

    // Keep embedding inline so a pure in-memory round-trip round-trips
    // without needing a sibling embedding.md on disk.
    const md = serializeExpression(fpWithProse, {
      meta: { name: "Claude", slug: "claude" },
      extractEmbedding: false,
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
    expect(fingerprint.observation?.closestSystems).toEqual(
      fpWithProse.observation?.closestSystems,
    );
    expect(fingerprint.decisions).toHaveLength(1);
    expect(fingerprint.decisions?.[0].decision).toBe(
      fpWithProse.decisions?.[0].decision,
    );
    expect(fingerprint.decisions?.[0].evidence).toEqual(
      fpWithProse.decisions?.[0].evidence,
    );
  });

  it("emits a frontmatter-only file when observation, decisions, and embedding are absent", () => {
    const { embedding: _drop, ...noEmbedding } = SAMPLE_FINGERPRINT;
    const md = serializeExpression(noEmbedding as DesignFingerprint);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n$/);
    expect(md).not.toMatch(/^# Character/m);
    expect(md).not.toMatch(/^# Signature/m);
    expect(md).not.toMatch(/^# Fragments/m);
  });

  it("appends a # Fragments body link when embedding is extracted", () => {
    const md = serializeExpression(SAMPLE_FINGERPRINT);
    // Frontmatter no longer carries the embedding
    const yaml = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yaml).not.toMatch(/^embedding:/m);
    // Body points at the sibling file
    expect(md).toMatch(/# Fragments[\s\S]*\[embedding\]\(embedding\.md\)/);
  });

  it("extractEmbedding: false keeps the embedding inline", () => {
    const md = serializeExpression(SAMPLE_FINGERPRINT, {
      extractEmbedding: false,
    });
    const yaml = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yaml).toMatch(/^embedding:/m);
    expect(md).not.toMatch(/# Fragments/);
  });

  it("emits prose in body only — no duplication in frontmatter", () => {
    const fpWithProse: DesignFingerprint = {
      ...SAMPLE_FINGERPRINT,
      observation: {
        summary: "Warm and editorial.",
        personality: ["warm"],
        distinctiveTraits: ["ring-shadows"],
        closestSystems: [],
      },
      decisions: [
        {
          dimension: "warm-neutrals",
          decision: "No cool grays.",
          evidence: ["#141413"],
        },
      ],
      values: {
        do: ["Use Parchment"],
        dont: ["Use cool grays"],
      },
    };
    const md = serializeExpression(fpWithProse);
    // Frontmatter has machine-facts only
    const yamlSection = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yamlSection).not.toContain("summary:");
    expect(yamlSection).not.toContain("distinctiveTraits:");
    expect(yamlSection).not.toContain("No cool grays");
    expect(yamlSection).not.toMatch(/^values:/m);
    expect(yamlSection).toContain("personality:");
    expect(yamlSection).toContain("evidence:");
    // Body carries prose
    expect(md).toMatch(/^# Character\n\nWarm and editorial\./m);
    expect(md).toMatch(/^### Warm neutrals\nNo cool grays\./m);
    expect(md).toMatch(/^## Do\n- Use Parchment/m);
    expect(md).toMatch(/^## Don't\n- Use cool grays/m);
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

  it("round-trips roles (slot → token bindings) through serialize → parse", () => {
    const fpWithRoles: DesignFingerprint = {
      ...SAMPLE_FINGERPRINT,
      roles: [
        {
          name: "h1",
          tokens: {
            typography: { family: "Anthropic Serif", size: 64, weight: 500 },
            spacing: { margin: 32 },
          },
          evidence: ["components/Heading.tsx:12"],
        },
        {
          name: "card",
          tokens: {
            surfaces: { borderRadius: 16, shadow: "subtle" },
            spacing: { padding: 24 },
            palette: { background: "#f5f4ed" },
          },
          evidence: ["components/ui/card.tsx"],
        },
      ],
    };
    const md = serializeExpression(fpWithRoles, { extractEmbedding: false });
    const yamlSection = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yamlSection).toMatch(/^roles:/m);
    expect(yamlSection).toContain("name: h1");
    expect(yamlSection).toContain("name: card");

    const { fingerprint } = parseExpression(md);
    expect(fingerprint.roles).toHaveLength(2);
    expect(fingerprint.roles?.[0].name).toBe("h1");
    expect(fingerprint.roles?.[0].tokens.typography?.size).toBe(64);
    expect(fingerprint.roles?.[0].evidence).toEqual([
      "components/Heading.tsx:12",
    ]);
    expect(fingerprint.roles?.[1].tokens.surfaces?.borderRadius).toBe(16);
    expect(fingerprint.roles?.[1].tokens.surfaces?.shadow).toBe("subtle");
    expect(fingerprint.roles?.[1].tokens.palette?.background).toBe("#f5f4ed");
  });

  it("rejects unknown keys in role token sub-blocks (strict schema)", () => {
    const fpBad = {
      ...SAMPLE_FINGERPRINT,
      roles: [
        {
          name: "h1",
          tokens: {
            // @ts-expect-error — intentional bad input
            typography: { family: "Serif", bogus: 42 },
          },
          evidence: [],
        },
      ],
    } as DesignFingerprint;
    const md = serializeExpression(fpBad, { extractEmbedding: false });
    expect(() => parseExpression(md)).toThrow(
      /Invalid expression frontmatter[\s\S]*roles/,
    );
  });
});
