import { describe, expect, it } from "vitest";
import {
  ancestorChain,
  assembleGraph,
  GHOST_GRAPH_ROOT_ID,
  type GhostNodeDocument,
} from "../../src/ghost-core/index.js";

function nodeDoc(
  frontmatter: GhostNodeDocument["frontmatter"],
  body = "Prose.",
): GhostNodeDocument {
  return { frontmatter, body };
}

describe("assembleGraph (node + surfaces fold)", () => {
  it("folds authored node files into the graph", () => {
    const graph = assembleGraph({
      nodeFiles: [
        nodeDoc(
          {
            id: "checkout-trust",
            under: "checkout",
            relates: [{ to: "core-trust", as: "reinforces" }],
            incarnation: "web",
          },
          "Reduce felt risk near payment.",
        ),
      ],
    });
    const node = graph.nodes.get("checkout-trust");
    expect(node?.origin).toBe("node-file");
    expect(node?.body).toBe("Reduce felt risk near payment.");
    expect(node?.incarnation).toBe("web");
    expect(node?.relates).toEqual([{ to: "core-trust", as: "reinforces" }]);
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
