import { describe, expect, it } from "vitest";
import {
  GHOST_NODE_RELATION_KINDS,
  type GhostNodeDocument,
  lintGhostNode,
  parseNode,
  serializeNode,
} from "../../src/ghost-core/node/index.js";

function node(frontmatter: string, body = "Prose body."): string {
  return `---\n${frontmatter}\n---\n\n${body}\n`;
}

describe("ghost.node/v1 schema", () => {
  it("parses and validates a minimal node (id only)", () => {
    const { node: doc, report } = parseNode(node("id: checkout"));
    expect(report.errors).toBe(0);
    expect(doc?.frontmatter.id).toBe("checkout");
    expect(doc?.body).toBe("Prose body.");
  });

  it("accepts dashed and dotted ids (permissive charset)", () => {
    for (const id of ["core", "checkout-trust-signals", "email.marketing"]) {
      expect(lintGhostNode(node(`id: ${id}`)).errors).toBe(0);
    }
  });

  it("rejects only genuinely malformed ids", () => {
    for (const id of ["Checkout", "-leading", "_leading"]) {
      expect(lintGhostNode(node(`id: ${id}`)).errors).toBeGreaterThan(0);
    }
  });

  it("errors when frontmatter is missing", () => {
    const report = lintGhostNode("# just a heading\n\nno frontmatter");
    expect(report.errors).toBe(1);
    expect(report.issues[0]?.rule).toBe("node-missing-frontmatter");
  });

  it("accepts the closed relates qualifier set and rejects unknowns", () => {
    for (const as of GHOST_NODE_RELATION_KINDS) {
      const report = lintGhostNode(
        node(`id: a\nrelates:\n  - to: core\n    as: ${as}`),
      );
      expect(report.errors).toBe(0);
    }
    const bad = lintGhostNode(
      node("id: a\nrelates:\n  - to: core\n    as: governs"),
    );
    expect(bad.errors).toBeGreaterThan(0);
  });

  it("allows untyped relations (qualifier omitted)", () => {
    const report = lintGhostNode(node("id: a\nrelates:\n  - to: core"));
    expect(report.errors).toBe(0);
  });

  it("accepts local and cross-package refs in under/relates", () => {
    const report = lintGhostNode(
      node(
        "id: checkout-trust\nunder: checkout\nrelates:\n  - to: 'brand:core-trust'\n    as: reinforces",
      ),
    );
    expect(report.errors).toBe(0);
  });

  it("rejects malformed refs", () => {
    expect(
      lintGhostNode(node("id: a\nunder: 'Bad Ref'")).errors,
    ).toBeGreaterThan(0);
  });

  it("accepts an arbitrary incarnation string", () => {
    expect(lintGhostNode(node("id: a\nincarnation: billboard")).errors).toBe(0);
    expect(lintGhostNode(node("id: a\nincarnation: voice-kiosk")).errors).toBe(
      0,
    );
  });

  it("passes through free-form descriptive keys (e.g. audience)", () => {
    // Authors may add descriptive keys; Ghost does not gate on them.
    expect(lintGhostNode(node("id: a\naudience: enterprise")).errors).toBe(0);
  });

  it("accepts a description (the retrieval payload)", () => {
    expect(
      lintGhostNode(node("id: email\ndescription: Lifecycle email.")).errors,
    ).toBe(0);
  });

  it("round-trips through serialize/parse", () => {
    const original: GhostNodeDocument = {
      frontmatter: {
        id: "checkout-trust-signals",
        under: "checkout",
        relates: [
          { to: "core-trust", as: "reinforces" },
          { to: "checkout-density" },
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

  it("preserves the body verbatim, stripping only frontmatter", () => {
    const body = "# Heading\n\n- a list item\n\nA paragraph with `code`.";
    const { node: doc } = parseNode(node("id: a", body));
    expect(doc?.body).toBe(body);
  });
});
