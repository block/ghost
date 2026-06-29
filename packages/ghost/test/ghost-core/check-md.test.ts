import { describe, expect, it } from "vitest";
import {
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "../../src/ghost-core/index.js";

const VALID = `---
name: design-token
description: Flag hardcoded colors.
severity: high
surface: checkout
tools: [Read, Grep]
turn-limit: 20
---

## Purpose
Use semantic tokens.

## Instructions
1. Flag hex literals.
`;

describe("parseCheckMarkdown", () => {
  it("splits frontmatter from body", () => {
    const parsed = parseCheckMarkdown(VALID);
    expect(parsed.frontmatter?.name).toBe("design-token");
    expect(parsed.body).toContain("## Purpose");
  });

  it("returns null frontmatter when there is no block", () => {
    const parsed = parseCheckMarkdown("# Just a heading\n");
    expect(parsed.frontmatter).toBeNull();
  });
});

describe("lintGhostCheck", () => {
  it("passes a well-formed check", () => {
    const report = lintGhostCheck(VALID);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("errors when frontmatter is missing", () => {
    const report = lintGhostCheck("## Purpose\nNo frontmatter.\n");
    expect(
      report.issues.some((i) => i.rule === "check-frontmatter-missing"),
    ).toBe(true);
  });

  it("errors on an unknown severity", () => {
    const report = lintGhostCheck(
      VALID.replace("severity: high", "severity: critical"),
    );
    expect(report.issues.some((i) => i.rule === "check-severity-invalid")).toBe(
      true,
    );
  });

  it("errors on a dotted surface", () => {
    const report = lintGhostCheck(
      VALID.replace("surface: checkout", "surface: email.marketing"),
    );
    expect(report.issues.some((i) => i.rule === "check-surface-invalid")).toBe(
      true,
    );
  });

  it("warns when a check has no surface (governs core)", () => {
    const report = lintGhostCheck(VALID.replace("surface: checkout\n", ""));
    expect(report.issues.some((i) => i.rule === "check-surface-unplaced")).toBe(
      true,
    );
  });

  it("errors on an empty body", () => {
    const report = lintGhostCheck(`---
name: x
description: y
severity: low
surface: core
---
`);
    expect(report.issues.some((i) => i.rule === "check-body-empty")).toBe(true);
  });
});

describe("loadGhostCheck", () => {
  it("produces a typed document", () => {
    const doc = loadGhostCheck(VALID);
    expect(doc.frontmatter).toMatchObject({
      name: "design-token",
      description: "Flag hardcoded colors.",
      severity: "high",
      surface: "checkout",
      tools: ["Read", "Grep"],
      turn_limit: 20,
    });
    expect(doc.body).toContain("Flag hex literals");
  });
});
