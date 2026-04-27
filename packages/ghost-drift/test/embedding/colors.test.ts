import type { SemanticColor } from "@ghost/core";
import {
  classifyContrast,
  classifySaturation,
  contrastScore,
  parseColorToOklch,
  saturationScore,
} from "@ghost/core";
import { describe, expect, it } from "vitest";

describe("parseColorToOklch", () => {
  // --- Hex ---
  it("parses 6-digit hex", () => {
    const result = parseColorToOklch("#ff0000");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0.628, 1); // L
    expect(result?.[1]).toBeGreaterThan(0.2); // C (red is saturated)
  });

  it("parses 3-digit hex", () => {
    const result = parseColorToOklch("#fff");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(1, 1); // L ~1 for white
    expect(result?.[1]).toBeCloseTo(0, 1); // C ~0 for white
  });

  // --- RGB ---
  it("parses rgb()", () => {
    const result = parseColorToOklch("rgb(0, 128, 0)");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeGreaterThan(0.4);
    expect(result?.[1]).toBeGreaterThan(0.1);
  });

  it("parses rgba()", () => {
    const result = parseColorToOklch("rgba(255, 0, 0, 0.5)");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0.628, 1);
  });

  // --- HSL ---
  it("parses hsl()", () => {
    const result = parseColorToOklch("hsl(0, 100%, 50%)");
    expect(result).not.toBeNull();
    // Pure red: same as #ff0000
    expect(result?.[0]).toBeCloseTo(0.628, 1);
    expect(result?.[1]).toBeGreaterThan(0.2);
  });

  it("parses hsla()", () => {
    const result = parseColorToOklch("hsla(120, 100%, 25%, 0.8)");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeGreaterThan(0.3);
  });

  it("parses hsl with deg unit", () => {
    const result = parseColorToOklch("hsl(240deg, 50%, 50%)");
    expect(result).not.toBeNull();
  });

  it("parses hsl with modern space syntax", () => {
    const result = parseColorToOklch("hsl(200 80% 50%)");
    expect(result).not.toBeNull();
  });

  // --- OKLCH ---
  it("parses oklch() with decimal lightness", () => {
    const result = parseColorToOklch("oklch(0.7 0.15 240)");
    expect(result).toEqual([0.7, 0.15, 240]);
  });

  it("parses oklch() with percentage lightness", () => {
    const result = parseColorToOklch("oklch(70% 0.15 240)");
    expect(result).toEqual([0.7, 0.15, 240]);
  });

  // --- color-mix ---
  it("parses color-mix(in oklch, ...)", () => {
    const result = parseColorToOklch(
      "color-mix(in oklch, #ff0000 50%, #0000ff 50%)",
    );
    expect(result).not.toBeNull();
    // Midpoint between red and blue in OKLCH
    expect(result?.[0]).toBeGreaterThan(0.2);
    expect(result?.[1]).toBeGreaterThan(0.1);
  });

  it("parses color-mix with implicit second percentage", () => {
    const result = parseColorToOklch(
      "color-mix(in oklch, #ff0000 75%, #0000ff)",
    );
    expect(result).not.toBeNull();
  });

  // --- Named colors ---
  it("parses named color: white", () => {
    const result = parseColorToOklch("white");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(1, 1);
  });

  it("parses named color: black", () => {
    const result = parseColorToOklch("black");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0, 1);
  });

  it("parses named color: coral", () => {
    const result = parseColorToOklch("coral");
    expect(result).not.toBeNull();
    expect(result?.[1]).toBeGreaterThan(0.1);
  });

  // --- System colors ---
  it("parses system color: Canvas", () => {
    const result = parseColorToOklch("Canvas");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(1, 1); // maps to white
  });

  it("parses system color: CanvasText", () => {
    const result = parseColorToOklch("CanvasText");
    expect(result).not.toBeNull();
    expect(result?.[0]).toBeCloseTo(0, 1); // maps to black
  });

  // --- Skipped values ---
  it("returns null for var()", () => {
    expect(parseColorToOklch("var(--primary)")).toBeNull();
  });

  it("returns null for transparent", () => {
    expect(parseColorToOklch("transparent")).toBeNull();
  });

  it("returns null for currentColor", () => {
    expect(parseColorToOklch("currentColor")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseColorToOklch("not-a-color")).toBeNull();
    expect(parseColorToOklch("")).toBeNull();
    expect(parseColorToOklch("123px")).toBeNull();
  });

  // --- Case insensitivity ---
  it("handles uppercase hex", () => {
    expect(parseColorToOklch("#FF0000")).not.toBeNull();
  });

  it("handles mixed case named colors", () => {
    expect(parseColorToOklch("White")).not.toBeNull();
    expect(parseColorToOklch("BLACK")).not.toBeNull();
  });
});

describe("continuous scoring", () => {
  function makeColors(chromas: number[]): SemanticColor[] {
    return chromas.map((c, i) => ({
      role: `color-${i}`,
      value: "",
      oklch: [0.5, c, 180] as [number, number, number],
    }));
  }

  describe("saturationScore", () => {
    it("returns 0 for no colors", () => {
      expect(saturationScore([])).toBe(0);
    });

    it("returns continuous values", () => {
      const low = saturationScore(makeColors([0.03, 0.04]));
      const mid = saturationScore(makeColors([0.1, 0.12]));
      const high = saturationScore(makeColors([0.2, 0.25]));
      expect(low).toBeLessThan(mid);
      expect(mid).toBeLessThan(high);
    });

    it("caps at 1.0", () => {
      expect(saturationScore(makeColors([0.3, 0.35]))).toBeLessThanOrEqual(1);
    });
  });

  describe("contrastScore", () => {
    function makeContrast(lightnesses: number[]): SemanticColor[] {
      return lightnesses.map((l, i) => ({
        role: `color-${i}`,
        value: "",
        oklch: [l, 0.1, 180] as [number, number, number],
      }));
    }

    it("returns 0.5 for single color", () => {
      expect(contrastScore(makeContrast([0.5]))).toBe(0.5);
    });

    it("returns continuous values", () => {
      const low = contrastScore(makeContrast([0.4, 0.5]));
      const mid = contrastScore(makeContrast([0.2, 0.7]));
      const high = contrastScore(makeContrast([0.05, 0.95]));
      expect(low).toBeLessThan(mid);
      expect(mid).toBeLessThan(high);
    });
  });

  // Verify categorical functions still work (API stability)
  describe("categorical classification (API stability)", () => {
    it("classifySaturation returns valid categories", () => {
      const result = classifySaturation(makeColors([0.2, 0.25]));
      expect(["muted", "vibrant", "mixed"]).toContain(result);
    });

    it("classifyContrast returns valid categories", () => {
      const colors: SemanticColor[] = [
        { role: "a", value: "", oklch: [0.1, 0.1, 0] },
        { role: "b", value: "", oklch: [0.9, 0.1, 0] },
      ];
      const result = classifyContrast(colors);
      expect(["high", "moderate", "low"]).toContain(result);
    });
  });
});
