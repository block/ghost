import { describe, expect, it } from "vitest";
import { parseEmitKind, SUPPORTED_KINDS } from "../src/emit-command.js";

describe("parseEmitKind", () => {
  it("accepts review-command", () => {
    expect(parseEmitKind("review-command")).toEqual({
      ok: true,
      kind: "review-command",
    });
  });

  it("accepts context-bundle", () => {
    expect(parseEmitKind("context-bundle")).toEqual({
      ok: true,
      kind: "context-bundle",
    });
  });

  it("accepts skill", () => {
    expect(parseEmitKind("skill")).toEqual({
      ok: true,
      kind: "skill",
    });
  });

  it("rejects unknown kinds with a helpful error", () => {
    const result = parseEmitKind("nope");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("unknown emit kind 'nope'");
      expect(result.error).toContain("review-command");
      expect(result.error).toContain("context-bundle");
      expect(result.error).toContain("skill");
    }
  });

  it("rejects the empty string", () => {
    expect(parseEmitKind("").ok).toBe(false);
  });

  it("is case-sensitive (no surprising normalization)", () => {
    expect(parseEmitKind("Review-Command").ok).toBe(false);
    expect(parseEmitKind("CONTEXT-BUNDLE").ok).toBe(false);
  });

  it("covers every SUPPORTED_KINDS entry", () => {
    for (const kind of SUPPORTED_KINDS) {
      const r = parseEmitKind(kind);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.kind).toBe(kind);
    }
  });
});
