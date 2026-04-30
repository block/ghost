import { describe, expect, it } from "vitest";
import {
  CANONICAL_DECISION_DIMENSIONS,
  closestCanonical,
  isCanonicalDimension,
  resolveDecisionKind,
} from "../src/decision-vocabulary.js";

describe("CANONICAL_DECISION_DIMENSIONS", () => {
  it("contains the documented 12 dimensions", () => {
    expect(CANONICAL_DECISION_DIMENSIONS).toHaveLength(12);
    expect(CANONICAL_DECISION_DIMENSIONS).toContain("color-strategy");
    expect(CANONICAL_DECISION_DIMENSIONS).toContain("font-sourcing");
  });

  it("has no duplicates", () => {
    const set = new Set(CANONICAL_DECISION_DIMENSIONS);
    expect(set.size).toBe(CANONICAL_DECISION_DIMENSIONS.length);
  });
});

describe("isCanonicalDimension", () => {
  it("accepts every canonical slug", () => {
    for (const slug of CANONICAL_DECISION_DIMENSIONS) {
      expect(isCanonicalDimension(slug)).toBe(true);
    }
  });

  it("rejects unknown slugs", () => {
    expect(isCanonicalDimension("warm-neutrals")).toBe(false);
    expect(isCanonicalDimension("color-system")).toBe(false);
  });

  it("normalizes whitespace and underscores before checking", () => {
    expect(isCanonicalDimension("color_strategy")).toBe(true);
    expect(isCanonicalDimension("  Color-Strategy  ")).toBe(true);
  });
});

describe("closestCanonical", () => {
  it("returns the slug itself when already canonical", () => {
    expect(closestCanonical("color-strategy")).toBe("color-strategy");
    expect(closestCanonical("motion")).toBe("motion");
  });

  it("resolves direct synonyms", () => {
    expect(closestCanonical("color-system")).toBe("color-strategy");
    expect(closestCanonical("palette-strategy")).toBe("color-strategy");
    expect(closestCanonical("type-stack")).toBe("typography-voice");
    expect(closestCanonical("radius-philosophy")).toBe("shape-language");
    expect(closestCanonical("corner-treatment")).toBe("shape-language");
    expect(closestCanonical("shadow-system")).toBe("elevation");
    expect(closestCanonical("theme-system")).toBe("theming-architecture");
  });

  it("falls back to token affinity for novel slugs", () => {
    expect(closestCanonical("color-cadence")).toBe("color-strategy");
    expect(closestCanonical("custom-shadow-language")).toBe("elevation");
    expect(closestCanonical("fancy-motion-rules")).toBe("motion");
  });

  it("returns null when no canonical wins clearly", () => {
    expect(closestCanonical("entirely-novel-decision")).toBeNull();
    expect(closestCanonical("")).toBeNull();
  });

  it("returns null on a tie between dimensions", () => {
    // "color" → color-strategy, "shadow" → elevation: tied at 1 each
    expect(closestCanonical("color-shadow")).toBeNull();
  });

  it("normalizes input before matching", () => {
    expect(closestCanonical("Color_Strategy")).toBe("color-strategy");
    expect(closestCanonical("  shadow_system  ")).toBe("elevation");
  });
});

describe("resolveDecisionKind", () => {
  it("prefers explicit dimension_kind when canonical", () => {
    expect(
      resolveDecisionKind({
        dimension: "system-color-deference",
        dimension_kind: "color-strategy",
      }),
    ).toBe("color-strategy");
  });

  it("falls back to dimension when canonical and kind absent", () => {
    expect(resolveDecisionKind({ dimension: "shape-language" })).toBe(
      "shape-language",
    );
  });

  it("returns null when neither is canonical", () => {
    expect(resolveDecisionKind({ dimension: "warm-neutrals" })).toBeNull();
    expect(
      resolveDecisionKind({
        dimension: "warm-neutrals",
        dimension_kind: "also-not-canonical",
      }),
    ).toBeNull();
  });

  it("ignores a non-canonical kind even when dimension is canonical", () => {
    // dimension_kind is opt-in metadata; if author typoed it, fall through
    // to the dimension itself rather than silently failing rollup.
    expect(
      resolveDecisionKind({
        dimension: "color-strategy",
        dimension_kind: "typo-here",
      }),
    ).toBe("color-strategy");
  });
});
