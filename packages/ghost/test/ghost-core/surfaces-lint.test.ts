import { describe, expect, it } from "vitest";
import {
  GHOST_SURFACES_SCHEMA,
  lintGhostSurfaces,
} from "../../src/ghost-core/surfaces/index.js";

function doc(surfaces: unknown[]) {
  return { schema: GHOST_SURFACES_SCHEMA, surfaces };
}

function rules(report: { issues: { rule: string }[] }): string[] {
  return report.issues.map((issue) => issue.rule);
}

describe("lintGhostSurfaces", () => {
  it("passes a valid tree with cross-linked edges", () => {
    const report = lintGhostSurfaces(
      doc([
        { id: "core", description: "True everywhere." },
        { id: "email", parent: "core" },
        { id: "email-marketing", parent: "email" },
        {
          id: "checkout",
          parent: "core",
          edges: [
            { kind: "composes", to: "email" },
            { kind: "governed-by", to: "email-marketing" },
          ],
        },
      ]),
    );

    expect(report.issues).toEqual([]);
    expect(report.errors).toBe(0);
  });

  it("allows parent: core without an explicit core surface (implicit root)", () => {
    const report = lintGhostSurfaces(doc([{ id: "email", parent: "core" }]));

    expect(report.errors).toBe(0);
  });

  it("errors on a parent that matches no surface", () => {
    const report = lintGhostSurfaces(
      doc([{ id: "email-marketing", parent: "emial" }]),
    );

    expect(rules(report)).toContain("surface-parent-unknown");
    expect(report.errors).toBeGreaterThan(0);
  });

  it("warns with a near-miss suggestion for an unknown parent close to a real id", () => {
    const report = lintGhostSurfaces(
      doc([
        { id: "email", parent: "core" },
        { id: "marketing", parent: "emial" },
      ]),
    );

    const nearMiss = report.issues.find(
      (issue) => issue.rule === "surface-id-near-miss",
    );
    expect(nearMiss?.severity).toBe("warning");
    expect(nearMiss?.message).toContain("email");
  });

  it("errors when core declares a parent", () => {
    const report = lintGhostSurfaces(doc([{ id: "core", parent: "root" }]));

    expect(rules(report)).toContain("surface-core-reserved");
  });

  it("errors on a parent cycle", () => {
    const report = lintGhostSurfaces(
      doc([
        { id: "a", parent: "b" },
        { id: "b", parent: "a" },
      ]),
    );

    expect(rules(report)).toContain("surface-parent-cycle");
  });

  it("errors on a self-parent", () => {
    const report = lintGhostSurfaces(doc([{ id: "a", parent: "a" }]));

    expect(rules(report)).toContain("surface-parent-cycle");
  });

  it("errors on an edge target that matches no surface", () => {
    const report = lintGhostSurfaces(
      doc([{ id: "checkout", edges: [{ kind: "composes", to: "nope" }] }]),
    );

    expect(rules(report)).toContain("surface-edge-unknown");
  });

  it("allows an edge cycle (edges may form a graph)", () => {
    const report = lintGhostSurfaces(
      doc([
        { id: "a", parent: "core", edges: [{ kind: "composes", to: "b" }] },
        { id: "b", parent: "core", edges: [{ kind: "composes", to: "a" }] },
      ]),
    );

    expect(report.errors).toBe(0);
  });

  it("does not exempt edge targets with the implicit core (edges must point at declared surfaces)", () => {
    const report = lintGhostSurfaces(
      doc([{ id: "checkout", edges: [{ kind: "governed-by", to: "core" }] }]),
    );

    expect(rules(report)).toContain("surface-edge-unknown");
  });

  it("errors on duplicate ids", () => {
    const report = lintGhostSurfaces(
      doc([
        { id: "email", parent: "core" },
        { id: "email", parent: "core" },
      ]),
    );

    expect(rules(report)).toContain("duplicate-id");
  });

  it("reports schema failures as issues rather than throwing", () => {
    const report = lintGhostSurfaces(
      doc([{ id: "email.marketing", parent: "email" }]),
    );

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues[0]?.rule).toContain("schema/");
  });
});
