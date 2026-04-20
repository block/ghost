import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadFingerprint,
  parseFingerprint,
  serializeFingerprint,
} from "../../src/fingerprint/index.js";
import type { Fingerprint } from "../../src/types.js";

const SAMPLE_EXPRESSION: Fingerprint = {
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

// Schema 5: frontmatter carries machine-facts only (dimension slug +
// optional embedding, personality/closestSystems tags). Prose + evidence
// (Character, Signature, `### dimension` rationale + `**Evidence:**`
// bullets) all live in the body.
const SAMPLE_MD = `---
name: Claude
slug: claude
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
  - dimension: serif-authority-sans-utility
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

**Evidence:**
- \`#141413\`
- \`#4d4c48\`
- \`#87867f\`

### serif-authority-sans-utility
All headlines serif 500. UI sans 400-500.

**Evidence:**
- \`H1-H6 all serif 500\`
- \`Buttons and labels sans 400-500\`
`;

describe("parseFingerprint", () => {
  it("extracts machine-layer fields from the frontmatter", () => {
    const { fingerprint, meta } = parseFingerprint(SAMPLE_MD);
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
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.observation?.summary).toContain("literary salon");
  });

  it("merges body Signature into observation.distinctiveTraits", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.observation?.distinctiveTraits).toEqual([
      "Warm ring-shadows instead of drop-shadows",
      "Editorial serif/sans split",
      "Light/dark section alternation",
    ]);
  });

  it("keeps observation tags (personality, closestSystems) from frontmatter", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
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
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.decisions).toHaveLength(2);
    const warm = fingerprint.decisions?.[0];
    expect(warm?.dimension).toBe("warm-only-neutrals");
    expect(warm?.evidence).toEqual(["#141413", "#4d4c48", "#87867f"]);
    expect(warm?.decision).toContain("yellow-brown undertone");
  });

  it("rejects prose in the frontmatter (summary, decision rationale)", () => {
    const bad = SAMPLE_MD.replace(
      "observation:\n  personality: [restrained, editorial]",
      `observation:\n  summary: "prose in YAML"\n  personality: [restrained, editorial]`,
    );
    expect(() => parseFingerprint(bad)).toThrow(
      /Invalid fingerprint frontmatter[\s\S]*observation/,
    );
  });

  it("throws when the frontmatter delimiter is missing", () => {
    expect(() => parseFingerprint("# just a heading")).toThrow(/frontmatter/i);
  });

  it("surfaces the bad field path when validation fails", () => {
    const bad = SAMPLE_MD.replace(
      "saturationProfile: muted",
      "saturationProfile: electric",
    );
    expect(() => parseFingerprint(bad)).toThrow(/palette\.saturationProfile/);
  });

  it("skipValidation bypasses zod (for lint tooling)", () => {
    const bad = SAMPLE_MD.replace(
      "saturationProfile: muted",
      "saturationProfile: electric",
    );
    expect(() => parseFingerprint(bad, { skipValidation: true })).not.toThrow();
  });

  it("tolerates an hrule `---` in the markdown body (not confused with frontmatter close)", () => {
    const withHrule = `${SAMPLE_MD}\n\n---\n\nSome trailing paragraph after an hrule.\n`;
    const { fingerprint } = parseFingerprint(withHrule);
    expect(fingerprint.id).toBe("claude");
    expect(fingerprint.observation?.summary).toContain("literary salon");
  });

  it("throws when the frontmatter is opened but never closed", () => {
    const unterminated = `---\nid: foo\nsource: unknown\n`;
    expect(() => parseFingerprint(unterminated)).toThrow(/unterminated/i);
  });

  it("frontmatter decision with no body block surfaces empty rationale and empty evidence", () => {
    // Strip the # Decisions section entirely
    const md = SAMPLE_MD.replace(/# Decisions[\s\S]*$/, "");
    const { fingerprint } = parseFingerprint(md);
    expect(fingerprint.decisions).toHaveLength(2);
    expect(fingerprint.decisions?.[0].decision).toBe("");
    // Schema 5: evidence lives in the body — stripping the body loses it.
    expect(fingerprint.decisions?.[0].evidence).toEqual([]);
  });

  it("body-only decision (no frontmatter entry) appends with body evidence", () => {
    const md = SAMPLE_MD.replace(
      /decisions:\n(?:\s{2}- dimension: [^\n]+\n)+/,
      "",
    );
    const { fingerprint } = parseFingerprint(md);
    expect(fingerprint.decisions?.map((d) => d.dimension)).toEqual([
      "warm-only-neutrals",
      "serif-authority-sans-utility",
    ]);
    // Evidence came from the body `**Evidence:**` block
    expect(fingerprint.decisions?.[0].evidence).toEqual([
      "#141413",
      "#4d4c48",
      "#87867f",
    ]);
    expect(fingerprint.decisions?.[0].decision).toContain("yellow-brown");
  });
});

