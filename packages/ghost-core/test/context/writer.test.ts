import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSkillMd, writeContextBundle } from "../../src/context/index.js";
import { buildTokensCss } from "../../src/context/tokens-css.js";
import type { DesignFingerprint } from "../../src/types.js";

const FINGERPRINT: DesignFingerprint = {
  id: "sample-ds",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  observation: {
    summary: "Restrained, utilitarian — warm neutrals on black.",
    personality: ["restrained", "utilitarian"],
    distinctiveTraits: ["true-black backgrounds", "tight type scale"],
    closestSystems: ["Vercel", "Linear"],
  },
  decisions: [
    {
      dimension: "color-strategy",
      decision: "Pure black backgrounds; warm off-white foreground.",
      evidence: ["--bg: #000", "--fg: #f5f5f0"],
    },
  ],
  values: {
    do: ["Use warm neutrals."],
    dont: ["Don't introduce saturated accents outside brand green."],
  },
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
  it("skill format: emits SKILL.md + expression.md", async () => {
    const res = await writeContextBundle(FINGERPRINT, {
      outDir: dir,
      format: "skill",
    });
    expect(res.files).toHaveLength(2);
    expect(res.files[0]).toMatch(/SKILL\.md$/);
    expect(res.files[1]).toMatch(/expression\.md$/);

    const skill = await readFile(res.files[0], "utf-8");
    expect(skill).toContain("user-invocable: true");
    expect(skill).toContain("name: sample-ds");
    expect(skill).toContain("sample-ds");
  });

  it("bundle format: emits SKILL.md + expression.md + tokens.css + README.md", async () => {
    const res = await writeContextBundle(FINGERPRINT, {
      outDir: dir,
      format: "bundle",
    });
    expect(res.files).toHaveLength(4);
    const names = res.files.map((f) => f.split("/").pop());
    expect(names).toEqual([
      "SKILL.md",
      "expression.md",
      "tokens.css",
      "README.md",
    ]);

    const css = await readFile(res.files[2], "utf-8");
    expect(css).toContain("--brand-accent: #00d64f");
    expect(css).toContain("--color-surface: #000");
    expect(css).toContain("--space-0: 4px");
    expect(css).toContain("--radius-0: 4px");
  });

  it("prompt format: emits single prompt.md with Character + Values", async () => {
    const res = await writeContextBundle(FINGERPRINT, {
      outDir: dir,
      format: "prompt",
    });
    expect(res.files).toHaveLength(1);
    const prompt = await readFile(res.files[0], "utf-8");
    expect(prompt).toContain("# Character");
    expect(prompt).toContain("# Signature");
    expect(prompt).toContain("# Decisions");
    expect(prompt).toContain("# Values");
    expect(prompt).toContain("Don't introduce saturated accents");
  });

  it("honors --name override in SKILL frontmatter", async () => {
    const md = buildSkillMd(FINGERPRINT, "my-custom-name", "skill");
    expect(md).toMatch(/^---\nname: my-custom-name\n/);
  });
});

describe("buildTokensCss", () => {
  it("emits only dimensions present on the fingerprint", () => {
    const minimal: DesignFingerprint = {
      ...FINGERPRINT,
      typography: {
        families: [],
        sizeRamp: [],
        weightDistribution: {},
        lineHeightPattern: "normal",
      },
      surfaces: {
        borderRadii: [],
        shadowComplexity: "none",
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
