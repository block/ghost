import { describe, expect, it } from "vitest";
import { inferSemanticRole } from "../../src/fingerprint/semantic-roles.js";

describe("inferSemanticRole", () => {
  describe("Layer 1: exact match (shadcn)", () => {
    it("maps --primary to primary", () => {
      const result = inferSemanticRole("--primary");
      expect(result).toEqual({ role: "primary", confidence: 1.0 });
    });

    it("maps --foreground to text", () => {
      const result = inferSemanticRole("--foreground");
      expect(result).toEqual({ role: "text", confidence: 1.0 });
    });

    it("maps --card to surface", () => {
      const result = inferSemanticRole("--card");
      expect(result).toEqual({ role: "surface", confidence: 1.0 });
    });

    it("maps --destructive to destructive", () => {
      const result = inferSemanticRole("--destructive");
      expect(result).toEqual({ role: "destructive", confidence: 1.0 });
    });

    it("maps --muted-foreground to muted-foreground", () => {
      const result = inferSemanticRole("--muted-foreground");
      expect(result).toEqual({ role: "muted-foreground", confidence: 1.0 });
    });
  });

  describe("Layer 2: pattern match", () => {
    it("handles MUI-style tokens", () => {
      const result = inferSemanticRole("--mui-palette-primary-main");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("primary");
      expect(result!.confidence).toBe(0.9);
    });

    it("handles Chakra-style tokens", () => {
      const result = inferSemanticRole("--chakra-colors-brand-500");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("brand");
      expect(result!.confidence).toBe(0.9);
    });

    it("handles background patterns", () => {
      const result = inferSemanticRole("--bg-primary");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("surface-primary");
    });

    it("handles error/danger/destructive", () => {
      expect(inferSemanticRole("--color-error")!.role).toBe("destructive");
      expect(inferSemanticRole("--color-danger")!.role).toBe("destructive");
      expect(inferSemanticRole("--color-destructive")!.role).toBe("destructive");
    });

    it("handles warning/caution", () => {
      expect(inferSemanticRole("--color-warning")!.role).toBe("warning");
      expect(inferSemanticRole("--color-caution")!.role).toBe("warning");
    });

    it("handles success/positive", () => {
      expect(inferSemanticRole("--color-success")!.role).toBe("success");
      expect(inferSemanticRole("--color-positive")!.role).toBe("success");
    });

    it("handles accent/highlight", () => {
      expect(inferSemanticRole("--color-accent")!.role).toBe("accent");
      expect(inferSemanticRole("--color-highlight")!.role).toBe("accent");
    });

    it("handles text/foreground patterns", () => {
      const result = inferSemanticRole("--text-secondary");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("text-secondary");
    });

    it("handles border patterns", () => {
      const result = inferSemanticRole("--border-subtle");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("border-subtle");
    });
  });

  describe("Layer 3: keyword extraction", () => {
    it("extracts from custom naming", () => {
      const result = inferSemanticRole("--app-primary-color");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("primary");
      expect(result!.confidence).toBe(0.7);
    });

    it("extracts surface from custom naming", () => {
      const result = inferSemanticRole("--my-surface-color");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("surface");
    });
  });

  describe("Layer 4: value-based heuristic", () => {
    it("classifies near-white as surface", () => {
      const result = inferSemanticRole("--custom-unknown", "#fafafa");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("surface");
      expect(result!.confidence).toBe(0.6);
    });

    it("classifies near-black as text", () => {
      const result = inferSemanticRole("--custom-unknown", "#0a0a0a");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("text");
      expect(result!.confidence).toBe(0.6);
    });

    it("classifies high-chroma as dominant", () => {
      const result = inferSemanticRole("--custom-unknown", "#ff0000");
      expect(result).not.toBeNull();
      expect(result!.role).toBe("dominant");
      expect(result!.confidence).toBe(0.6);
    });

    it("returns null for unknown token with no color value", () => {
      expect(inferSemanticRole("--custom-unknown", "16px")).toBeNull();
    });
  });

  describe("returns null when nothing matches", () => {
    it("returns null for completely unknown token", () => {
      expect(inferSemanticRole("--xyz-abc")).toBeNull();
    });
  });
});
