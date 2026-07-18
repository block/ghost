import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { initFingerprintPackage } from "../../ghost/src/scan/fingerprint-package.js";
import { parseAsks } from "../lib/bench.mjs";
import { openAICompatibleModel, parseIdReply } from "../lib/model.mjs";
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
    const value = consistency([["a", "b"], ["a", "b"], ["a"]]);
    expect(value).toBeCloseTo((1 + 0.5 + 0.5) / 3);
  });
});

describe("precisionRecall", () => {
  it("returns no scores without an expected set", () => {
    expect(precisionRecall([["a"]], null)).toEqual({});
    expect(precisionRecall([["a"]], [])).toEqual({});
  });
  it("averages retrieval scores across trials", () => {
    const scores = precisionRecall(
      [
        ["a", "x"],
        ["a", "b"],
      ],
      ["a", "b", "c"],
      ["x"],
    );
    expect(scores.precision).toBeCloseTo(0.75);
    expect(scores.recall).toBeCloseTo(0.5);
    expect(scores.poisonRate).toBe(0.5);
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
  it("parses the shared ask blocks and metadata", () => {
    const asks = parseAsks(
      [
        "## Ask 1 — dense settings",
        "",
        "Build a dense settings screen.",
        "",
        "expect: foundation.composition, foundation.controls",
        "poison: context.conversation",
        "",
        "## Ask 2 — marketing email",
        "",
        "Build a marketing email header.",
        "",
        "discount: unprompted-dark-theme",
      ].join("\n"),
    );
    expect(asks).toHaveLength(2);
    expect(asks[0]).toMatchObject({
      n: 1,
      title: "dense settings",
      ask: "Build a dense settings screen.",
      expected: ["foundation.composition", "foundation.controls"],
      poison: ["context.conversation"],
    });
    expect(asks[1].discount).toEqual(["unprompted-dark-theme"]);
  });
  it("rejects expected or poison ids outside the menu", () => {
    expect(() =>
      parseAsks("## Ask 1 — bad id\n\nBuild it.\n\nexpect: missing", {
        validateIds: new Set(["known"]),
      }),
    ).toThrow("ask 1 references unknown node id: missing");
  });
});

describe("demo asks", () => {
  it("only expects selectable default-skeleton nodes", async () => {
    const root = resolve(import.meta.dirname, "../../..");
    const dir = await mkdtemp(join(tmpdir(), "context-control-test-"));
    try {
      const initialized = await initFingerprintPackage(
        join(dir, ".ghost"),
        root,
      );
      const nodeIds = new Set(
        initialized.written
          .filter((file) => file.endsWith(".md") && file !== "glossary.md")
          .map((file) => file.slice(0, -3)),
      );
      nodeIds.delete("brand");
      const parsed = parseAsks(
        await readFile(
          resolve(root, "packages/context-control/demo/asks.md"),
          "utf-8",
        ),
        { validateIds: nodeIds },
      );
      expect(parsed.every((ask) => ask.ask.length > 0)).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("openAICompatibleModel", () => {
  it("requires portable endpoint configuration", () => {
    expect(() => openAICompatibleModel({})).toThrow("CONTEXT_CONTROL_BASE_URL");
    expect(() =>
      openAICompatibleModel({ baseUrl: "https://models.example.com/v1" }),
    ).toThrow("CONTEXT_CONTROL_API_KEY");
    expect(() =>
      openAICompatibleModel({
        baseUrl: "https://models.example.com/v1",
        apiKey: "test-key",
      }),
    ).toThrow("CONTEXT_CONTROL_MODEL");
  });
});

describe("parseIdReply", () => {
  it("parses a bare JSON array", () => {
    expect(parseIdReply('["a", "b.c"]')).toEqual(["a", "b.c"]);
  });
  it("tolerates code fences and prose around the array", () => {
    expect(
      parseIdReply('Here you go:\n```json\n["foundation.motion"]\n```'),
    ).toEqual(["foundation.motion"]);
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
