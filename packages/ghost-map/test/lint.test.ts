import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lintMap } from "../src/core/lint.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, "fixtures");
const MAPS = resolve(FIXTURES, "maps");

function load(name: string): string {
  return readFileSync(resolve(MAPS, name), "utf-8");
}

function loadFixture(rel: string): string {
  return readFileSync(resolve(FIXTURES, rel), "utf-8");
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

describe("lintMap — platform / build_system arrays", () => {
  it("accepts platform: [...] and build_system: [...] arrays", () => {
    const report = lintMap(
      loadFixture("multi-platform-repo/multi-platform.map.md"),
    );
    expect(report.errors).toBe(0);
  });

  it("rejects an unknown platform value inside an array", () => {
    const raw = loadFixture(
      "multi-platform-repo/multi-platform.map.md",
    ).replace("platform: [ios, android, web]", "platform: [ios, lol]");
    const report = lintMap(raw);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.path?.startsWith("platform"))).toBe(
      true,
    );
  });

  it("rejects an unknown build_system value inside an array", () => {
    const raw = loadFixture(
      "multi-platform-repo/multi-platform.map.md",
    ).replace("build_system: [yarn, gradle, xcode]", "build_system: [yarn, x]");
    const report = lintMap(raw);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.path?.startsWith("build_system"))).toBe(
      true,
    );
  });

  it("accepts the new build_system enum values (style-dictionary, maven, sbt, cmake)", () => {
    // smoke test: each new value parses cleanly when used singly
    for (const value of ["style-dictionary", "maven", "sbt", "cmake"]) {
      const raw = loadFixture(
        "multi-platform-repo/multi-platform.map.md",
      ).replace(
        "build_system: [yarn, gradle, xcode]",
        `build_system: ${value}`,
      );
      const report = lintMap(raw);
      const buildIssues = report.issues.filter((i) =>
        i.path?.startsWith("build_system"),
      );
      expect(buildIssues).toEqual([]);
    }
  });
});

describe("lintMap — design_system token_source + derived_files", () => {
  it("accepts token_source: external + upstream", () => {
    const report = lintMap(loadFixture("external-tokens-repo/external.map.md"));
    expect(report.errors).toBe(0);
  });

  it("accepts derived_files alongside entry_files", () => {
    const report = lintMap(loadFixture("derived-tokens-repo/derived.map.md"));
    expect(report.errors).toBe(0);
  });

  it("warns when token_source: external is set but upstream is missing", () => {
    const raw = loadFixture("external-tokens-repo/external.map.md").replace(
      '  upstream: "@example/design-tokens"\n',
      "",
    );
    const report = lintMap(raw);
    const ruleNames = report.issues.map((i) => i.rule);
    expect(ruleNames).toContain("design-system-upstream-missing");
  });

  it("warns when neither entry_files nor derived_files is present", () => {
    const raw = loadFixture("external-tokens-repo/external.map.md").replace(
      "  derived_files:\n    - src/styles/tokens.css\n",
      "",
    );
    const report = lintMap(raw);
    const rules = report.issues.map((i) => i.rule);
    expect(rules).toContain("design-system-files-missing");
  });
});
