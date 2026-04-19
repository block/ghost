import { describe, expect, it } from "vitest";
import { selectCompareMode } from "../src/compare-mode.js";

describe("selectCompareMode", () => {
  // --- arity errors ---

  it("errors when N < 2", () => {
    const r = selectCompareMode({ expressionCount: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("at least 2 expression paths");
    }
  });

  it("errors when N = 1", () => {
    expect(selectCompareMode({ expressionCount: 1 }).ok).toBe(false);
  });

  // --- fleet ---

  it("picks fleet mode for N >= 3", () => {
    expect(selectCompareMode({ expressionCount: 3 })).toEqual({
      ok: true,
      mode: "fleet",
    });
    expect(selectCompareMode({ expressionCount: 10 })).toEqual({
      ok: true,
      mode: "fleet",
    });
  });

  it("picks fleet mode for N=2 with --cluster", () => {
    expect(selectCompareMode({ expressionCount: 2, cluster: true })).toEqual({
      ok: true,
      mode: "fleet",
    });
  });

  it("rejects --temporal with fleet (N≥3)", () => {
    const r = selectCompareMode({ expressionCount: 3, temporal: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("exactly 2 expressions");
  });

  it("rejects --semantic with fleet (N≥3)", () => {
    const r = selectCompareMode({ expressionCount: 4, semantic: true });
    expect(r.ok).toBe(false);
  });

  it("rejects --temporal with --cluster on N=2", () => {
    const r = selectCompareMode({
      expressionCount: 2,
      cluster: true,
      temporal: true,
    });
    expect(r.ok).toBe(false);
  });

  // --- semantic ---

  it("picks semantic mode with --semantic on N=2", () => {
    expect(selectCompareMode({ expressionCount: 2, semantic: true })).toEqual({
      ok: true,
      mode: "semantic",
    });
  });

  it("rejects --semantic + --temporal combination", () => {
    const r = selectCompareMode({
      expressionCount: 2,
      semantic: true,
      temporal: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("mutually exclusive");
  });

  // --- temporal ---

  it("picks temporal mode with --temporal on N=2", () => {
    expect(selectCompareMode({ expressionCount: 2, temporal: true })).toEqual({
      ok: true,
      mode: "temporal",
    });
  });

  // --- pairwise default ---

  it("picks pairwise mode with N=2 and no special flags", () => {
    expect(selectCompareMode({ expressionCount: 2 })).toEqual({
      ok: true,
      mode: "pairwise",
    });
  });

  it("treats undefined flags as false (pairwise default)", () => {
    expect(
      selectCompareMode({
        expressionCount: 2,
        cluster: undefined,
        semantic: undefined,
        temporal: undefined,
      }),
    ).toEqual({ ok: true, mode: "pairwise" });
  });
});
