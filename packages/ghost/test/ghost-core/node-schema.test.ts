import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type GhostNodeDocument,
  lintGhostNode,
  NodeIdSchema,
  NodeRefSchema,
  parseNode,
  serializeNode,
} from "../../src/ghost-core/node/index.js";

const REPO_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

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

  it("rejects the removed `relates` key (edges are gone)", () => {
    const report = lintGhostNode(node("relates:\n  - to: core"));
    expect(report.errors).toBeGreaterThan(0);
  });

  it("passes through free-form descriptive keys (e.g. audience)", () => {
    // Authors may add descriptive keys; ghost does not gate on them.
    expect(lintGhostNode(node("audience: enterprise")).errors).toBe(0);
  });

  it("accepts a description (the retrieval payload)", () => {
    expect(lintGhostNode(node("description: Lifecycle email.")).errors).toBe(0);
  });

  it("round-trips through serialize/parse (frontmatter is properties only)", () => {
    const original: GhostNodeDocument = {
      frontmatter: {
        description: "Near payment, reduce felt risk.",
      },
      body: "Near payment, reduce felt risk.",
    };
    const reparsed = parseNode(serializeNode(original));
    expect(reparsed.report.errors).toBe(0);
    expect(reparsed.node?.frontmatter).toEqual(original.frontmatter);
    expect(reparsed.node?.body).toBe(original.body);
  });

  it("round-trips complete frontmatter through serialize/parse", () => {
    const original = {
      frontmatter: {
        description: "Checkout trust signals.",
        materials: [
          "src/components/checkout/**",
          "https://example.com/logo.svg",
        ],
        audience: "enterprise",
        stage: "purchase",
      },
      body: "# Trust signals\n\nNear payment, reduce felt risk.",
    } satisfies GhostNodeDocument;
    const reparsed = parseNode(serializeNode(original));
    expect(reparsed.report.errors).toBe(0);
    expect(reparsed.node?.frontmatter).toEqual(original.frontmatter);
    expect(reparsed.node?.body).toBe(original.body);
  });

  it("serializes free-form frontmatter keys deterministically after known keys", () => {
    const serialized = serializeNode({
      frontmatter: {
        stage: "purchase",
        description: "Checkout trust signals.",
        audience: "enterprise",
        materials: ["src/components/checkout/**"],
      },
      body: "Near payment, reduce felt risk.",
    } satisfies GhostNodeDocument);

    expect(serialized).toMatchInlineSnapshot(`
      "---
      description: Checkout trust signals.
      materials:
        - src/components/checkout/**
      audience: enterprise
      stage: purchase
      ---

      Near payment, reduce felt risk.
      "
    `);
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

  it("retains materials when serializing a parsed real fixture", () => {
    const raw = readFileSync(
      resolve(REPO_ROOT, "packages/vessel-light/.ghost/signature.shape.md"),
      "utf8",
    );
    const { node: doc, report } = parseNode(raw);
    expect(report.errors).toBe(0);
    expect(doc).not.toBeNull();

    const reparsed = parseNode(serializeNode(doc as GhostNodeDocument));
    expect(reparsed.report.errors).toBe(0);
    expect(reparsed.node?.frontmatter.materials).toEqual([
      "materials/tokens.css",
      "materials/primitives.css",
    ]);
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

  it("accepts local path refs", () => {
    for (const ref of ["core", "marketing/email"]) {
      expect(NodeRefSchema.safeParse(ref).success).toBe(true);
    }
  });

  it("rejects malformed refs (including cross-package colon refs)", () => {
    for (const ref of [
      "Bad Ref",
      "/x",
      "x/",
      "a//b",
      "brand:core/trust",
      "brand:core",
    ]) {
      expect(NodeRefSchema.safeParse(ref).success).toBe(false);
    }
  });
});
