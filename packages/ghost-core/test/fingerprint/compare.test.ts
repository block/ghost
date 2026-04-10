import { describe, expect, it } from "vitest";
import { compareFingerprints } from "../../src/fingerprint/compare.js";
import { makeFingerprint, makeDriftedFingerprint } from "../helpers/fingerprint-factory.js";

describe("compareFingerprints", () => {
  it("returns distance 0 for identical fingerprints", () => {
    const fp = makeFingerprint();
    const result = compareFingerprints(fp, fp);
    expect(result.distance).toBeCloseTo(0);
  });

  it("returns all 5 dimension deltas", () => {
    const a = makeFingerprint();
    const b = makeFingerprint({ id: "target" });
    const result = compareFingerprints(a, b);

    expect(Object.keys(result.dimensions)).toEqual(
      expect.arrayContaining(["palette", "spacing", "typography", "surfaces", "architecture"]),
    );
    expect(Object.keys(result.dimensions)).toHaveLength(5);
  });

  it("weights palette at 0.3 and spacing at 0.2", () => {
    const a = makeFingerprint();
    // Drift only palette dramatically
    const b = makeDriftedFingerprint(a, {
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
        saturationProfile: "vibrant",
        contrast: "low",
        semantic: [],
      },
    });

    const result = compareFingerprints(a, b);
    const paletteContribution = result.dimensions.palette.distance * 0.3;
    // Palette should be the dominant contributor
    expect(paletteContribution).toBeGreaterThan(0);
    // Overall should be roughly the palette contribution since other dims are similar
    expect(result.distance).toBeCloseTo(paletteContribution +
      result.dimensions.spacing.distance * 0.2 +
      result.dimensions.typography.distance * 0.2 +
      result.dimensions.surfaces.distance * 0.15 +
      result.dimensions.architecture.distance * 0.15,
      5,
    );
  });

  it("includes drift vectors when includeVectors is true", () => {
    const a = makeFingerprint();
    const b = makeFingerprint({ id: "target" });
    const result = compareFingerprints(a, b, { includeVectors: true });
    expect(result.vectors).toBeDefined();
    expect(result.vectors).toHaveLength(5);
  });

  it("omits vectors by default", () => {
    const a = makeFingerprint();
    const b = makeFingerprint({ id: "target" });
    const result = compareFingerprints(a, b);
    expect(result.vectors).toBeUndefined();
  });

  it("produces summary text based on distance", () => {
    const a = makeFingerprint();
    const result = compareFingerprints(a, a);
    expect(result.summary).toContain("same design language");
  });
});

describe("comparePalette (via compareFingerprints)", () => {
  it("detects dominant color differences", () => {
    const a = makeFingerprint();
    const b = makeDriftedFingerprint(a, {
      palette: {
        dominant: [{ role: "accent", value: "#ff0000", oklch: [0.6, 0.3, 30] }],
      },
    });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.palette.distance).toBeGreaterThan(0);
  });

  it("detects saturation profile mismatch", () => {
    const a = makeFingerprint({ palette: { saturationProfile: "muted" } });
    const b = makeFingerprint({ palette: { saturationProfile: "vibrant" } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.palette.distance).toBeGreaterThan(0);
  });
});

describe("compareSpacing (via compareFingerprints)", () => {
  it("reports low distance for identical scales", () => {
    const fp = makeFingerprint();
    const result = compareFingerprints(fp, fp);
    expect(result.dimensions.spacing.distance).toBe(0);
  });

  it("detects base unit mismatch", () => {
    const a = makeFingerprint({ spacing: { baseUnit: 4 } });
    const b = makeFingerprint({ spacing: { baseUnit: 8 } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.spacing.distance).toBeGreaterThan(0);
  });
});

describe("compareTypography (via compareFingerprints)", () => {
  it("detects font family divergence", () => {
    const a = makeFingerprint({ typography: { families: ["Inter"] } });
    const b = makeFingerprint({ typography: { families: ["Roboto"] } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.typography.distance).toBeGreaterThan(0);
  });

  it("detects line height pattern change", () => {
    const a = makeFingerprint({ typography: { lineHeightPattern: "tight" } });
    const b = makeFingerprint({ typography: { lineHeightPattern: "loose" } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.typography.distance).toBeGreaterThan(0);
  });
});

describe("compareSurfaces (via compareFingerprints)", () => {
  it("detects border radii divergence", () => {
    const a = makeFingerprint({ surfaces: { borderRadii: [4, 8] } });
    const b = makeFingerprint({ surfaces: { borderRadii: [16, 24] } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.surfaces.distance).toBeGreaterThan(0);
  });

  it("detects shadow complexity change", () => {
    const a = makeFingerprint({ surfaces: { shadowComplexity: "none" } });
    const b = makeFingerprint({ surfaces: { shadowComplexity: "layered" } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.surfaces.distance).toBeGreaterThan(0);
  });
});

describe("compareArchitecture (via compareFingerprints)", () => {
  it("detects tokenization delta", () => {
    const a = makeFingerprint({ architecture: { tokenization: 0.1 } });
    const b = makeFingerprint({ architecture: { tokenization: 0.9 } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.architecture.distance).toBeGreaterThan(0);
  });

  it("detects methodology divergence", () => {
    const a = makeFingerprint({ architecture: { methodology: ["tailwind"] } });
    const b = makeFingerprint({ architecture: { methodology: ["scss"] } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.architecture.distance).toBeGreaterThan(0);
  });

  it("detects naming pattern mismatch", () => {
    const a = makeFingerprint({ architecture: { namingPattern: "kebab-case" } });
    const b = makeFingerprint({ architecture: { namingPattern: "PascalCase" } });
    const result = compareFingerprints(a, b);
    expect(result.dimensions.architecture.distance).toBeGreaterThan(0);
  });
});
