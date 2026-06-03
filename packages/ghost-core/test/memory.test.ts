import { describe, expect, it } from "vitest";
import * as core from "../src/index.js";

const VALID_DECISION = {
  schema: core.GHOST_DECISION_SCHEMA,
  id: "checkout-reversibility",
  status: "accepted",
  title: "Reversibility before money movement",
  claim: "Payment review must make reversibility visible before submission.",
  rationale: "Users need confidence before committing money movement.",
  scope: {
    roles: ["design", "engineering", "pm", "qa"],
    scopes: ["checkout"],
    surface_types: ["payment-review"],
    pattern_ids: ["confirmation-before-commit"],
  },
  evidence: [
    {
      path: "apps/checkout/review.tsx",
      note: "Review step exposes edit affordances before submit.",
    },
  ],
  decided_at: "2026-05-17T00:00:00.000Z",
};

describe("Ghost product-experience memory schemas", () => {
  it("accepts a valid ghost.decision/v1 document", () => {
    const report = core.lintGhostDecision(VALID_DECISION);

    expect(report.errors).toBe(0);
  });

  it("rejects a decision without auditable evidence", () => {
    const report = core.lintGhostDecision({
      ...VALID_DECISION,
      evidence: [],
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.path)).toContain("evidence");
  });

  it("does not expose proposal-era memory symbols from private core", () => {
    for (const symbol of [
      "GHOST_PROPOSAL_SCHEMA",
      "GHOST_PROPOSALS_DIRNAME",
      "GhostProposalActionSchema",
      "GhostProposalSchema",
      "lintGhostProposal",
    ]) {
      expect(core).not.toHaveProperty(symbol);
    }
  });
});
