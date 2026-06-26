import { describe, expect, it } from "vitest";
import {
  GHOST_BINDING_SCHEMA,
  GhostBindingSchema,
  lintGhostBinding,
} from "../../src/ghost-core/index.js";

function doc(overrides: Record<string, unknown> = {}) {
  return {
    schema: GHOST_BINDING_SCHEMA,
    contract: ".",
    bindings: [{ surface: "checkout", paths: ["apps/checkout"] }],
    ...overrides,
  };
}

describe("GhostBindingSchema", () => {
  it("accepts a minimal in-repo binding", () => {
    expect(GhostBindingSchema.safeParse(doc()).success).toBe(true);
  });

  it("rejects dotted surface ids", () => {
    const result = GhostBindingSchema.safeParse(
      doc({ bindings: [{ surface: "email.marketing", paths: ["a"] }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an entry with no paths", () => {
    const result = GhostBindingSchema.safeParse(
      doc({ bindings: [{ surface: "checkout", paths: [] }] }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects unknown keys", () => {
    const result = GhostBindingSchema.safeParse(doc({ extra: true }));
    expect(result.success).toBe(false);
  });
});

describe("lintGhostBinding", () => {
  it("passes a valid in-repo binding", () => {
    expect(lintGhostBinding(doc()).errors).toBe(0);
  });

  it("accepts an npm-name external contract reference", () => {
    const report = lintGhostBinding(doc({ contract: "@scope/brand" }));
    expect(
      report.issues.some(
        (issue) => issue.rule === "binding-contract-unsupported",
      ),
    ).toBe(false);
  });

  it("errors on a path-like contract reference", () => {
    const report = lintGhostBinding(doc({ contract: "../brand" }));
    expect(
      report.issues.some(
        (issue) => issue.rule === "binding-contract-unsupported",
      ),
    ).toBe(true);
  });

  it("errors when a surface is bound twice", () => {
    const report = lintGhostBinding(
      doc({
        bindings: [
          { surface: "checkout", paths: ["a"] },
          { surface: "checkout", paths: ["b"] },
        ],
      }),
    );
    expect(
      report.issues.some((issue) => issue.rule === "binding-duplicate-surface"),
    ).toBe(true);
  });
});