describe("loadFingerprint", () => {
  it("parses .md files as fingerprints", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.md`);
    await writeFile(path, SAMPLE_MD, "utf-8");
    const { fingerprint: fp } = await loadFingerprint(path);
    expect(fp.id).toBe("claude");
    expect(fp.palette.dominant[0].value).toBe("#c96442");
  });

  it("rejects non-.md paths with a clear error", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.json`);
    await writeFile(path, JSON.stringify(SAMPLE_EXPRESSION), "utf-8");
    await expect(loadFingerprint(path)).rejects.toThrow(
      /must be Markdown \(\.md\)/,
    );
  });
});

describe("serializeFingerprint round-trip", () => {
  it("preserves every structured field when serialized and re-parsed", () => {
    const fpWithProse: Fingerprint = {
      ...SAMPLE_EXPRESSION,
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
    const md = serializeFingerprint(fpWithProse, {
      meta: { name: "Claude", slug: "claude" },
      extractEmbedding: false,
    });

    const { fingerprint, meta } = parseFingerprint(md);

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
    const { embedding: _drop, ...noEmbedding } = SAMPLE_EXPRESSION;
    const md = serializeFingerprint(noEmbedding as Fingerprint);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n$/);
    expect(md).not.toMatch(/^# Character/m);
    expect(md).not.toMatch(/^# Signature/m);
    expect(md).not.toMatch(/^# Fragments/m);
  });

  it("appends a # Fragments body link when embedding is extracted", () => {
    const md = serializeFingerprint(SAMPLE_EXPRESSION);
    // Frontmatter no longer carries the embedding
    const yaml = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yaml).not.toMatch(/^embedding:/m);
    // Body points at the sibling file
    expect(md).toMatch(/# Fragments[\s\S]*\[embedding\]\(embedding\.md\)/);
  });

  it("extractEmbedding: false keeps the embedding inline", () => {
    const md = serializeFingerprint(SAMPLE_EXPRESSION, {
      extractEmbedding: false,
    });
    const yaml = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yaml).toMatch(/^embedding:/m);
    expect(md).not.toMatch(/# Fragments/);
  });

  it("emits prose in body only — no duplication in frontmatter", () => {
    const fpWithProse: Fingerprint = {
      ...SAMPLE_EXPRESSION,
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
    };
    const md = serializeFingerprint(fpWithProse);
    // Frontmatter has machine-facts only
    const yamlSection = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yamlSection).not.toContain("summary:");
    expect(yamlSection).not.toContain("distinctiveTraits:");
    expect(yamlSection).not.toContain("No cool grays");
    expect(yamlSection).toContain("personality:");
    // Schema 5: evidence lives in the body, not the frontmatter
    expect(yamlSection).not.toContain("evidence:");
    // Body carries prose + evidence bullets
    expect(md).toMatch(/^# Character\n\nWarm and editorial\./m);
    expect(md).toMatch(/^### Warm neutrals\nNo cool grays\./m);
    expect(md).toContain("**Evidence:**");
    expect(md).toContain("`#141413`");
  });

  it("round-trips roles (slot → token bindings) through serialize → parse", () => {
    const fpWithRoles: Fingerprint = {
      ...SAMPLE_EXPRESSION,
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
    const md = serializeFingerprint(fpWithRoles, { extractEmbedding: false });
    const yamlSection = md.slice(md.indexOf("---") + 3, md.lastIndexOf("---"));
    expect(yamlSection).toMatch(/^roles:/m);
    expect(yamlSection).toContain("name: h1");
    expect(yamlSection).toContain("name: card");

    const { fingerprint } = parseFingerprint(md);
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
      ...SAMPLE_EXPRESSION,
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
    } as Fingerprint;
    const md = serializeFingerprint(fpBad, { extractEmbedding: false });
    expect(() => parseFingerprint(md)).toThrow(
      /Invalid fingerprint frontmatter[\s\S]*roles/,
    );
  });
});
