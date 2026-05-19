import { describe, expect, it } from "vitest";
import {
  GHOST_DECISION_SCHEMA,
  GHOST_PROPOSAL_SCHEMA,
  lintGhostDecision,
  lintGhostProposal,
} from "../src/index.js";

const VALID_DECISION = {
  schema: GHOST_DECISION_SCHEMA,
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

const VALID_PROPOSAL = {
  schema: GHOST_PROPOSAL_SCHEMA,
  id: "saved-payment-empty-state",
  status: "open",
  kind: "decision",
  title: "Saved payment empty state should teach recovery",
  claim:
    "Empty states for saved payment methods should prioritize recovery over education.",
  rationale: "The user is blocked from paying, not browsing product concepts.",
  scope: {
    roles: ["design", "pm", "qa"],
    surface_types: ["empty-state"],
  },
  evidence: [{ path: "apps/payments/empty-state.tsx" }],
  proposed_action: {
    target: "decisions",
    summary: "Promote into a product-experience decision if repeated.",
  },
};

describe("Ghost product-experience memory schemas", () => {
  it("accepts a valid ghost.decision/v1 document", () => {
    const report = lintGhostDecision(VALID_DECISION);

    expect(report.errors).toBe(0);
  });

  it("rejects a decision without auditable evidence", () => {
    const report = lintGhostDecision({
      ...VALID_DECISION,
      evidence: [],
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.path)).toContain("evidence");
  });

  it("accepts a valid ghost.proposal/v1 document", () => {
    const report = lintGhostProposal(VALID_PROPOSAL);

    expect(report.errors).toBe(0);
  });

  it("rejects a proposal with an unknown proposed target", () => {
    const report = lintGhostProposal({
      ...VALID_PROPOSAL,
      proposed_action: {
        target: "roadmap",
        summary: "This should stay outside Ghost.",
      },
    });

    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.map((issue) => issue.path)).toContain(
      "proposed_action.target",
    );
  });
});
