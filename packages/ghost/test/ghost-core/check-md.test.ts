import { describe, expect, it } from "vitest";
import {
  lintGhostCheck,
  loadGhostCheck,
  parseCheckMarkdown,
} from "../../src/ghost-core/index.js";

const VALID = `---
context: Token changes must preserve semantic roles.
severity: high
references:
  - principle.trust
---

## Purpose
Use semantic tokens.

## Instructions
1. Flag hex literals.
`;

describe("parseCheckMarkdown", () => {
  it("splits frontmatter from body", () => {
    const parsed = parseCheckMarkdown(VALID);
    expect(parsed.frontmatter?.context).toBe(
      "Token changes must preserve semantic roles.",
    );
    expect(parsed.body).toContain("## Purpose");
  });

  it("returns null frontmatter when there is no block", () => {
    const parsed = parseCheckMarkdown("# Just a heading\n");
    expect(parsed.frontmatter).toBeNull();
  });
});

describe("lintGhostCheck", () => {
  it("passes a well-formed grounded check", () => {
    const report = lintGhostCheck(VALID);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("requires context", () => {
    const report = lintGhostCheck(
      VALID.replace(
        "context: Token changes must preserve semantic roles.\n",
        "",
      ),
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-context-missing" }),
      ]),
    );
  });

  it("gives a migration message for .agents/checks-shaped files", () => {
    const report = lintGhostCheck(`---
name: token-contract
description: Token changes preserve semantic roles.
severity: high
references:
  - principle.trust
---

Grade it.
`);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues[0]).toMatchObject({
      rule: "check-context-missing",
      message: expect.stringContaining(".agents/checks format"),
    });
    expect(report.issues[0].message).toContain(
      "move the applicability statement from `description` to `context`",
    );
    expect(report.issues[0].message).toContain("add resolving `references`");
  });

  it("rejects retired frontmatter keys", () => {
    const report = lintGhostCheck(
      VALID.replace(
        "severity: high\n",
        "severity: high\nname: token-contract\ntools: [Read]\n",
      ),
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-frontmatter-unknown-key" }),
      ]),
    );
  });

  it("requires references", () => {
    const report = lintGhostCheck(
      VALID.replace("references:\n  - principle.trust\n", ""),
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-references-missing" }),
      ]),
    );
  });

  it("errors on malformed references", () => {
    const report = lintGhostCheck(
      VALID.replace("  - principle.trust\n", "  - /bad\n"),
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ rule: "check-reference-malformed" }),
      ]),
    );
  });

  it("accepts references with heading anchors", () => {
    const report = lintGhostCheck(
      VALID.replace(
        "  - principle.trust\n",
        "  - checkout/payment > Confirmation\n",
      ),
    );
    expect(
      report.issues.some((i) => i.rule === "check-reference-malformed"),
    ).toBe(false);
  });

  it("errors on an unknown severity", () => {
    const report = lintGhostCheck(
      VALID.replace("severity: high", "severity: critical"),
    );
    expect(report.issues.some((i) => i.rule === "check-severity-invalid")).toBe(
      true,
    );
  });

  it("errors on an empty body", () => {
    const report = lintGhostCheck(`---
context: Empty body.
severity: low
references:
  - principle.trust
---
`);
    expect(report.issues.some((i) => i.rule === "check-body-empty")).toBe(true);
  });
});

describe("loadGhostCheck", () => {
  it("produces a typed grounded document", () => {
    const doc = loadGhostCheck(VALID);
    expect(doc.frontmatter).toEqual({
      context: "Token changes must preserve semantic roles.",
      severity: "high",
      references: ["principle.trust"],
    });
    expect(doc.body).toContain("Flag hex literals");
  });
});
