import { describe, expect, it } from "vitest";
import {
  ancestorChain,
  assembleGraph,
  GHOST_GRAPH_ROOT_ID,
  type PlacedNode,
} from "../../src/ghost-core/index.js";

// Model an index/directory node: its folder is its own id (`a/b/index.md`).
// A parentless node is the root `core` (folder ``).
function placed(
  id: string,
  parent: string | undefined,
  frontmatter: PlacedNode["doc"]["frontmatter"] = {},
  body = "Prose.",
): PlacedNode {
  const folder = parent === undefined ? "" : id;
  return {
    id,
    ...(parent !== undefined ? { parent } : {}),
    folder,
    doc: { frontmatter, body },
  };
}

describe("assembleGraph (directory-tree fold)", () => {
  it("folds placed nodes into the graph", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed(
          "checkout/trust",
          "checkout",
          {
            relates: [{ to: "core/trust", as: "reinforces" }],
            incarnation: "web",
          },
          "Reduce felt risk near payment.",
        ),
      ],
    });
    const node = graph.nodes.get("checkout/trust");
    expect(node?.origin).toBe("node-file");
    expect(node?.body).toBe("Reduce felt risk near payment.");
    expect(node?.incarnation).toBe("web");
    expect(node?.relates).toEqual([{ to: "core/trust", as: "reinforces" }]);
    expect(node?.parent).toBe("checkout");
  });

  it("seeds the containment tree from directory parents and resolves ancestors", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed("checkout", "core"),
        placed("checkout/payment", "checkout"),
      ],
    });
    expect(graph.parents.get("checkout/payment")).toBe("checkout");
    expect(graph.parents.get("checkout")).toBe(GHOST_GRAPH_ROOT_ID);
    expect(ancestorChain(graph, "checkout/payment")).toEqual([
      "checkout",
      GHOST_GRAPH_ROOT_ID,
    ]);
  });

  it("seeds intermediate directories that have no index node", () => {
    // Only the deep leaf is placed; a/b and a are empty directories.
    const graph = assembleGraph({
      placedNodes: [placed("a/b/c", "a/b")],
    });
    expect(ancestorChain(graph, "a/b/c")).toEqual([
      "a/b",
      "a",
      GHOST_GRAPH_ROOT_ID,
    ]);
  });

  it("treats a parentless node as the implicit core root", () => {
    const graph = assembleGraph({
      placedNodes: [placed("core", undefined, {}, "Root prose.")],
    });
    expect(graph.nodes.get(GHOST_GRAPH_ROOT_ID)?.body).toBe("Root prose.");
  });

  it("records children for downward traversal", () => {
    const graph = assembleGraph({
      placedNodes: [placed("checkout", "core"), placed("email", "core")],
    });
    expect(graph.children.get(GHOST_GRAPH_ROOT_ID)?.sort()).toEqual([
      "checkout",
      "email",
    ]);
  });
});
