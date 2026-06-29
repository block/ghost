import { describe, expect, it } from "vitest";
import {
  GHOST_SURFACES_SCHEMA,
  GhostSurfacesSchema,
} from "../../src/ghost-core/surfaces/index.js";

describe("ghost.surfaces/v1", () => {
  it("accepts a minimal document and defaults surfaces to []", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
    });

    expect(result.success).toBe(true);
    if (!result.success) throw new Error("minimal surfaces.yml should parse");
    expect(result.data).toEqual({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [],
    });
  });

  it("accepts a realistic tree (id + parent + optional description)", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [
        { id: "core", description: "True everywhere." },
        { id: "email", description: "Lifecycle email.", parent: "core" },
        { id: "email-marketing", parent: "email" },
        { id: "checkout", parent: "core" },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a dotted id (the tree lives only in parent)", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [{ id: "email.marketing", parent: "email" }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error("dotted id must be rejected");
    expect(result.error.issues[0]?.message).toContain("flat slug");
  });

  it("rejects a parent given as an array (single parent only)", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [{ id: "email-marketing", parent: ["email", "marketing"] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown surface key (strict; edges are gone)", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [
        { id: "checkout", edges: [{ kind: "composes", to: "payments" }] },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects an unknown top-level key (strict)", () => {
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [],
      routes: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a parent that does not exist as a surface", () => {
    // INTENTIONAL: dangling-reference detection is a lint concern, not a schema
    // concern. Zod validates a position in isolation and cannot see the tree.
    const result = GhostSurfacesSchema.safeParse({
      schema: GHOST_SURFACES_SCHEMA,
      surfaces: [{ id: "checkout", parent: "nonexistent" }],
    });

    expect(result.success).toBe(true);
  });
});
