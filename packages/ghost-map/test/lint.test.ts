import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lintMap } from "../src/core/lint.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAPS = resolve(HERE, "fixtures/maps");

function load(name: string): string {
  return readFileSync(resolve(MAPS, name), "utf-8");
}

describe("lintMap", () => {
  it("accepts a well-formed map.md", () => {
    const report = lintMap(load("good.md"));
    expect(report.errors).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it("accepts the canonical map.md fixture at the repo root", () => {
    // Verifies the hand-authored map.md the worktree ships is itself valid.
    const root = resolve(HERE, "../../..");
    const raw = readFileSync(resolve(root, "map.md"), "utf-8");
    const report = lintMap(raw);
    expect(report.errors).toBe(0);
  });

  it("flags missing body sections", () => {
    const report = lintMap(load("missing-section.md"));
    expect(report.errors).toBeGreaterThanOrEqual(2);
    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("body-section-missing");
    const missing = report.issues
      .filter((i) => i.rule === "body-section-missing")
      .map((i) => i.path);
    expect(missing).toContain("Topology");
    expect(missing).toContain("Conventions");
  });

  it("flags frontmatter schema violations", () => {
    const report = lintMap(load("bad-frontmatter.md"));
    expect(report.errors).toBeGreaterThan(0);
    // Schema literal violation on `schema: ghost.map/v0` is the load-bearing
    // signal — surface the rule prefix.
    expect(report.issues.some((i) => i.rule.startsWith("frontmatter:"))).toBe(
      true,
    );
  });

  it("flags out-of-order body sections", () => {
    const report = lintMap(load("out-of-order.md"));
    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("body-section-order");
  });

  it("flags empty body sections", () => {
    const report = lintMap(load("empty-section.md"));
    const empties = report.issues.filter(
      (i) => i.rule === "body-section-empty",
    );
    expect(empties.length).toBeGreaterThanOrEqual(1);
    expect(empties.map((i) => i.path)).toContain("Topology");
  });

  it("flags missing frontmatter entirely", () => {
    const report = lintMap("# just markdown\n\nno frontmatter at all\n");
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues[0]?.rule).toBe("frontmatter-missing");
  });
});
