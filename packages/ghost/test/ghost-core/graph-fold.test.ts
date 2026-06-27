import { describe, expect, it } from "vitest";
import {
  ancestorChain,
  assembleGraph,
  GHOST_GRAPH_ROOT_ID,
  type GhostFingerprintDocument,
  type GhostNodeDocument,
} from "../../src/ghost-core/index.js";

function emptyFingerprint(
  over: Partial<{
    situations: GhostFingerprintDocument["intent"]["situations"];
    principles: GhostFingerprintDocument["intent"]["principles"];
    experience_contracts: GhostFingerprintDocument["intent"]["experience_contracts"];
    exemplars: GhostFingerprintDocument["inventory"]["exemplars"];
    patterns: GhostFingerprintDocument["composition"]["patterns"];
  }> = {},
): GhostFingerprintDocument {
  return {
    schema: "ghost.fingerprint/v1",
    intent: {
      summary: {},
      situations: over.situations ?? [],
      principles: over.principles ?? [],
      experience_contracts: over.experience_contracts ?? [],
    },
    inventory: {
      building_blocks: {},
      exemplars: over.exemplars ?? [],
      sources: [],
    },
    composition: { patterns: over.patterns ?? [] },
  } as GhostFingerprintDocument;
}

function nodeDoc(
  frontmatter: GhostNodeDocument["frontmatter"],
  body = "Prose.",
): GhostNodeDocument {
  return { frontmatter, body };
}

describe("assembleGraph (Phase 2 fold)", () => {
  it("projects facet entries into prose nodes (lossy)", () => {
    const graph = assembleGraph({
      fingerprint: emptyFingerprint({
        principles: [
          { id: "brand-voice", principle: "Warm everywhere.", surface: "core" },
          {
            id: "checkout-clarity",
            principle: "Checkout copy is plain.",
            surface: "checkout",
          },
        ],
      }),
    });
    expect(graph.nodes.get("brand-voice")?.body).toBe("Warm everywhere.");
    expect(graph.nodes.get("brand-voice")?.origin).toBe("facet-projection");
    expect(graph.nodes.get("checkout-clarity")?.under).toBe("checkout");
  });

  it("folds authored node files into the graph", () => {
    const graph = assembleGraph({
      nodeFiles: [
        nodeDoc(
          {
            id: "checkout-trust",
            under: "checkout",
            relates: [{ to: "core-trust", as: "reinforces" }],
            medium: "web",
          },
          "Reduce felt risk near payment.",
        ),
      ],
    });
    const node = graph.nodes.get("checkout-trust");
    expect(node?.origin).toBe("node-file");
    expect(node?.body).toBe("Reduce felt risk near payment.");
    expect(node?.medium).toBe("web");
    expect(node?.relates).toEqual([{ to: "core-trust", as: "reinforces" }]);
  });

  it("lets an authored node win over a same-id facet projection", () => {
    const graph = assembleGraph({
      fingerprint: emptyFingerprint({
        principles: [
          {
            id: "checkout-trust",
            principle: "projected text",
            surface: "core",
          },
        ],
      }),
      nodeFiles: [nodeDoc({ id: "checkout-trust" }, "authored text")],
    });
    const node = graph.nodes.get("checkout-trust");
    expect(node?.origin).toBe("node-file");
    expect(node?.body).toBe("authored text");
  });

  it("seeds the containment tree from surfaces and resolves ancestors", () => {
    const graph = assembleGraph({
      surfaces: {
        schema: "ghost.surfaces/v1",
        surfaces: [
          { id: "checkout", parent: "core" },
          { id: "payment", parent: "checkout" },
        ],
      },
    });
    expect(graph.parents.get("payment")).toBe("checkout");
    expect(graph.parents.get("checkout")).toBe(GHOST_GRAPH_ROOT_ID);
    expect(ancestorChain(graph, "payment")).toEqual([
      "checkout",
      GHOST_GRAPH_ROOT_ID,
    ]);
  });

  it("attaches an under-less node to the implicit core root", () => {
    const graph = assembleGraph({
      nodeFiles: [nodeDoc({ id: "top-level" })],
    });
    expect(ancestorChain(graph, "top-level")).toEqual([GHOST_GRAPH_ROOT_ID]);
  });

  it("yields a graph from facets alone (existing packages migrate free)", () => {
    const graph = assembleGraph({
      fingerprint: emptyFingerprint({
        patterns: [
          {
            id: "progressive-disclosure",
            kind: "structure",
            pattern: "Reveal on demand.",
            surface: "item-detail",
          },
        ],
      }),
      surfaces: {
        schema: "ghost.surfaces/v1",
        surfaces: [{ id: "item-detail", parent: "core" }],
      },
    });
    expect(graph.nodes.has("progressive-disclosure")).toBe(true);
    expect(graph.parents.get("item-detail")).toBe(GHOST_GRAPH_ROOT_ID);
  });

  it("records children for downward traversal", () => {
    const graph = assembleGraph({
      surfaces: {
        schema: "ghost.surfaces/v1",
        surfaces: [
          { id: "checkout", parent: "core" },
          { id: "email", parent: "core" },
        ],
      },
    });
    expect(graph.children.get(GHOST_GRAPH_ROOT_ID)?.sort()).toEqual([
      "checkout",
      "email",
    ]);
  });
});
