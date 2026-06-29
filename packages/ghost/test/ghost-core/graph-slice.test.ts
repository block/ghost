import { describe, expect, it } from "vitest";
import {
  assembleGraph,
  type GhostNodeDocument,
  resolveGraphSlice,
} from "../../src/ghost-core/index.js";

function nodeDoc(
  frontmatter: GhostNodeDocument["frontmatter"],
  body = "Prose.",
): GhostNodeDocument {
  return { frontmatter, body };
}

const surfaces = {
  schema: "ghost.surfaces/v1" as const,
  surfaces: [
    { id: "checkout", parent: "core" },
    { id: "payment", parent: "checkout" },
  ],
};

function provenanceOf(slice: ReturnType<typeof resolveGraphSlice>, id: string) {
  return slice.nodes.find((n) => n.id === id)?.provenance;
}

describe("resolveGraphSlice", () => {
  it("tags own, ancestor, and edge provenance", () => {
    const graph = assembleGraph({
      surfaces,
      nodeFiles: [
        nodeDoc({ id: "brand-voice", under: "core" }, "Calm everywhere."),
        nodeDoc(
          {
            id: "checkout-trust",
            under: "checkout",
            relates: [{ to: "density", as: "contrasts" }],
          },
          "Reduce felt risk.",
        ),
        nodeDoc({ id: "density", under: "dashboard" }, "Pack it in."),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");

    expect(provenanceOf(slice, "checkout-trust")).toEqual({ kind: "own" });
    expect(provenanceOf(slice, "brand-voice")).toEqual({
      kind: "ancestor",
      from: "core",
    });
    expect(provenanceOf(slice, "density")).toEqual({
      kind: "edge",
      via: "contrasts",
      from: "checkout-trust",
    });
  });

  it("cascades through multiple ancestor levels", () => {
    const graph = assembleGraph({
      surfaces,
      nodeFiles: [
        nodeDoc({ id: "brand-voice", under: "core" }, "Calm."),
        nodeDoc({ id: "checkout-clarity", under: "checkout" }, "Plain."),
        nodeDoc({ id: "pay-now", under: "payment" }, "One tap."),
      ],
    });
    const slice = resolveGraphSlice(graph, "payment");
    expect(provenanceOf(slice, "pay-now")).toEqual({ kind: "own" });
    expect(provenanceOf(slice, "checkout-clarity")).toEqual({
      kind: "ancestor",
      from: "checkout",
    });
    expect(provenanceOf(slice, "brand-voice")).toEqual({
      kind: "ancestor",
      from: "core",
    });
    expect(slice.ancestors).toEqual(["checkout"]);
  });

  it("filters by incarnation: essence always in, matching in, mismatched out", () => {
    const graph = assembleGraph({
      surfaces,
      nodeFiles: [
        nodeDoc({ id: "brand-voice", under: "core" }, "Calm."), // essence
        nodeDoc(
          { id: "checkout-web", under: "checkout", incarnation: "web" },
          "Inline.",
        ),
        nodeDoc(
          { id: "checkout-mail", under: "checkout", incarnation: "email" },
          "Subject.",
        ),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout", { incarnation: "web" });
    const ids = slice.nodes.map((n) => n.id).sort();
    expect(ids).toContain("brand-voice"); // essence
    expect(ids).toContain("checkout-web"); // matches
    expect(ids).not.toContain("checkout-mail"); // mismatched
    expect(slice.incarnation).toBe("web");
  });

  it("includes every node when no incarnation filter is given", () => {
    const graph = assembleGraph({
      surfaces,
      nodeFiles: [
        nodeDoc(
          { id: "checkout-web", under: "checkout", incarnation: "web" },
          "x",
        ),
        nodeDoc(
          { id: "checkout-mail", under: "checkout", incarnation: "email" },
          "y",
        ),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");
    const ids = slice.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["checkout-mail", "checkout-web"]);
    expect(slice.incarnation).toBeUndefined();
  });

  it("follows relates edges one hop only (no recursion)", () => {
    const graph = assembleGraph({
      surfaces,
      nodeFiles: [
        nodeDoc(
          { id: "a", under: "checkout", relates: [{ to: "b" }] },
          "node a",
        ),
        nodeDoc({ id: "b", under: "dashboard", relates: [{ to: "c" }] }, "b"),
        nodeDoc({ id: "c", under: "dashboard" }, "c"),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");
    const ids = slice.nodes.map((n) => n.id);
    expect(ids).toContain("a"); // own
    expect(ids).toContain("b"); // one hop from a
    expect(ids).not.toContain("c"); // two hops — excluded
  });
});
