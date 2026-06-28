import { describe, expect, it } from "vitest";
import {
  assembleGraph,
  type PlacedNode,
  resolveGraphSlice,
} from "../../src/ghost-core/index.js";

function placed(
  id: string,
  parent: string | undefined,
  frontmatter: PlacedNode["doc"]["frontmatter"] = {},
  body = "Prose.",
): PlacedNode {
  return {
    id,
    ...(parent !== undefined ? { parent } : {}),
    doc: { frontmatter, body },
  };
}

function provenanceOf(slice: ReturnType<typeof resolveGraphSlice>, id: string) {
  return slice.nodes.find((n) => n.id === id)?.provenance;
}

describe("resolveGraphSlice", () => {
  it("tags own, ancestor, and edge provenance", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed("brand-voice", "core", {}, "Calm everywhere."),
        placed(
          "checkout/trust",
          "checkout",
          { relates: [{ to: "dashboard/density", as: "contrasts" }] },
          "Reduce felt risk.",
        ),
        placed("dashboard/density", "dashboard", {}, "Pack it in."),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");

    expect(provenanceOf(slice, "checkout/trust")).toEqual({ kind: "own" });
    expect(provenanceOf(slice, "brand-voice")).toEqual({
      kind: "ancestor",
      from: "core",
    });
    expect(provenanceOf(slice, "dashboard/density")).toEqual({
      kind: "edge",
      via: "contrasts",
      from: "checkout/trust",
    });
  });

  it("cascades through multiple ancestor levels", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed("brand-voice", "core", {}, "Calm."),
        placed("checkout", "core", {}, "Checkout surface."),
        placed("checkout/clarity", "checkout", {}, "Plain."),
        placed("checkout/payment", "checkout", {}, "Payment surface."),
        placed("checkout/payment/pay-now", "checkout/payment", {}, "One tap."),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout/payment");
    expect(provenanceOf(slice, "checkout/payment/pay-now")).toEqual({
      kind: "own",
    });
    expect(provenanceOf(slice, "checkout/clarity")).toEqual({
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
      placedNodes: [
        placed("brand-voice", "core", {}, "Calm."), // essence
        placed("checkout/web", "checkout", { incarnation: "web" }, "Inline."),
        placed(
          "checkout/mail",
          "checkout",
          { incarnation: "email" },
          "Subject.",
        ),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout", { incarnation: "web" });
    const ids = slice.nodes.map((n) => n.id).sort();
    expect(ids).toContain("brand-voice"); // essence
    expect(ids).toContain("checkout/web"); // matches
    expect(ids).not.toContain("checkout/mail"); // mismatched
    expect(slice.incarnation).toBe("web");
  });

  it("includes every node when no incarnation filter is given", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed("checkout/web", "checkout", { incarnation: "web" }, "x"),
        placed("checkout/mail", "checkout", { incarnation: "email" }, "y"),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");
    const ids = slice.nodes.map((n) => n.id).sort();
    expect(ids).toEqual(["checkout/mail", "checkout/web"]);
    expect(slice.incarnation).toBeUndefined();
  });

  it("follows relates edges one hop only (no recursion)", () => {
    const graph = assembleGraph({
      placedNodes: [
        placed(
          "checkout/a",
          "checkout",
          { relates: [{ to: "dashboard/b" }] },
          "node a",
        ),
        placed(
          "dashboard/b",
          "dashboard",
          { relates: [{ to: "dashboard/c" }] },
          "b",
        ),
        placed("dashboard/c", "dashboard", {}, "c"),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout");
    const ids = slice.nodes.map((n) => n.id);
    expect(ids).toContain("checkout/a"); // own
    expect(ids).toContain("dashboard/b"); // one hop from a
    expect(ids).not.toContain("dashboard/c"); // two hops — excluded
  });
});
