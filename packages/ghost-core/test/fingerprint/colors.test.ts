import { describe, expect, it } from "vitest";
import {
  parseColorToOklch,
  colorToSemanticColor,
  classifySaturation,
  classifyContrast,
} from "../../src/fingerprint/colors.js";
import type { SemanticColor } from "../../src/types.js";

describe("parseColorToOklch", () => {
  it("parses 6-digit hex", () => {
    const result = parseColorToOklch("#ffffff");
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(1, 1); // L ≈ 1 for white
    expect(result![1]).toBeCloseTo(0, 2); // C ≈ 0 (achromatic)
  });

  it("parses 3-digit hex shorthand", () => {
    const result = parseColorToOklch("#fff");
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(1, 1);
  });

  it("parses black hex", () => {
    const result = parseColorToOklch("#000000");
    expect(result).not.toBeNull();
    expect(result![0]).toBeCloseTo(0, 1); // L ≈ 0 for black
  });

  it("parses rgb() function", () => {
    const result = parseColorToOklch("rgb(255, 0, 0)");
    expect(result).not.toBeNull();
    expect(result![1]).toBeGreaterThan(0.1); // red has high chroma
  });

  it("parses rgba() function", () => {
    const result = parseColorToOklch("rgba(0, 128, 0, 0.5)");
    expect(result).not.toBeNull();
    expect(result![1]).toBeGreaterThan(0.05); // green has chroma
  });

  it("parses oklch() directly", () => {
    const result = parseColorToOklch("oklch(0.7 0.15 200)");
    expect(result).toEqual([0.7, 0.15, 200]);
  });

  it("returns null for var() references", () => {
    expect(parseColorToOklch("var(--foo)")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseColorToOklch("")).toBeNull();
  });

  it("returns null for transparent", () => {
    expect(parseColorToOklch("transparent")).toBeNull();
  });

  it("returns NaN values for invalid hex digits", () => {
    // hexToRgb doesn't validate hex chars, so parseInt returns NaN
    const result = parseColorToOklch("#xyz");
    expect(result).not.toBeNull();
    expect(Number.isNaN(result![0])).toBe(true);
  });
});

describe("colorToSemanticColor", () => {
  it("returns role and parsed oklch for valid hex", () => {
    const result = colorToSemanticColor("accent", "#3b82f6");
    expect(result.role).toBe("accent");
    expect(result.value).toBe("#3b82f6");
    expect(result.oklch).toBeDefined();
    expect(result.oklch).toHaveLength(3);
  });

  it("returns undefined oklch for unparseable value", () => {
    const result = colorToSemanticColor("text", "var(--foo)");
    expect(result.role).toBe("text");
    expect(result.oklch).toBeUndefined();
  });
});

describe("classifySaturation", () => {
  it("returns 'muted' for low-chroma colors", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#ccc", oklch: [0.8, 0.02, 0] },
      { role: "b", value: "#ddd", oklch: [0.9, 0.01, 0] },
    ];
    expect(classifySaturation(colors)).toBe("muted");
  });

  it("returns 'vibrant' for high-chroma colors", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#f00", oklch: [0.6, 0.25, 30] },
      { role: "b", value: "#00f", oklch: [0.4, 0.3, 260] },
    ];
    expect(classifySaturation(colors)).toBe("vibrant");
  });

  it("returns 'mixed' for mixed chroma", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#f00", oklch: [0.6, 0.2, 30] },
      { role: "b", value: "#ccc", oklch: [0.8, 0.02, 0] },
    ];
    expect(classifySaturation(colors)).toBe("mixed");
  });

  it("returns 'muted' for empty array", () => {
    expect(classifySaturation([])).toBe("muted");
  });

  it("returns 'muted' for colors without oklch", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "var(--x)" },
    ];
    expect(classifySaturation(colors)).toBe("muted");
  });
});

describe("classifyContrast", () => {
  it("returns 'high' for wide lightness range", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#fff", oklch: [0.95, 0, 0] },
      { role: "b", value: "#000", oklch: [0.1, 0, 0] },
    ];
    expect(classifyContrast(colors)).toBe("high");
  });

  it("returns 'low' for narrow lightness range", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#aaa", oklch: [0.5, 0, 0] },
      { role: "b", value: "#bbb", oklch: [0.6, 0, 0] },
    ];
    expect(classifyContrast(colors)).toBe("low");
  });

  it("returns 'moderate' for medium range", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#333", oklch: [0.3, 0, 0] },
      { role: "b", value: "#aaa", oklch: [0.65, 0, 0] },
    ];
    expect(classifyContrast(colors)).toBe("moderate");
  });

  it("returns 'moderate' for fewer than 2 parseable colors", () => {
    const colors: SemanticColor[] = [
      { role: "a", value: "#fff", oklch: [1, 0, 0] },
    ];
    expect(classifyContrast(colors)).toBe("moderate");
  });
});
