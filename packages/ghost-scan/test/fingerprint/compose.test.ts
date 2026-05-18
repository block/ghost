import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Fingerprint } from "@ghost/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { loadFingerprint, mergeFingerprint } from "../../src/core/index.js";

const BASE: Fingerprint = {
  id: "base",
  source: "llm",
  timestamp: "2026-04-17T00:00:00.000Z",
  decisions: [
    {
      dimension: "warm-neutrals",
      decision: "No cool grays.",
      evidence: ["#111"],
    },
    {
      dimension: "serif-headlines",
      decision: "Serif 500 on all heads.",
      evidence: ["H1"],
    },
  ],
  values: { do: ["warm"], dont: ["cool"] },
  palette: {
    dominant: [
      { role: "accent", value: "#c96442" },
      { role: "surface", value: "#f5f4ed" },
    ],
    neutrals: { steps: ["#111"], count: 1 },
    semantic: [{ role: "error", value: "#b53333" }],
    saturationProfile: "muted",
    contrast: "moderate",
  },
  spacing: { scale: [8, 16], baseUnit: 8, regularity: 0.9 },
  typography: {
    families: ["Serif"],
    sizeRamp: [14, 16],
    weightDistribution: { 500: 1 },
    lineHeightPattern: "loose",
  },
  surfaces: {
    borderRadii: [8],
    shadowComplexity: "subtle",
    borderUsage: "moderate",
  },
  embedding: [0.1, 0.2],
};

describe("mergeFingerprint", () => {
  it("overlay scalar replaces base scalar", () => {
    const overlay: Partial<Fingerprint> = { id: "overlay" };
    const merged = mergeFingerprint(BASE, overlay);
    expect(merged.id).toBe("overlay");
  });

  it("decisions merge by dimension: overlay wins per-dim, base-only kept", () => {
    const overlay: Partial<Fingerprint> = {
      decisions: [
        {
          dimension: "warm-neutrals",
          decision: "Now no warm grays either.",
          evidence: ["#222"],
        },
        {
          dimension: "new-rule",
          decision: "Something new",
          evidence: [],
        },
      ],
    };
    const merged = mergeFingerprint(BASE, overlay);
    expect(merged.decisions).toHaveLength(3);
    const warm = merged.decisions?.find((d) => d.dimension === "warm-neutrals");
    expect(warm?.decision).toBe("Now no warm grays either.");
    const serif = merged.decisions?.find(
      (d) => d.dimension === "serif-headlines",
    );
    expect(serif?.decision).toBe("Serif 500 on all heads.");
    const newRule = merged.decisions?.find((d) => d.dimension === "new-rule");
    expect(newRule).toBeDefined();
  });

  it("palette.dominant merges by role", () => {
    const overlay: Partial<Fingerprint> = {
      palette: {
        dominant: [{ role: "accent", value: "#ff0000" }],
        neutrals: BASE.palette.neutrals,
        semantic: [],
        saturationProfile: "muted",
        contrast: "moderate",
      },
    };
    const merged = mergeFingerprint(BASE, overlay);
    const accent = merged.palette.dominant.find((c) => c.role === "accent");
    expect(accent?.value).toBe("#ff0000");
    const surface = merged.palette.dominant.find((c) => c.role === "surface");
    expect(surface?.value).toBe("#f5f4ed"); // base-only preserved
  });

  it("values replace wholesale when overlay has them", () => {
    const overlay: Partial<Fingerprint> = {
      values: { do: ["new-do"], dont: [] },
    };
    const merged = mergeFingerprint(BASE, overlay);
    expect(merged.values?.do).toEqual(["new-do"]);
    expect(merged.values?.dont).toEqual([]);
  });
});

describe("loadFingerprint extends resolution", () => {
  let dir: string;

  beforeEach(async () => {
    dir = join(
      tmpdir(),
      `ghost-extends-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("overlay inherits base fields and overrides what it specifies", async () => {
    const basePath = join(dir, "base.fingerprint.md");
    const overlayPath = join(dir, "overlay.fingerprint.md");

    const baseMd = `---
id: base
source: llm
timestamp: 2026-04-17T00:00:00.000Z
palette:
  dominant:
    - { role: accent, value: '#c96442' }
  neutrals: { steps: ['#111'], count: 1 }
  semantic: []
  saturationProfile: muted
  contrast: moderate
spacing: { scale: [8, 16], baseUnit: 8, regularity: 0.9 }
typography:
  families: ['Serif']
  sizeRamp: [14, 16]
  weightDistribution: { 500: 1 }
  lineHeightPattern: loose
surfaces:
  borderRadii: [8]
  shadowComplexity: subtle
  borderUsage: moderate
decisions:
  - dimension: warm
---

# Decisions

### warm
base warm rule

**Evidence:**
- \`#111\`
`;

    const overlayMd = `---
extends: ./base.fingerprint.md
id: overlay
decisions:
  - dimension: warm
  - dimension: overlay-new
---

# Decisions

### warm
overlay overrides warm

### overlay-new
a new decision
`;

    await writeFile(basePath, baseMd, "utf-8");
    await writeFile(overlayPath, overlayMd, "utf-8");

    const { fingerprint, meta } = await loadFingerprint(overlayPath);
    expect(meta.extends).toBeUndefined(); // stripped after resolve
    expect(fingerprint.id).toBe("overlay");
    // Inherited from base
    expect(fingerprint.palette.dominant).toHaveLength(1);
    expect(fingerprint.palette.dominant[0].value).toBe("#c96442");
    expect(fingerprint.spacing.scale).toEqual([8, 16]);
    // Decision overrides
    const warm = fingerprint.decisions?.find((d) => d.dimension === "warm");
    expect(warm?.decision).toBe("overlay overrides warm");
    // New overlay decision
    const added = fingerprint.decisions?.find(
      (d) => d.dimension === "overlay-new",
    );
    expect(added).toBeDefined();
  });

  it("detects cycles in extends chains", async () => {
    const aPath = join(dir, "a.fingerprint.md");
    const bPath = join(dir, "b.fingerprint.md");
    await writeFile(
      aPath,
      `---
extends: ./b.fingerprint.md
id: a
---
`,
      "utf-8",
    );
    await writeFile(
      bPath,
      `---
extends: ./a.fingerprint.md
id: b
---
`,
      "utf-8",
    );
    await expect(loadFingerprint(aPath)).rejects.toThrow(/[Cc]ycle/);
  });

  it("noExtends: true skips base resolution", async () => {
    const basePath = join(dir, "base.fingerprint.md");
    const overlayPath = join(dir, "overlay.fingerprint.md");
    await writeFile(basePath, "---\nschema: 6\nid: base\n---\n", "utf-8");
    await writeFile(
      overlayPath,
      `---
extends: ./base.fingerprint.md
id: overlay
---
`,
      "utf-8",
    );
    const { fingerprint, meta } = await loadFingerprint(overlayPath, {
      noExtends: true,
    });
    expect(fingerprint.id).toBe("overlay");
    expect(meta.extends).toBe("./base.fingerprint.md");
  });
});
