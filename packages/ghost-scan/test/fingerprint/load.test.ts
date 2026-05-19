import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Fingerprint } from "@ghost/core";
import { describe, expect, it } from "vitest";
import {
  loadFingerprint,
  parseFingerprint,
  serializeFingerprint,
} from "../../src/core/index.js";

const SAMPLE_FINGERPRINT: Fingerprint = {
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

// Frontmatter carries machine-facts only (dimension slug,
// personality/resembles tags). Prose + evidence
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
  resembles: [notion, linear]
references:
  specs: [src/styles/tokens.css]
  components: [src/components/ui]
  examples: [docs/examples/editorial.md]
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
---

# Character

A literary salon reimagined as a product page — warm, unhurried, and quietly intellectual.

# Signature

Long-form editorial layouts, warm neutral surfaces, and quiet controls that give prose more gravity than chrome.

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
    expect(fingerprint.embedding).toBeUndefined();
    expect(meta.name).toBe("Claude");
    expect(meta.confidence).toBe(0.87);
  });

  it("merges body Character into observation.summary", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.observation?.summary).toContain("literary salon");
  });

  it("merges body Signature into fingerprint.signature", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.signature).toContain("Long-form editorial layouts");
  });

  it("keeps direct fingerprint references from frontmatter", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.references).toEqual({
      specs: ["src/styles/tokens.css"],
      components: ["src/components/ui"],
      examples: ["docs/examples/editorial.md"],
    });
  });

  it("keeps observation tags (personality, resembles) from frontmatter", () => {
    const { fingerprint } = parseFingerprint(SAMPLE_MD);
    expect(fingerprint.observation?.personality).toEqual([
      "restrained",
      "editorial",
    ]);
    expect(fingerprint.observation?.resembles).toEqual(["notion", "linear"]);
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
    expect(fp.embedding).toHaveLength(49);
  });

  it("rejects non-.md paths with a clear error", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.json`);
    await writeFile(path, JSON.stringify(SAMPLE_FINGERPRINT), "utf-8");
    await expect(loadFingerprint(path)).rejects.toThrow(
      /must be Markdown \(\.md\)/,
    );
  });

  it("does not auto-assemble sibling decisions directories", async () => {
    const dir = join(tmpdir(), `ghost-test-${Date.now()}`);
    const path = join(dir, "fingerprint.md");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(path, SAMPLE_MD, "utf-8");
    await writeFile(
      join(dir, "decisions", "warm-only-neutrals.md"),
      `---\ndimension: warm-only-neutrals\n---\n\nFragment prose should not load.\n`,
      "utf-8",
    );

    const { fingerprint: fp } = await loadFingerprint(path);

    const decision = fp.decisions?.find(
      (entry) => entry.dimension === "warm-only-neutrals",
    );
    expect(decision?.decision).toContain("Every gray has");
    expect(decision?.decision).not.toContain("Fragment prose");
  });
});

describe("serializeFingerprint round-trip", () => {
  it("preserves every structured field when serialized and re-parsed", () => {
    const fpWithProse: Fingerprint = {
      ...SAMPLE_FINGERPRINT,
      observation: {
        summary: "Warm, editorial, unhurried.",
        personality: ["warm", "editorial"],
        resembles: ["notion"],
      },
      signature:
        "A readable editorial surface with warm neutrals and quietly structured controls.",
      references: {
        specs: ["src/styles/tokens.css"],
        components: ["src/components/ui"],
        examples: ["docs/examples/editorial.md"],
      },
      decisions: [
        {
          dimension: "warm-only-neutrals",
          decision: "No cool blue-grays in the system.",
          evidence: ["#141413", "#4d4c48"],
        },
      ],
    };

    const md = serializeFingerprint(fpWithProse, {
      meta: { name: "Claude", slug: "claude" },
    });

    const { fingerprint, meta } = parseFingerprint(md);

    expect(meta.name).toBe("Claude");
    expect(fingerprint.id).toBe(fpWithProse.id);
    expect(fingerprint.palette).toEqual(fpWithProse.palette);
    expect(fingerprint.spacing).toEqual(fpWithProse.spacing);
    expect(fingerprint.typography).toEqual(fpWithProse.typography);
    expect(fingerprint.surfaces).toEqual(fpWithProse.surfaces);
    expect(fingerprint.embedding).toBeUndefined();
    expect(fingerprint.observation?.summary).toBe(
      fpWithProse.observation?.summary,
    );
    expect(fingerprint.observation?.personality).toEqual(
      fpWithProse.observation?.personality,
    );
    expect(fingerprint.observation?.resembles).toEqual(
      fpWithProse.observation?.resembles,
    );
    expect(fingerprint.signature).toBe(fpWithProse.signature);
    expect(fingerprint.references).toEqual(fpWithProse.references);
    expect(fingerprint.checks).toBeUndefined();
    expect(fingerprint.decisions).toHaveLength(1);
    expect(fingerprint.decisions?.[0].decision).toBe(
      fpWithProse.decisions?.[0].decision,
    );
    expect(fingerprint.decisions?.[0].evidence).toEqual(
      fpWithProse.decisions?.[0].evidence,
    );
  });

  it("emits a frontmatter-only file when observation and decisions are absent", () => {
    const md = serializeFingerprint(SAMPLE_FINGERPRINT);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n$/);
    expect(md).not.toMatch(/^# Character/m);
    expect(md).not.toMatch(/^# Signature/m);
    expect(md).not.toMatch(/^# Fragments/m);
    expect(md).not.toMatch(/^embedding:/m);
  });

  it("never serializes runtime embeddings or fragment links", () => {
    const md = serializeFingerprint({
      ...SAMPLE_FINGERPRINT,
      observation: { summary: "Prose", personality: [], resembles: [] },
    });

    expect(md).not.toMatch(/^embedding:/m);
    expect(md).not.toMatch(/# Fragments/);
    expect(md).not.toMatch(/embedding\.md/);
  });

  it("emits prose in body only — no duplication in frontmatter", () => {
    const fpWithProse: Fingerprint = {
      ...SAMPLE_FINGERPRINT,
      observation: {
        summary: "Warm and editorial.",
        personality: ["warm"],
        resembles: [],
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
});
