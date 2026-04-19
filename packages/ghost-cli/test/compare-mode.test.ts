import { describe, expect, it } from "vitest";
import { selectCompareMode } from "../src/compare-mode.js";

describe("selectCompareMode", () => {
  // --- components short-circuit ---

  it("picks components mode when --components is set, regardless of N", () => {
    expect(
      selectCompareMode({ fingerprintCount: 0, components: true }),
    ).toEqual({ ok: true, mode: "components" });
    expect(
      selectCompareMode({ fingerprintCount: 2, components: true }),
    ).toEqual({ ok: true, mode: "components" });
  });

  it("components mode wins over --cluster / --semantic / --temporal", () => {
    // --components is a different universe; other flags do not interact.
    expect(
      selectCompareMode({
        fingerprintCount: 5,
        components: true,
        cluster: true,
        semantic: true,
        temporal: true,
      }),
    ).toEqual({ ok: true, mode: "components" });
  });

  // --- arity errors ---

  it("errors when N < 2 and --components is not set", () => {
    const r = selectCompareMode({ fingerprintCount: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("at least 2 fingerprint paths");
      expect(r.error).toContain("--components");
    }
  });

  it("errors when N = 1", () => {
    expect(selectCompareMode({ fingerprintCount: 1 }).ok).toBe(false);
  });

  // --- fleet ---

  it("picks fleet mode for N >= 3", () => {
    expect(selectCompareMode({ fingerprintCount: 3 })).toEqual({
      ok: true,
      mode: "fleet",
    });
    expect(selectCompareMode({ fingerprintCount: 10 })).toEqual({
      ok: true,
      mode: "fleet",
    });
  });

  it("picks fleet mode for N=2 with --cluster", () => {
    expect(selectCompareMode({ fingerprintCount: 2, cluster: true })).toEqual({
      ok: true,
      mode: "fleet",
    });
  });

  it("rejects --temporal with fleet (N≥3)", () => {
    const r = selectCompareMode({ fingerprintCount: 3, temporal: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("exactly 2 fingerprints");
  });

  it("rejects --semantic with fleet (N≥3)", () => {
    const r = selectCompareMode({ fingerprintCount: 4, semantic: true });
    expect(r.ok).toBe(false);
  });

  it("rejects --temporal with --cluster on N=2", () => {
    const r = selectCompareMode({
      fingerprintCount: 2,
      cluster: true,
      temporal: true,
    });
    expect(r.ok).toBe(false);
  });

  // --- semantic ---

  it("picks semantic mode with --semantic on N=2", () => {
    expect(selectCompareMode({ fingerprintCount: 2, semantic: true })).toEqual({
      ok: true,
      mode: "semantic",
    });
  });

  it("rejects --semantic + --temporal combination", () => {
    const r = selectCompareMode({
      fingerprintCount: 2,
      semantic: true,
      temporal: true,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("mutually exclusive");
  });

  // --- temporal ---

  it("picks temporal mode with --temporal on N=2", () => {
    expect(selectCompareMode({ fingerprintCount: 2, temporal: true })).toEqual({
      ok: true,
      mode: "temporal",
    });
  });

  // --- pairwise default ---

  it("picks pairwise mode with N=2 and no special flags", () => {
    expect(selectCompareMode({ fingerprintCount: 2 })).toEqual({
      ok: true,
      mode: "pairwise",
    });
  });

  it("treats undefined flags as false (pairwise default)", () => {
    expect(
      selectCompareMode({
        fingerprintCount: 2,
        components: undefined,
        cluster: undefined,
        semantic: undefined,
        temporal: undefined,
      }),
    ).toEqual({ ok: true, mode: "pairwise" });
  });
});
