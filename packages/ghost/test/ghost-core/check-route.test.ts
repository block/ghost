import { describe, expect, it } from "vitest";
import {
  assembleGraph,
  type GhostCheckDocument,
  type PlacedNode,
  selectChecksForSurfaces,
} from "../../src/ghost-core/index.js";

function check(name: string, surface?: string): GhostCheckDocument {
  return {
    frontmatter: {
      name,
      description: `${name} desc`,
      severity: "medium",
      ...(surface ? { surface } : {}),
    },
    body: "## Instructions\nDo the thing.",
  };
}

function placed(id: string, parent: string): PlacedNode {
  return { id, parent, doc: { frontmatter: {}, body: "Prose." } };
}

// The directory tree that establishes the surfaces:
//   checkout/  email/  email/marketing/
const GRAPH = assembleGraph({
  placedNodes: [
    placed("checkout", "core"),
    placed("email", "core"),
    placed("email/marketing", "email"),
  ],
});

const CHECKS = [
  check("brand", "core"),
  check("checkout-color", "checkout"),
  check("email-links", "email"),
  check("marketing-unsub", "email/marketing"),
  check("unplaced"), // governs core
];

function names(routed: ReturnType<typeof selectChecksForSurfaces>): string[] {
  return routed.map((r) => r.check.frontmatter.name).sort();
}

describe("selectChecksForSurfaces", () => {
  it("selects own + ancestor (core) checks for a touched surface", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, ["checkout"]);
    expect(names(routed)).toEqual(["brand", "checkout-color", "unplaced"]);
  });

  it("excludes checks on sibling branches", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, ["checkout"]);
    expect(names(routed)).not.toContain("email-links");
    expect(names(routed)).not.toContain("marketing-unsub");
  });

  it("cascades multiple ancestor levels", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, ["email/marketing"]);
    // own marketing + ancestor email + ancestor core (brand, unplaced)
    expect(names(routed)).toEqual([
      "brand",
      "email-links",
      "marketing-unsub",
      "unplaced",
    ]);
  });

  it("tags provenance own vs. ancestor", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, ["email/marketing"]);
    const byName = Object.fromEntries(
      routed.map((r) => [r.check.frontmatter.name, r.relevance]),
    );
    expect(byName["marketing-unsub"]).toEqual({
      kind: "own",
      surface: "email/marketing",
    });
    expect(byName["email-links"]).toMatchObject({
      kind: "ancestor",
      surface: "email",
      via: "email/marketing",
    });
  });

  it("with no touched surfaces, only core checks apply", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, []);
    expect(names(routed)).toEqual(["brand", "unplaced"]);
  });

  it("an unplaced check governs core and applies to every diff", () => {
    const routed = selectChecksForSurfaces(CHECKS, GRAPH, ["checkout"]);
    expect(names(routed)).toContain("unplaced");
  });
});
