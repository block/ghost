import { describe, expect, it } from "vitest";
import {
  GHOST_FINGERPRINT_SCHEMA,
  GHOST_SURFACES_SCHEMA,
  type GhostFingerprintDocument,
  type GhostSurfacesDocument,
  groundSurface,
} from "../../src/ghost-core/index.js";

const SURFACES: GhostSurfacesDocument = {
  schema: GHOST_SURFACES_SCHEMA,
  surfaces: [{ id: "checkout", parent: "core" }],
};

function fingerprint(): GhostFingerprintDocument {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    intent: {
      summary: {},
      situations: [],
      principles: [
        { id: "brand", principle: "Warm everywhere.", surface: "core" },
        {
          id: "co-clarity",
          principle: "Checkout is plain.",
          surface: "checkout",
        },
      ],
      experience_contracts: [],
    },
    inventory: {
      building_blocks: {},
      exemplars: [
        {
          id: "good-checkout",
          path: "apps/checkout/good.tsx",
          title: "Good checkout",
          surface: "checkout",
        },
        { id: "elsewhere", path: "x.tsx", surface: "email" },
      ],
      sources: [],
    },
    composition: {
      patterns: [
        {
          id: "co-token",
          kind: "visual",
          pattern: "Tokens.",
          surface: "checkout",
        },
      ],
    },
  };
}

describe("groundSurface", () => {
  it("projects principles/contracts into why, with inheritance", () => {
    const g = groundSurface(SURFACES, fingerprint(), "checkout");
    const refs = g.why.map((i) => i.ref);
    expect(refs).toContain("intent.principle:co-clarity"); // own
    expect(refs).toContain("intent.principle:brand"); // inherited from core
  });

  it("projects patterns and exemplars into what, with paths", () => {
    const g = groundSurface(SURFACES, fingerprint(), "checkout");
    const pattern = g.what.find((i) => i.kind === "pattern");
    const exemplar = g.what.find((i) => i.kind === "exemplar");
    expect(pattern?.ref).toBe("composition.pattern:co-token");
    expect(exemplar?.ref).toBe("inventory.exemplar:good-checkout");
    expect(exemplar?.path).toBe("apps/checkout/good.tsx");
  });

  it("tags inherited grounding by provenance", () => {
    const g = groundSurface(SURFACES, fingerprint(), "checkout");
    const brand = g.why.find((i) => i.ref === "intent.principle:brand");
    expect(brand?.provenance).toEqual({ kind: "ancestor", surface: "core" });
  });

  it("excludes nodes from sibling surfaces", () => {
    const g = groundSurface(SURFACES, fingerprint(), "checkout");
    expect(g.what.map((i) => i.ref)).not.toContain(
      "inventory.exemplar:elsewhere",
    );
  });

  it("returns an empty-but-valid grounding for a surface with no nodes", () => {
    const empty: GhostFingerprintDocument = {
      schema: GHOST_FINGERPRINT_SCHEMA,
      intent: {
        summary: {},
        situations: [],
        principles: [],
        experience_contracts: [],
      },
      inventory: { building_blocks: {}, exemplars: [], sources: [] },
      composition: { patterns: [] },
    };
    const g = groundSurface(SURFACES, empty, "checkout");
    expect(g.surface).toBe("checkout");
    expect(g.why).toEqual([]);
    expect(g.what).toEqual([]);
  });
});
