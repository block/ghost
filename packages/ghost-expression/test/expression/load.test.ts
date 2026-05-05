import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Expression } from "@ghost/core";
import { describe, expect, it } from "vitest";
import {
  loadExpression,
  parseExpression,
  serializeExpression,
} from "../../src/core/index.js";

const SAMPLE_EXPRESSION: Expression = {
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

describe("parseExpression", () => {
  it("extracts machine-layer fields from the frontmatter", () => {
    const { expression, meta } = parseExpression(SAMPLE_MD);
    expect(expression.id).toBe("claude");
    expect(expression.palette.dominant[0].value).toBe("#c96442");
    expect(expression.palette.neutrals.steps).toHaveLength(3);
    expect(expression.typography.families).toContain("Anthropic Serif");
    expect(expression.spacing.baseUnit).toBe(8);
    expect(expression.surfaces.borderRadii).toEqual([8, 12, 16]);
    expect(expression.embedding).toBeUndefined();
    expect(meta.name).toBe("Claude");
    expect(meta.confidence).toBe(0.87);
  });

  it("merges body Character into observation.summary", () => {
    const { expression } = parseExpression(SAMPLE_MD);
    expect(expression.observation?.summary).toContain("literary salon");
  });

  it("merges body Signature into expression.signature", () => {
    const { expression } = parseExpression(SAMPLE_MD);
    expect(expression.signature).toContain("Long-form editorial layouts");
  });

  it("keeps direct expression references from frontmatter", () => {
    const { expression } = parseExpression(SAMPLE_MD);
    expect(expression.references).toEqual({
      specs: ["src/styles/tokens.css"],
      components: ["src/components/ui"],
      examples: ["docs/examples/editorial.md"],
    });
  });

  it("keeps observation tags (personality, resembles) from frontmatter", () => {
    const { expression } = parseExpression(SAMPLE_MD);
    expect(expression.observation?.personality).toEqual([
      "restrained",
      "editorial",
    ]);
    expect(expression.observation?.resembles).toEqual(["notion", "linear"]);
  });

  it("joins frontmatter evidence with body rationale by dimension", () => {
    const { expression } = parseExpression(SAMPLE_MD);
    expect(expression.decisions).toHaveLength(2);
    const warm = expression.decisions?.[0];
    expect(warm?.dimension).toBe("warm-only-neutrals");
    expect(warm?.evidence).toEqual(["#141413", "#4d4c48", "#87867f"]);
    expect(warm?.decision).toContain("yellow-brown undertone");
  });

  it("rejects prose in the frontmatter (summary, decision rationale)", () => {
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

  it("surfaces the bad field path when validation fails", () => {
    const bad = SAMPLE_MD.replace(
      "saturationProfile: muted",
      "saturationProfile: electric",
    );
    expect(() => parseExpression(bad)).toThrow(/palette\.saturationProfile/);
  });

  it("skipValidation bypasses zod (for lint tooling)", () => {
    const bad = SAMPLE_MD.replace(
      "saturationProfile: muted",
      "saturationProfile: electric",
    );
    expect(() => parseExpression(bad, { skipValidation: true })).not.toThrow();
  });

  it("tolerates an hrule `---` in the markdown body (not confused with frontmatter close)", () => {
    const withHrule = `${SAMPLE_MD}\n\n---\n\nSome trailing paragraph after an hrule.\n`;
    const { expression } = parseExpression(withHrule);
    expect(expression.id).toBe("claude");
    expect(expression.observation?.summary).toContain("literary salon");
  });

  it("throws when the frontmatter is opened but never closed", () => {
    const unterminated = `---\nid: foo\nsource: unknown\n`;
    expect(() => parseExpression(unterminated)).toThrow(/unterminated/i);
  });

  it("frontmatter decision with no body block surfaces empty rationale and empty evidence", () => {
    // Strip the # Decisions section entirely
    const md = SAMPLE_MD.replace(/# Decisions[\s\S]*$/, "");
    const { expression } = parseExpression(md);
    expect(expression.decisions).toHaveLength(2);
    expect(expression.decisions?.[0].decision).toBe("");
    // Schema 5: evidence lives in the body — stripping the body loses it.
    expect(expression.decisions?.[0].evidence).toEqual([]);
  });

  it("body-only decision (no frontmatter entry) appends with body evidence", () => {
    const md = SAMPLE_MD.replace(
      /decisions:\n(?:\s{2}- dimension: [^\n]+\n)+/,
      "",
    );
    const { expression } = parseExpression(md);
    expect(expression.decisions?.map((d) => d.dimension)).toEqual([
      "warm-only-neutrals",
      "serif-authority-sans-utility",
    ]);
    // Evidence came from the body `**Evidence:**` block
    expect(expression.decisions?.[0].evidence).toEqual([
      "#141413",
      "#4d4c48",
      "#87867f",
    ]);
    expect(expression.decisions?.[0].decision).toContain("yellow-brown");
  });
});

describe("loadExpression", () => {
  it("parses .md files as expressions", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.md`);
    await writeFile(path, SAMPLE_MD, "utf-8");
    const { expression: fp } = await loadExpression(path);
    expect(fp.id).toBe("claude");
    expect(fp.palette.dominant[0].value).toBe("#c96442");
    expect(fp.embedding).toHaveLength(49);
  });

  it("rejects non-.md paths with a clear error", async () => {
    const path = join(tmpdir(), `ghost-test-${Date.now()}.json`);
    await writeFile(path, JSON.stringify(SAMPLE_EXPRESSION), "utf-8");
    await expect(loadExpression(path)).rejects.toThrow(
      /must be Markdown \(\.md\)/,
    );
  });

  it("does not auto-assemble sibling decisions directories", async () => {
    const dir = join(tmpdir(), `ghost-test-${Date.now()}`);
    const path = join(dir, "expression.md");
    await mkdir(join(dir, "decisions"), { recursive: true });
    await writeFile(path, SAMPLE_MD, "utf-8");
    await writeFile(
      join(dir, "decisions", "warm-only-neutrals.md"),
      `---\ndimension: warm-only-neutrals\n---\n\nFragment prose should not load.\n`,
      "utf-8",
    );

    const { expression: fp } = await loadExpression(path);

    const decision = fp.decisions?.find(
      (entry) => entry.dimension === "warm-only-neutrals",
    );
    expect(decision?.decision).toContain("Every gray has");
    expect(decision?.decision).not.toContain("Fragment prose");
  });
});

describe("serializeExpression round-trip", () => {
  it("preserves every structured field when serialized and re-parsed", () => {
    const fpWithProse: Expression = {
      ...SAMPLE_EXPRESSION,
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
      checks: [
        {
          id: "no-cool-neutrals",
          canonical: "color-strategy",
          kind: "color",
          pattern: "#(?:0f172a|111827)",
          support: 0.95,
          contexts: ["className"],
        },
      ],
      decisions: [
        {
          dimension: "warm-only-neutrals",
          decision: "No cool blue-grays in the system.",
          evidence: ["#141413", "#4d4c48"],
        },
      ],
    };

    const md = serializeExpression(fpWithProse, {
      meta: { name: "Claude", slug: "claude" },
    });

    const { expression, meta } = parseExpression(md);

    expect(meta.name).toBe("Claude");
    expect(expression.id).toBe(fpWithProse.id);
    expect(expression.palette).toEqual(fpWithProse.palette);
    expect(expression.spacing).toEqual(fpWithProse.spacing);
    expect(expression.typography).toEqual(fpWithProse.typography);
    expect(expression.surfaces).toEqual(fpWithProse.surfaces);
    expect(expression.embedding).toBeUndefined();
    expect(expression.observation?.summary).toBe(
      fpWithProse.observation?.summary,
    );
    expect(expression.observation?.personality).toEqual(
      fpWithProse.observation?.personality,
    );
    expect(expression.observation?.resembles).toEqual(
      fpWithProse.observation?.resembles,
    );
    expect(expression.signature).toBe(fpWithProse.signature);
    expect(expression.references).toEqual(fpWithProse.references);
    expect(expression.checks).toEqual(fpWithProse.checks);
    expect(expression.decisions).toHaveLength(1);
    expect(expression.decisions?.[0].decision).toBe(
      fpWithProse.decisions?.[0].decision,
    );
    expect(expression.decisions?.[0].evidence).toEqual(
      fpWithProse.decisions?.[0].evidence,
    );
  });

  it("emits a frontmatter-only file when observation and decisions are absent", () => {
    const md = serializeExpression(SAMPLE_EXPRESSION);
    expect(md).toMatch(/^---\n/);
    expect(md).toMatch(/\n---\n$/);
    expect(md).not.toMatch(/^# Character/m);
    expect(md).not.toMatch(/^# Signature/m);
    expect(md).not.toMatch(/^# Fragments/m);
    expect(md).not.toMatch(/^embedding:/m);
  });

  it("never serializes runtime embeddings or fragment links", () => {
    const md = serializeExpression({
      ...SAMPLE_EXPRESSION,
      observation: { summary: "Prose", personality: [], resembles: [] },
    });

    expect(md).not.toMatch(/^embedding:/m);
    expect(md).not.toMatch(/# Fragments/);
    expect(md).not.toMatch(/embedding\.md/);
  });

  it("emits prose in body only — no duplication in frontmatter", () => {
    const fpWithProse: Expression = {
      ...SAMPLE_EXPRESSION,
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
    const md = serializeExpression(fpWithProse);
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
