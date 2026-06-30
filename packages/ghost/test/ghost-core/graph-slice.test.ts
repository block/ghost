import { describe, expect, it } from "vitest";
import {
  assembleGraph,
  type PlacedNode,
  resolveGraphSlice,
} from "../../src/ghost-core/index.js";

/**
 * Model a node the way the loader does. `folder` is the file's directory, the
 * unit of containment:
 * - a root file (`voice.md`)        → parent `core`,   folder ``.
 * - a directory index (`a/index.md`)→ parent of `a`,   folder `a`.
 * - a leaf (`a/b.md`)               → parent `a`,       folder `a`.
 */
function root(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
): PlacedNode {
  return { id, parent: "core", folder: "", doc: { frontmatter: fm, body: id } };
}
function dir(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
): PlacedNode {
  const slash = id.lastIndexOf("/");
  const parent = slash === -1 ? "core" : id.slice(0, slash);
  return { id, parent, folder: id, doc: { frontmatter: fm, body: id } };
}
function leaf(
  id: string,
  fm: PlacedNode["doc"]["frontmatter"] = {},
): PlacedNode {
  const slash = id.lastIndexOf("/");
  const folder = slash === -1 ? "" : id.slice(0, slash);
  const parent = folder === "" ? "core" : folder;
  return { id, parent, folder, doc: { frontmatter: fm, body: id } };
}

function provenanceOf(slice: ReturnType<typeof resolveGraphSlice>, id: string) {
  return slice.nodes.find((n) => n.id === id)?.provenance;
}
const bodyIds = (slice: ReturnType<typeof resolveGraphSlice>) =>
  slice.nodes.map((n) => n.id).sort();
const pointerIds = (slice: ReturnType<typeof resolveGraphSlice>) =>
  slice.pointers.map((s) => s.id).sort();

