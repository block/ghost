import { describe, expect, it } from "vitest";
import {
  ancestorChain,
  assembleGraph,
  GHOST_GRAPH_ROOT_ID,
  type PlacedNode,
} from "../../src/ghost-core/index.js";

// Model an index/directory node: its folder is its own id (`a/b/index.md`).
// The root `core` node has folder `""`; every other node's folder is its id.
function placed(
  id: string,
  frontmatter: PlacedNode["doc"]["frontmatter"] = {},
  body = "Prose.",
): PlacedNode {
  const folder = id === GHOST_GRAPH_ROOT_ID ? "" : id;
  return { id, folder, doc: { frontmatter, body } };
}

describe("assembleGraph (directory-tree fold)", () => {
  it("folds placed nodes into the graph", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed(
          "checkout/trust",
          {
            relates: [{ to: "core/trust", as: "reinforces" }],
          },
          "Reduce felt risk near payment.",
        ),
      ],
    });
    const node = graph.nodes.get("checkout/trust");
    expect(node?.origin).toBe("node-file");
    expect(node?.body).toBe("Reduce felt risk near payment.");
    expect(node?.relates).toEqual([{ to: "core/trust", as: "reinforces" }]);
    expect(node?.folder).toBe("checkout/trust");
  });

  it("resolves ancestors from the id alone (no stored containment)", () => {
    const graph = assembleGraph({
      placedNodes: [placed("checkout"), placed("checkout/payment")],
    });
    expect(ancestorChain(graph, "checkout/payment")).toEqual([
      "checkout",
      GHOST_GRAPH_ROOT_ID,
    ]);
    expect(ancestorChain(graph, "checkout")).toEqual([GHOST_GRAPH_ROOT_ID]);
  });

  it("resolves ancestors through intermediate directories with no index node", () => {
    // Only the deep leaf is placed; a/b and a are empty directories. The chain
    // is derived from the id string, so it resolves with no seeded positions.
    const graph = assembleGraph({ placedNodes: [placed("a/b/c")] });
    expect(ancestorChain(graph, "a/b/c")).toEqual([
      "a/b",
      "a",
      GHOST_GRAPH_ROOT_ID,
    ]);
  });

  it("treats the `core` node as the implicit root with an empty chain", () => {
    const graph = assembleGraph({
      placedNodes: [placed("core", {}, "Root prose.")],
    });
    expect(graph.nodes.get(GHOST_GRAPH_ROOT_ID)?.body).toBe("Root prose.");
    expect(ancestorChain(graph, GHOST_GRAPH_ROOT_ID)).toEqual([]);
  });
});
