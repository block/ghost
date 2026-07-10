import { describe, expect, it } from "vitest";
import { parseAsks } from "../lib/bench.mjs";
import { parseIdReply } from "../lib/model.mjs";
import {
  consistency,
  jaccard,
  precisionRecall,
  selectionRates,
  suiteCoverage,
} from "../lib/score.mjs";
import { toSessions } from "../lib/tape.mjs";

describe("jaccard", () => {
  it("is 1 for identical sets and for empty vs empty", () => {
    expect(jaccard(["a", "b"], ["b", "a"])).toBe(1);
    expect(jaccard([], [])).toBe(1);
  });
  it("is 0 for disjoint sets", () => {
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
  it("counts overlap over union", () => {
    expect(jaccard(["a", "b", "c"], ["b", "c", "d"])).toBe(0.5);
  });
});

describe("consistency", () => {
  it("is 1 for a single trial", () => {
    expect(consistency([["a"]])).toBe(1);
  });
  it("averages pairwise jaccard", () => {
    // pairs: (ab,ab)=1, (ab,a)=0.5, (ab,a)=0.5 -> wait, three trials
    const value = consistency([["a", "b"], ["a", "b"], ["a"]]);
    expect(value).toBeCloseTo((1 + 0.5 + 0.5) / 3);
  });
});

describe("precisionRecall", () => {
  it("returns null with no expected set", () => {
    expect(precisionRecall([["a"]], null)).toBeNull();
    expect(precisionRecall([["a"]], [])).toBeNull();
  });
  it("scores the union of trials against expected", () => {
    const pr = precisionRecall(
      [
        ["a", "x"],
        ["a", "b"],
      ],
      ["a", "b", "c"],
    );
    // union = {a, x, b}; hits = a, b
    expect(pr.precision).toBeCloseTo(2 / 3);
    expect(pr.recall).toBeCloseTo(2 / 3);
  });
});

describe("selectionRates", () => {
  it("returns per-node fraction of trials", () => {
    const menu = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const rates = selectionRates([["a", "b"], ["a"]], menu);
    expect(rates).toEqual({ a: 1, b: 0.5, c: 0 });
  });
  it("ignores duplicate ids within one trial", () => {
    const rates = selectionRates([["a", "a"]], [{ id: "a" }]);
    expect(rates.a).toBe(1);
  });
});

describe("suiteCoverage", () => {
  it("finds dead nodes", () => {
    const menu = [{ id: "a" }, { id: "b" }, { id: "dead" }];
    const results = [{ trials: [["a", "b"]] }, { trials: [["a"]] }];
    const cov = suiteCoverage(results, menu);
    expect(cov.dead).toEqual(["dead"]);
    expect(cov.selectedEver).toBe(2);
  });
});

describe("parseAsks", () => {
  it("parses numbered asks with optional expect lines", () => {
    const asks = parseAsks(
      [
        "1. A dense settings screen",
        "   expect: grammar.hierarchy, register.data-density",
        "2. A marketing email header",
        "",
        "3. An empty state for search",
        "   expect: grammar.conversation",
      ].join("\n"),
    );
    expect(asks).toHaveLength(3);
    expect(asks[0].expected).toEqual([
      "grammar.hierarchy",
      "register.data-density",
    ]);
    expect(asks[1].expected).toBeNull();
    expect(asks[2].n).toBe(3);
  });
});

describe("parseIdReply", () => {
  it("parses a bare JSON array", () => {
    expect(parseIdReply('["a", "b.c"]')).toEqual(["a", "b.c"]);
  });
  it("tolerates code fences and prose around the array", () => {
    expect(
      parseIdReply('Here you go:\n```json\n["grammar.motion"]\n```'),
    ).toEqual(["grammar.motion"]);
  });
  it("drops non-string entries and returns [] for garbage", () => {
    expect(parseIdReply('["a", 3, null]')).toEqual(["a"]);
    expect(parseIdReply("no array here")).toEqual([]);
    expect(parseIdReply('{"ids": true}')).toEqual([]);
  });
});

describe("toSessions", () => {
  it("groups pulls under the preceding gather", () => {
    const sessions = toSessions([
      { event: "gather", ts: "t1", menu: ["a"] },
      { event: "pull", ts: "t2", ids: ["a"] },
      { event: "gather", ts: "t3", menu: ["a"], ask: "x" },
      { event: "pull", ts: "t4", ids: ["a"] },
      { event: "pull", ts: "t5", ids: ["a"] },
    ]);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].pulls).toHaveLength(1);
    expect(sessions[1].pulls).toHaveLength(2);
  });
  it("collects orphan pulls into a headless session", () => {
    const sessions = toSessions([{ event: "pull", ts: "t1", ids: ["a"] }]);
    expect(sessions[0].gather).toBeNull();
  });
});