describe("resolveGraphSlice: path nodes + related pointers", () => {
  // A cash-ios-shaped fixture: globals at root, a design-system node (arcade),
  // and two separate feature subtrees. The `features` module declares the
  // Arcade dependency once, for all its children.
  function cashGraph() {
    return assembleGraph({
      placedNodes: [
        root("core"), // root index.md
        root("trust"),
        root("accessibility"),
        dir("arcade", { description: "Design system." }),
        leaf("arcade/color", { description: "Color tokens." }),
        leaf("arcade/motion", { description: "Motion." }),
        dir("arcade/components", { description: "Components." }),
        leaf("arcade/components/button", { description: "Button." }),
        dir("features", { relates: [{ to: "arcade", as: "reinforces" }] }),
        dir("features/bitcoin"),
        leaf("features/bitcoin/invariants", {
          description: "Non-negotiables.",
        }),
        dir("features/bitcoin/buy"),
        leaf("features/bitcoin/buy/confirm"),
        leaf("features/bitcoin/buy/review"),
        dir("features/bitcoin/education"),
        dir("features/lending"),
        leaf("features/lending/invariants"),
        dir("features/banking"),
        leaf("features/banking/paychecks"),
      ],
    });
  }

  it("1. a sibling folder never leaks in", () => {
    const slice = resolveGraphSlice(
      cashGraph(),
      "features/bitcoin/buy/confirm",
    );
    const ids = bodyIds(slice);
    // Off-path siblings: other features, the design system, sibling sub-areas.
    expect(ids).not.toContain("features/banking");
    expect(ids).not.toContain("features/banking/paychecks");
    expect(ids).not.toContain("features/lending");
    expect(ids).not.toContain("features/bitcoin/education");
    // And not even as pointers: the exclusion is total.
    expect(pointerIds(slice)).not.toContain("features/banking");
    expect(pointerIds(slice)).not.toContain("features/lending");
  });

  it("2. an ancestor's relates propagates down to a deep leaf", () => {
    const slice = resolveGraphSlice(
      cashGraph(),
      "features/bitcoin/buy/confirm",
    );
    // `features` declares the Arcade dependency; a screen 3 levels deeper
    // inherits it via the path → edge route.
    expect(provenanceOf(slice, "arcade")).toEqual({
      kind: "edge",
      via: "reinforces",
      from: "features",
    });
  });

  it("3. an edge to a node offers that node's subtree as pointers", () => {
    const slice = resolveGraphSlice(
      cashGraph(),
      "features/bitcoin/buy/confirm",
    );
    const relatedPointers = slice.pointers
      .filter((s) => s.kind === "related")
      .map((s) => s.id)
      .sort();
    expect(relatedPointers).toEqual([
      "arcade/color",
      "arcade/components",
      "arcade/components/button",
      "arcade/motion",
    ]);
    // The related node's body itself is a full-body edge node, not a pointer.
    expect(pointerIds(slice)).not.toContain("arcade");
  });

  it("4. a loose file in a path folder cascades full-body (invariants)", () => {
    const slice = resolveGraphSlice(
      cashGraph(),
      "features/bitcoin/buy/confirm",
    );
    // `features/bitcoin/invariants` is a plain file in folder features/bitcoin,
    // which is on the path, so it is inherited as a full body.
    expect(provenanceOf(slice, "features/bitcoin/invariants")).toEqual({
      kind: "ancestor",
      from: "features/bitcoin",
    });
    // Globals (root files) reach everywhere.
    expect(provenanceOf(slice, "trust")).toEqual({
      kind: "ancestor",
      from: "core",
    });
    expect(provenanceOf(slice, "accessibility")).toEqual({
      kind: "ancestor",
      from: "core",
    });
  });

  it("5. descendants appear as pointers, not full bodies", () => {
    const slice = resolveGraphSlice(cashGraph(), "features/bitcoin");
    const descendants = slice.pointers
      .filter((s) => s.kind === "descendant")
      .map((s) => s.id)
      .sort();
    expect(descendants).toEqual([
      "features/bitcoin/buy",
      "features/bitcoin/buy/confirm",
      "features/bitcoin/buy/review",
      "features/bitcoin/education",
    ]);
    // A descendant is a pointer, never a full body.
    expect(bodyIds(slice)).not.toContain("features/bitcoin/buy/confirm");
    // A descendant pointer carries its description for agent selection.
    const buy = slice.pointers.find((s) => s.id === "features/bitcoin/buy");
    expect(buy?.kind).toBe("descendant");
  });

  it("6. same-folder files co-occur as own (a folder is one surface)", () => {
    const slice = resolveGraphSlice(
      cashGraph(),
      "features/bitcoin/buy/confirm",
    );
    // confirm.md and review.md share folder features/bitcoin/buy — both `own`.
    expect(provenanceOf(slice, "features/bitcoin/buy/confirm")).toEqual({
      kind: "own",
    });
    expect(provenanceOf(slice, "features/bitcoin/buy/review")).toEqual({
      kind: "own",
    });
  });

  it("edges follow one hop only — no recursion", () => {
    const graph = assembleGraph({
      placedNodes: [
        leaf("checkout/a", { relates: [{ to: "dashboard/b" }] }),
        leaf("dashboard/b", { relates: [{ to: "dashboard/c" }] }),
        leaf("dashboard/c"),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout/a");
    const ids = bodyIds(slice);
    expect(ids).toContain("checkout/a"); // own
    expect(ids).toContain("dashboard/b"); // one hop
    expect(ids).not.toContain("dashboard/c"); // two hops — excluded
  });

  it("filters full-body nodes by incarnation; essence always passes", () => {
    const graph = assembleGraph({
      placedNodes: [
        root("voice"), // essence
        leaf("checkout/web", { incarnation: "web" }),
        leaf("checkout/mail", { incarnation: "email" }),
      ],
    });
    const slice = resolveGraphSlice(graph, "checkout/web", {
      incarnation: "web",
    });
    const ids = bodyIds(slice);
    expect(ids).toContain("voice"); // essence
    expect(ids).toContain("checkout/web"); // matches
    expect(ids).not.toContain("checkout/mail"); // mismatched
    expect(slice.incarnation).toBe("web");
  });
});
