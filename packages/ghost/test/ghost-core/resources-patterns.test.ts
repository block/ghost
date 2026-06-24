import { describe, expect, it } from "vitest";
import { lintGhostPatterns, lintGhostResources } from "#ghost-core";

describe("ghost.resources/v1", () => {
  it("accepts a root resource ledger", () => {
    const report = lintGhostResources({
      schema: "ghost.resources/v1",
      id: "local",
      primary: { target: ".", paths: ["."] },
      design_system: [{ id: "ui", target: "../ghost-ui", paths: ["src"] }],
      surfaces: [{ id: "settings", locator: "/settings", paths: ["src"] }],
      include: ["src/**"],
      exclude: ["**/node_modules/**"],
    });

    expect(report.errors).toBe(0);
  });

  it("rejects duplicate resource ids", () => {
    const report = lintGhostResources({
      schema: "ghost.resources/v1",
      id: "local",
      primary: { id: "ui", target: "." },
      design_system: [{ id: "ui", target: "../ghost-ui" }],
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some((issue) => issue.rule === "resource-id-duplicate"),
    ).toBe(true);
  });
});

describe("ghost.patterns/v1", () => {
  it("accepts surface types and composition patterns", () => {
    const report = lintGhostPatterns({
      schema: "ghost.patterns/v1",
      id: "local",
      surface_types: [
        {
          id: "settings",
          preferred_patterns: ["sectioned-form"],
          evidence: [{ surface_id: "surface_1" }],
        },
      ],
      composition_patterns: [
        {
          id: "sectioned-form",
          surface_types: ["settings"],
          frequency: 3,
          confidence: 0.8,
          anatomy: {
            ordered: ["shell", "header", "sections", "actions"],
            required: ["sections"],
          },
          evidence: [{ surface_id: "surface_1", locator: "/settings" }],
        },
      ],
    });

    expect(report.errors).toBe(0);
  });

  it("rejects unknown pattern references", () => {
    const report = lintGhostPatterns({
      schema: "ghost.patterns/v1",
      id: "local",
      surface_types: [{ id: "settings", preferred_patterns: ["missing"] }],
      composition_patterns: [],
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some(
        (issue) => issue.rule === "surface-type-pattern-unknown",
      ),
    ).toBe(true);
  });
});
