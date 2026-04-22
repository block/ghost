import { describe, expect, it } from "vitest";
import {
  formatReferenceError,
  isTokenReference,
  parseTokenReference,
  resolveTokenReference,
} from "../../src/core/fingerprint/references.js";
import type { Fingerprint } from "../../src/core/types.js";

function buildFingerprint(): Fingerprint {
  return {
    id: "x",
    source: "llm",
    timestamp: "2026-04-22T00:00:00Z",
    palette: {
      dominant: [
        { role: "accent", value: "#c96442" },
        { role: "surface", value: "#f5f4ed" },
      ],
      neutrals: { steps: ["#141413", "#4d4c48"], count: 2 },
      semantic: [
        { role: "error", value: "#b53333" },
        { role: "focus", value: "#3898ec" },
      ],
      saturationProfile: "muted",
      contrast: "moderate",
    },
    spacing: { scale: [4, 8], regularity: 1, baseUnit: 8 },
    typography: {
      families: ["Serif"],
      sizeRamp: [16],
      weightDistribution: { 400: 1 },
      lineHeightPattern: "normal",
    },
    surfaces: {
      borderRadii: [8],
      shadowComplexity: "subtle",
      borderUsage: "moderate",
    },
    embedding: [],
  };
}

describe("isTokenReference", () => {
  it("recognizes well-formed references", () => {
    expect(isTokenReference("{palette.dominant.accent}")).toBe(true);
    expect(isTokenReference("{palette.semantic.error}")).toBe(true);
  });

  it("rejects raw hex values and plain strings", () => {
    expect(isTokenReference("#c96442")).toBe(false);
    expect(isTokenReference("Anthropic Serif")).toBe(false);
    expect(isTokenReference("")).toBe(false);
  });

  it("rejects single-segment or empty braces", () => {
    expect(isTokenReference("{accent}")).toBe(false);
    expect(isTokenReference("{}")).toBe(false);
    expect(isTokenReference("{palette}")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isTokenReference(16)).toBe(false);
    expect(isTokenReference(null)).toBe(false);
    expect(isTokenReference(undefined)).toBe(false);
  });
});

describe("parseTokenReference", () => {
  it("splits namespace and role", () => {
    expect(parseTokenReference("{palette.dominant.accent}")).toEqual({
      path: "palette.dominant.accent",
      namespace: "palette.dominant",
      role: "accent",
    });
  });

  it("returns null for malformed input", () => {
    expect(parseTokenReference("{palette}")).toBeNull();
    expect(parseTokenReference("palette.dominant.accent")).toBeNull();
  });
});

describe("resolveTokenReference", () => {
  const fp = buildFingerprint();

  it("resolves a dominant role to its hex", () => {
    const result = resolveTokenReference(fp, "{palette.dominant.accent}");
    expect(result.value).toBe("#c96442");
    expect(result.error).toBeNull();
  });

  it("resolves a semantic role to its hex", () => {
    const result = resolveTokenReference(fp, "{palette.semantic.error}");
    expect(result.value).toBe("#b53333");
    expect(result.error).toBeNull();
  });

  it("flags an unknown role in a supported namespace", () => {
    const result = resolveTokenReference(fp, "{palette.dominant.ghost}");
    expect(result.value).toBeNull();
    expect(result.error).toEqual({
      kind: "unknown-role",
      namespace: "palette.dominant",
      role: "ghost",
    });
  });

  it("flags an unsupported namespace with the supported list", () => {
    const result = resolveTokenReference(fp, "{typography.families.primary}");
    expect(result.value).toBeNull();
    expect(result.error?.kind).toBe("unsupported-namespace");
    if (result.error?.kind === "unsupported-namespace") {
      expect(result.error.supported).toEqual([
        "palette.dominant",
        "palette.semantic",
      ]);
    }
  });

  it("flags a malformed reference string", () => {
    const result = resolveTokenReference(fp, "{bogus}");
    expect(result.value).toBeNull();
    expect(result.error?.kind).toBe("malformed");
  });
});

describe("formatReferenceError", () => {
  it("produces a readable message for each kind", () => {
    expect(
      formatReferenceError({ kind: "malformed", value: "{bogus}" }),
    ).toMatch(/not a valid token reference/);
    expect(
      formatReferenceError({
        kind: "unsupported-namespace",
        namespace: "typography.sizeRamp",
        supported: ["palette.dominant", "palette.semantic"],
      }),
    ).toMatch(/Supported:.*palette\.dominant.*palette\.semantic/);
    expect(
      formatReferenceError({
        kind: "unknown-role",
        namespace: "palette.dominant",
        role: "ghost",
      }),
    ).toMatch(/does not resolve/);
  });
});
