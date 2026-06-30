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

  it("accepts a source pointer with a heading anchor", () => {
    const report = lintGhostCheck(
      VALID.replace(
        "severity: high\n",
        "severity: high\nsource: checkout/payment > Confirmation\n",
      ),
    );
    expect(report.issues.some((i) => i.rule === "check-source-malformed")).toBe(
      false,
    );
  });

  it("warns (does not error) on a malformed source", () => {
    const report = lintGhostCheck(
      VALID.replace("severity: high\n", "severity: high\nsource: /bad\n"),
    );
    expect(report.errors).toBe(0);
    expect(report.issues.some((i) => i.rule === "check-source-malformed")).toBe(
      true,
    );
  });

  it("errors on an empty body", () => {
    const report = lintGhostCheck(`---
name: x
description: y
severity: low
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
      tools: ["Read", "Grep"],
      turn_limit: 20,
    });
    expect(doc.body).toContain("Flag hex literals");
  });

  it("carries an optional source pointer through", () => {
    const doc = loadGhostCheck(
      VALID.replace(
        "severity: high\n",
        "severity: high\nsource: checkout/payment > Confirmation\n",
      ),
    );
    expect(doc.frontmatter.source).toBe("checkout/payment > Confirmation");
  });
});
