import { describe, expect, it } from "vitest";
import { lintGhostNode } from "../src/ghost-core/index.js";
import {
  type LegacyPackageInput,
  looksLegacy,
  migratedNodeFiles,
  migrateLegacyPackage,
} from "../src/scan/migrate-legacy.js";

function legacy(): LegacyPackageInput {
  return {
    intent: {
      principles: [
        {
          id: "single-scope",
          principle: "One scope.",
          applies_to: { scopes: ["lending"], paths: ["Code/Lending"] },
        },
        {
          id: "multi-scope",
          principle: "Two scopes.",
          applies_to: { scopes: ["lending", "checkout"] },
        },
        {
          id: "type-only",
          principle: "Surface type only.",
          surface_type: "native-feature",
        },
        { id: "bare", principle: "No coordinates." },
      ],
      experience_contracts: [],
    },
    inventory: {
      topology: {
        scopes: [
          { id: "lending", paths: ["Code/Lending"], surface_types: ["nf"] },
          { id: "checkout", paths: ["Code/Checkout"] },
        ],
        surface_types: ["nf"],
      },
      building_blocks: {},
      exemplars: [
        {
          id: "lending-screen",
          path: "Code/Lending/UI",
          surface_type: "nf",
          scope: "lending",
        },
      ],
      sources: [],
    },
    composition: { patterns: [] },
  };
}

describe("migrateLegacyPackage", () => {
  it("derives surface directories from topology.scopes", () => {
    const { surfaceIds } = migrateLegacyPackage(legacy());
    expect(surfaceIds).toEqual(["lending", "checkout"]);
  });

  it("places single-scope nodes via surface: and strips legacy fields", () => {
    const { intent } = migrateLegacyPackage(legacy());
    const principles = (intent?.principles ?? []) as Array<
      Record<string, unknown>
    >;
    const single = principles.find((p) => p.id === "single-scope");
    expect(single?.surface).toBe("lending");
    expect(single).not.toHaveProperty("applies_to");
    expect(single).not.toHaveProperty("surface_type");
    expect(single).not.toHaveProperty("scope");
  });

  it("places exemplars by their explicit scope", () => {
    const { inventory } = migrateLegacyPackage(legacy());
    const exemplars = (inventory?.exemplars ?? []) as Array<
      Record<string, unknown>
    >;
    expect(exemplars[0].surface).toBe("lending");
    expect(exemplars[0]).not.toHaveProperty("scope");
    expect(exemplars[0]).not.toHaveProperty("surface_type");
  });

  it("leaves multi-scope nodes unplaced and reports them", () => {
    const { intent, notes } = migrateLegacyPackage(legacy());
    const principles = (intent?.principles ?? []) as Array<
      Record<string, unknown>
    >;
    const multi = principles.find((p) => p.id === "multi-scope");
    expect(multi).not.toHaveProperty("surface");
    expect(
      notes.some(
        (n) => n.node_id === "multi-scope" && n.reason === "multiple-scopes",
      ),
    ).toBe(true);
  });

  it("reports surface_type-only nodes as unplaced", () => {
    const { notes } = migrateLegacyPackage(legacy());
    expect(
      notes.some(
        (n) => n.node_id === "type-only" && n.reason === "surface-type-only",
      ),
    ).toBe(true);
  });

  it("drops the topology subtree from inventory", () => {
    const { inventory } = migrateLegacyPackage(legacy());
    expect(inventory).not.toHaveProperty("topology");
  });

  it("does not mutate the input", () => {
    const input = legacy();
    migrateLegacyPackage(input);
    expect(input.inventory).toHaveProperty("topology");
    const principles = input.intent?.principles as Array<
      Record<string, unknown>
    >;
    expect(principles[0]).toHaveProperty("applies_to");
  });

  it("produces a directory tree of parseable nodes", () => {
    const result = migrateLegacyPackage(legacy());

    // The migration emits one prose node per facet entry, plus an index.md per
    // derived surface directory. Placed nodes land under their surface dir.
    const files = migratedNodeFiles(result);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(file.relativePath).toMatch(/\.md$/);
      expect(lintGhostNode(file.content).errors).toBe(0);
    }
    // Each derived surface gets its index.md directory marker.
    expect(files.some((f) => f.relativePath === "lending/index.md")).toBe(true);
    // A single-scope node lands inside its surface directory.
    expect(
      files.some((f) => f.relativePath === "lending/single-scope.md"),
    ).toBe(true);
  });
});

describe("looksLegacy", () => {
  it("detects topology", () => {
    expect(looksLegacy({ inventory: { topology: {} } })).toBe(true);
  });

  it("detects node-level applies_to / surface_type / scope", () => {
    expect(
      looksLegacy({
        intent: { principles: [{ id: "a", applies_to: {} }] },
      }),
    ).toBe(true);
  });

  it("returns false for a clean surface-model package", () => {
    expect(
      looksLegacy({
        intent: { principles: [{ id: "a", surface: "core" }] },
        inventory: { building_blocks: {}, exemplars: [], sources: [] },
        composition: { patterns: [] },
      }),
    ).toBe(false);
  });
});
