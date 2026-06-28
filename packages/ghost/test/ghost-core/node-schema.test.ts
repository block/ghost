import { describe, expect, it } from "vitest";
import {
  GHOST_NODE_RELATION_KINDS,
  type GhostNodeDocument,
  lintGhostNode,
  NodeIdSchema,
  NodeRefSchema,
  parseNode,
  serializeNode,
} from "../../src/ghost-core/node/index.js";

function node(frontmatter: string, body = "Prose body."): string {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe("ghost.node/v1 schema", () => {
  it("parses and validates a minimal node (empty frontmatter)", () => {
    const { node: doc, report } = parseNode(node(""));
    expect(report.errors).toBe(0);
    expect(doc?.body).toBe("Prose body.");
  });

  it("errors when frontmatter is missing", () => {
    const report = lintGhostNode("# just a heading\n\nno frontmatter");
    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("node-missing-frontmatter");
  });

  it("accepts the closed relates qualifier set and rejects unknowns", () => {
    for (const as of GHOST_NODE_RELATION_KINDS) {
      const report = lintGhostNode(
        node(`relates:\n  - to: core\n    as: ${as}`),
      );
      expect(report.errors).toBe(0);
    }
    const bad = lintGhostNode(node("relates:\n  - to: core\n    as: governs"));
    expect(bad.errors).toBeGreaterThan(0);
  });

  it("allows untyped relations (qualifier omitted)", () => {
    const report = lintGhostNode(node("relates:\n  - to: core"));
    expect(report.errors).toBe(0);
  });

  it("accepts an arbitrary incarnation string", () => {
    expect(lintGhostNode(node("incarnation: billboard")).errors).toBe(0);
    expect(lintGhostNode(node("incarnation: voice-kiosk")).errors).toBe(0);
  });

  it("passes through free-form descriptive keys (e.g. audience)", () => {
    // Authors may add descriptive keys; Ghost does not gate on them.
    expect(lintGhostNode(node("audience: enterprise")).errors).toBe(0);
  });

  it("accepts a description (the retrieval payload)", () => {
    expect(lintGhostNode(node("description: Lifecycle email.")).errors).toBe(0);
  });

  it("round-trips through serialize/parse (frontmatter is properties only)", () => {
    const original: GhostNodeDocument = {
      frontmatter: {
        description: "Near payment, reduce felt risk.",
        relates: [
          { to: "core/trust", as: "reinforces" },
          { to: "checkout/density" },
        ],
        incarnation: "web",
      },
      body: "Near payment, reduce felt risk.",
    };
    const reparsed = parseNode(serializeNode(original));
    expect(reparsed.report.errors).toBe(0);
    expect(reparsed.node?.frontmatter).toEqual(original.frontmatter);
    expect(reparsed.node?.body).toBe(original.body);
  });

  it("round-trips an empty-frontmatter node", () => {
    const original: GhostNodeDocument = {
      frontmatter: {},
      body: "Just prose.",
    };
    const reparsed = parseNode(serializeNode(original));
    expect(reparsed.report.errors).toBe(0);
    expect(reparsed.node?.frontmatter).toEqual({});
    expect(reparsed.node?.body).toBe("Just prose.");
  });

  it("preserves the body verbatim, stripping only frontmatter", () => {
    const body = "# Heading\n\n- a list item\n\nA paragraph with `code`.";
    const { node: doc } = parseNode(node("", body));
    expect(doc?.body).toBe(body);
  });
});

describe("node id / ref grammar (path-based identity)", () => {
  it("accepts flat and nested path ids", () => {
    for (const id of [
      "core",
      "checkout",
      "checkout-trust-signals",
      "marketing/email",
      "a/b/c",
      "email.marketing",
    ]) {
      expect(NodeIdSchema.safeParse(id).success).toBe(true);
    }
  });

  it("rejects malformed ids", () => {
    for (const id of [
      "Checkout",
      "-leading",
      "_leading",
      "/leading-slash",
      "trailing-slash/",
      "double//slash",
      "Bad Ref",
    ]) {
      expect(NodeIdSchema.safeParse(id).success).toBe(false);
    }
  });

  it("accepts local path refs and cross-package refs", () => {
    for (const ref of [
      "core",
      "marketing/email",
      "brand:core/trust",
      "brand:core",
    ]) {
      expect(NodeRefSchema.safeParse(ref).success).toBe(true);
    }
  });

  it("rejects malformed refs", () => {
    for (const ref of ["Bad Ref", "/x", "x/", "a//b"]) {
      expect(NodeRefSchema.safeParse(ref).success).toBe(false);
    }
  });
});
