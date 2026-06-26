import { describe, expect, it } from "vitest";
import {
  buildSurfaceMenu,
  GHOST_FINGERPRINT_SCHEMA,
  GHOST_SURFACES_SCHEMA,
  type GhostFingerprintDocument,
  type GhostSurfacesDocument,
  resolveSurfaceSlice,
} from "../../src/ghost-core/index.js";

function surfaces(
  list: GhostSurfacesDocument["surfaces"],
): GhostSurfacesDocument {
  return { schema: GHOST_SURFACES_SCHEMA, surfaces: list };
}

function fingerprint(
  principles: Array<{ id: string; principle: string; surface?: string }>,
): GhostFingerprintDocument {
  return {
    schema: GHOST_FINGERPRINT_SCHEMA,
    intent: {
      summary: {},
      situations: [],
      principles,
      experience_contracts: [],
    },
    inventory: { building_blocks: {}, exemplars: [], sources: [] },
    composition: { patterns: [] },
  };
}

const TREE = surfaces([
  { id: "email", description: "Email.", parent: "core" },
  {
    id: "email-marketing",
    description: "Marketing email.",
    parent: "email",
    edges: [{ kind: "composes", to: "checkout" }],
  },
  { id: "checkout", description: "Checkout.", parent: "core" },
]);

describe("resolveSurfaceSlice", () => {
  it("includes own nodes placed on the surface", () => {
    const slice = resolveSurfaceSlice(
      TREE,
      fingerprint([{ id: "p", principle: "x", surface: "checkout" }]),
      "checkout",
    );
    expect(slice.principles).toHaveLength(1);
    expect(slice.principles[0].provenance).toEqual({ kind: "own" });
  });

  it("cascades ancestor nodes down the tree", () => {
    const slice = resolveSurfaceSlice(
      TREE,
      fingerprint([
        { id: "root", principle: "everywhere", surface: "core" },
        { id: "mid", principle: "email-wide", surface: "email" },
        { id: "leaf", principle: "marketing", surface: "email-marketing" },
      ]),
      "email-marketing",
    );
    const byId = Object.fromEntries(
      slice.principles.map((entry) => [entry.node.id, entry.provenance]),
    );
    expect(byId.leaf).toEqual({ kind: "own" });
    expect(byId.mid).toEqual({ kind: "ancestor", surface: "email" });
    expect(byId.root).toEqual({ kind: "ancestor", surface: "core" });
  });

  it("does not include sibling/descendant nodes", () => {
    const slice = resolveSurfaceSlice(
      TREE,
      fingerprint([
        { id: "leaf", principle: "marketing", surface: "email-marketing" },
      ]),
      "email",
    );
    // email should not pull in its child's nodes via cascade.
    expect(slice.principles.map((entry) => entry.node.id)).not.toContain(
      "leaf",
    );
  });

  it("includes one-hop typed-edge contributions tagged by kind", () => {
    const slice = resolveSurfaceSlice(
      TREE,
      fingerprint([
        { id: "co", principle: "checkout copy", surface: "checkout" },
      ]),
      "email-marketing",
    );
    const co = slice.principles.find((entry) => entry.node.id === "co");
    expect(co?.provenance).toEqual({
      kind: "edge",
      edge: "composes",
      surface: "checkout",
    });
  });

  it("treats unplaced nodes as core (cascades everywhere)", () => {
    const slice = resolveSurfaceSlice(
      TREE,
      fingerprint([{ id: "loose", principle: "no placement" }]),
      "checkout",
    );
    const loose = slice.principles.find((entry) => entry.node.id === "loose");
    expect(loose?.provenance).toEqual({ kind: "ancestor", surface: "core" });
  });

  it("returns an empty-but-valid slice for a surface with no nodes", () => {
    const slice = resolveSurfaceSlice(TREE, fingerprint([]), "checkout");
    expect(slice.surface).toBe("checkout");
    expect(slice.principles).toEqual([]);
  });

  it("works with no surfaces document (core only)", () => {
    const slice = resolveSurfaceSlice(
      undefined,
      fingerprint([{ id: "p", principle: "x", surface: "core" }]),
      "core",
    );
    expect(slice.principles).toHaveLength(1);
    expect(slice.ancestors).toEqual([]);
  });
});

describe("buildSurfaceMenu", () => {
  it("lists surfaces with descriptions and the implicit core, sorted by id", () => {
    const menu = buildSurfaceMenu(TREE);
    expect(menu.map((entry) => entry.id)).toEqual([
      "checkout",
      "core",
      "email",
      "email-marketing",
    ]);
    const core = menu.find((entry) => entry.id === "core");
    expect(core?.description).toBeTruthy();
  });

  it("returns just core when there is no surfaces document", () => {
    const menu = buildSurfaceMenu(undefined);
    expect(menu).toHaveLength(1);
    expect(menu[0].id).toBe("core");
  });

  it("carries edges on the menu entry", () => {
    const menu = buildSurfaceMenu(TREE);
    const marketing = menu.find((entry) => entry.id === "email-marketing");
    expect(marketing?.edges).toEqual([{ kind: "composes", to: "checkout" }]);
  });
});
