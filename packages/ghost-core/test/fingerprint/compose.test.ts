import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  loadFingerprint,
  mergeFingerprint,
} from "../../src/fingerprint/index.js";
import type { Fingerprint } from "../../src/types.js";

const PARENT: Fingerprint = {
  id: "parent",
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
  it("child scalar replaces parent scalar", () => {
    const child: Partial<Fingerprint> = { id: "child" };
    const merged = mergeFingerprint(PARENT, child);
    expect(merged.id).toBe("child");
  });

  it("decisions merge by dimension: child wins per-dim, parent-only kept", () => {
    const child: Partial<Fingerprint> = {
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
    const merged = mergeFingerprint(PARENT, child);
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
    const child: Partial<Fingerprint> = {
      palette: {
        dominant: [{ role: "accent", value: "#ff0000" }],
        neutrals: PARENT.palette.neutrals,
        semantic: [],
        saturationProfile: "muted",
        contrast: "moderate",
      },
    };
    const merged = mergeFingerprint(PARENT, child);
    const accent = merged.palette.dominant.find((c) => c.role === "accent");
    expect(accent?.value).toBe("#ff0000");
    const surface = merged.palette.dominant.find((c) => c.role === "surface");
    expect(surface?.value).toBe("#f5f4ed"); // parent-only preserved
  });

  it("values replace wholesale when child has them", () => {
    const child: Partial<Fingerprint> = {
      values: { do: ["new-do"], dont: [] },
    };
    const merged = mergeFingerprint(PARENT, child);
    expect(merged.values?.do).toEqual(["new-do"]);
    expect(merged.values?.dont).toEqual([]);
  });

  it("roles merge by name: child wins per-slot, parent-only roles kept", () => {
    const parentWithRoles: Fingerprint = {
      ...PARENT,
      roles: [
        {
          name: "h1",
          tokens: { typography: { family: "Serif", size: 32 } },
          evidence: ["parent.tsx"],
        },
        {
          name: "body",
          tokens: { typography: { family: "Sans", size: 16 } },
          evidence: ["parent.tsx"],
        },
      ],
    };
    const child: Partial<Fingerprint> = {
      roles: [
        {
          name: "h1",
          tokens: { typography: { family: "Serif", size: 64 } },
          evidence: ["child.tsx"],
        },
      ],
    };
    const merged = mergeFingerprint(parentWithRoles, child);
    expect(merged.roles).toHaveLength(2);
    const h1 = merged.roles?.find((r) => r.name === "h1");
    expect(h1?.tokens.typography?.size).toBe(64);
    expect(h1?.evidence).toEqual(["child.tsx"]);
    const body = merged.roles?.find((r) => r.name === "body");
    expect(body?.tokens.typography?.size).toBe(16);
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

  it("child inherits parent fields and overrides what it specifies", async () => {
    const parentPath = join(dir, "parent.fingerprint.md");
    const childPath = join(dir, "child.fingerprint.md");

    const parentMd = `---
id: parent
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
embedding: [0.1]
decisions:
  - dimension: warm
---

# Decisions

### warm
parent warm rule

**Evidence:**
- \`#111\`
`;

    const childMd = `---
extends: ./parent.fingerprint.md
id: child
decisions:
  - dimension: warm
  - dimension: child-new
---

# Decisions

### warm
child overrides warm

### child-new
a new decision
`;

    await writeFile(parentPath, parentMd, "utf-8");
    await writeFile(childPath, childMd, "utf-8");

    const { fingerprint, meta } = await loadFingerprint(childPath);
    expect(meta.extends).toBeUndefined(); // stripped after resolve
    expect(fingerprint.id).toBe("child");
    // Inherited from parent
    expect(fingerprint.palette.dominant).toHaveLength(1);
    expect(fingerprint.palette.dominant[0].value).toBe("#c96442");
    expect(fingerprint.spacing.scale).toEqual([8, 16]);
    // Decision overrides
    const warm = fingerprint.decisions?.find((d) => d.dimension === "warm");
    expect(warm?.decision).toBe("child overrides warm");
    // New child decision
    const added = fingerprint.decisions?.find(
      (d) => d.dimension === "child-new",
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

  it("noExtends: true skips parent resolution", async () => {
    const parentPath = join(dir, "parent.fingerprint.md");
    const childPath = join(dir, "child.fingerprint.md");
    await writeFile(parentPath, "---\nschema: 6\nid: parent\n---\n", "utf-8");
    await writeFile(
      childPath,
      `---
extends: ./parent.fingerprint.md
id: child
---
`,
      "utf-8",
    );
    const { fingerprint, meta } = await loadFingerprint(childPath, {
      noExtends: true,
    });
    expect(fingerprint.id).toBe("child");
    expect(meta.extends).toBe("./parent.fingerprint.md");
  });
});
