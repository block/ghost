import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Expression } from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildSkillMd,
  writeContextBundle,
} from "../../src/core/context/index.js";
import { buildTokensCss } from "../../src/core/context/tokens-css.js";

const EXPRESSION: Expression = {
  id: "sample-ds",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  observation: {
    summary: "Restrained, utilitarian — warm neutrals on black.",
    personality: ["restrained", "utilitarian"],
    resembles: ["Vercel", "Linear"],
  },
  signature:
    "Dense control surfaces with quiet chrome, sharp hierarchy, and a green accent used as a precise signal.",
  references: {
    specs: ["src/styles/tokens.css"],
    components: ["src/components/ui"],
    examples: ["docs/examples/dashboard.md"],
  },
  decisions: [
    {
      dimension: "color-strategy",
      decision: "Pure black backgrounds; warm off-white foreground.",
      evidence: ["--bg: #000", "--fg: #f5f5f0"],
    },
  ],
  palette: {
    dominant: [{ role: "accent", value: "#00d64f" }],
    neutrals: { steps: ["#000", "#111", "#222", "#f5f5f0"], count: 4 },
    semantic: [
      { role: "surface", value: "#000" },
      { role: "text", value: "#f5f5f0" },
    ],
    saturationProfile: "muted",
    contrast: "high",
  },
  spacing: { scale: [4, 8, 16, 24], baseUnit: 8, regularity: 0.9 },
  typography: {
    families: ["Inter", "ui-sans-serif"],
    sizeRamp: [14, 16, 20, 32],
    weightDistribution: { 400: 0.7, 500: 0.3 },
    lineHeightPattern: "normal",
  },
  surfaces: {
    borderRadii: [4, 8, 12],
    shadowComplexity: "subtle",
    borderUsage: "minimal",
  },
  embedding: [0, 0, 0, 0],
};

let dir: string;
beforeEach(async () => {
  dir = join(
    tmpdir(),
    `ghost-context-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeContextBundle", () => {
  it("default: emits SKILL.md + expression.md + prompt.md + tokens.css", async () => {
    const res = await writeContextBundle(EXPRESSION, { outDir: dir });
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).toEqual([
      "SKILL.md",
      "expression.md",
      "prompt.md",
      "tokens.css",
    ]);

    const skill = await readFile(res.files[0], "utf-8");
    expect(skill).toContain("user-invocable: true");
    expect(skill).toContain("name: sample-ds");
    expect(skill).toContain("tokens.css");
  });

  it("--no-tokens: emits SKILL.md + expression.md + prompt.md only", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      tokens: false,
    });
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).toEqual(["SKILL.md", "expression.md", "prompt.md"]);

    const skill = await readFile(res.files[0], "utf-8");
    expect(skill).not.toContain("tokens.css");
  });

  it("--readme: adds README.md on top of the default bundle", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      readme: true,
    });
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).toEqual([
      "SKILL.md",
      "expression.md",
      "prompt.md",
      "tokens.css",
      "README.md",
    ]);
  });

  it("default bundle does not include scan artifacts", async () => {
    const res = await writeContextBundle(EXPRESSION, { outDir: dir });
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).not.toContain("map.md");
    expect(names).not.toContain("survey.json");

    for (const file of res.files) {
      const text = await readFile(file, "utf-8");
      expect(text).not.toContain("map.md");
      expect(text).not.toContain("survey.json");
      expect(text).not.toContain("bucket.json");
    }
  });

  it("--prompt-only: emits a single prompt.md", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      promptOnly: true,
    });
    expect(res.files).toHaveLength(1);
    const prompt = await readFile(res.files[0], "utf-8");
    expect(prompt).toContain("# Character");
    expect(prompt).toContain("# Signature");
    expect(prompt).toContain("# Local References");
    expect(prompt).toContain("# Decisions");
    expect(prompt).toContain("# Checks");
  });

  it("prompt.md names the lower-enforcement state when checks are absent", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      promptOnly: true,
    });
    const prompt = await readFile(res.files[0], "utf-8");
    expect(prompt).toContain("# Checks");
    expect(prompt).toContain("No promoted `checks[]` are present");
    expect(prompt).toContain("no promoted checks have been curated yet");
    expect(prompt).not.toContain("use checks as gates");
  });

  it("prompt.md renders a generation lens with severity-sorted checks", async () => {
    const res = await writeContextBundle(
      {
        ...EXPRESSION,
        checks: [
          {
            id: "spacing-on-scale",
            canonical: "spatial-system",
            kind: "spacing",
            summary: "Spacing must stay on the 8px rhythm",
            pattern: "p-\\[\\d+px\\]",
            paths: ["src"],
            contexts: ["className"],
            observed_count: 18,
            support: 0.94,
          },
          {
            id: "no-off-palette-hex",
            canonical: "color-strategy",
            kind: "color",
            summary: "Hex literals must come from the palette",
            pattern: "#[0-9a-fA-F]{3,8}",
            paths: ["src"],
            contexts: ["className", "css_var"],
            observed_count: 33,
            support: 0.97,
          },
        ],
      },
      {
        outDir: dir,
        promptOnly: true,
      },
    );
    const prompt = await readFile(res.files[0], "utf-8");

    expect(prompt).toContain("# Checks");
    expect(prompt.indexOf("no-off-palette-hex")).toBeLessThan(
      prompt.indexOf("spacing-on-scale"),
    );
    expect(prompt).toContain("**CRITICAL** `no-off-palette-hex`");
    expect(prompt).toContain("Pure black backgrounds");
    expect(prompt).toContain("src/styles/tokens.css");
    expect(prompt).toContain("**Dominant colors**");
    expect(prompt).toContain("**Neutral ramp:** #000, #111, #222, #f5f5f0");
    expect(prompt).not.toContain("Cite the Decision");
  });

  it("honors --name override in SKILL frontmatter", async () => {
    const md = buildSkillMd(EXPRESSION, "my-custom-name", false);
    expect(md).toMatch(/^---\nname: my-custom-name\n/);
  });

  it("tokens.css carries a provenance header with source path and timestamp", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      sourcePath: "/path/to/expression.md",
      generator: "ghost@0.9.0",
    });
    const cssFile = res.files.find((f) => f.endsWith("tokens.css"));
    if (!cssFile) throw new Error("tokens.css missing from output");
    const css = await readFile(cssFile, "utf-8");
    expect(css).toMatch(/Generated by ghost@0\.9\.0/);
    expect(css).toContain("/path/to/expression.md");
    expect(css).toContain("DO NOT EDIT");
    expect(css).toContain("2026-04-17T00:00:00.000Z");
  });

  it("legacy format: 'bundle' still emits README + tokens (back-compat)", async () => {
    const res = await writeContextBundle(EXPRESSION, {
      outDir: dir,
      format: "bundle",
    });
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).toContain("tokens.css");
    expect(names).toContain("README.md");
  });
});

describe("buildTokensCss", () => {
  it("emits only dimensions present on the expression", () => {
    const minimal: Expression = {
      ...EXPRESSION,
      typography: {
        families: [],
        sizeRamp: [],
        weightDistribution: {},
        lineHeightPattern: "normal",
      },
      surfaces: {
        borderRadii: [],
        shadowComplexity: "deliberate-none",
        borderUsage: "minimal",
      },
    };
    const css = buildTokensCss(minimal);
    expect(css).toContain("/* Spacing scale */");
    expect(css).not.toContain("/* Typography scale */");
    expect(css).not.toContain("/* Font families */");
    expect(css).not.toContain("/* Border radii */");
  });
});
