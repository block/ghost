import { describe, expect, it } from "vitest";
import { recomputeSurveyIds } from "../src/survey/fix-ids.js";
import { tokenRowId, valueRowId } from "../src/survey/id.js";
import type { Survey, SurveySource } from "../src/survey/types.js";

const SOURCE: SurveySource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

function survey(): Survey {
  return {
    schema: "ghost.survey/v1",
    sources: [SOURCE],
    values: [
      {
        id: "",
        source: SOURCE,
        kind: "color",
        value: "#f97316",
        raw: "#f97316",
        occurrences: 1,
        files_count: 1,
      },
      {
        id: "wrong-id",
        source: SOURCE,
        kind: "spacing",
        value: "8",
        raw: "8px",
        occurrences: 1,
        files_count: 1,
      },
    ],
    tokens: [
      {
        id: "",
        source: SOURCE,
        name: "--brand-primary",
        alias_chain: [],
        resolved_value: "#f97316",
        occurrences: 1,
      },
    ],
    components: [],
  };
}

describe("recomputeSurveyIds", () => {
  it("populates empty IDs with deterministic hashes", () => {
    const fixed = recomputeSurveyIds(survey());
    expect(fixed.values[0].id).toBe(
      valueRowId(SOURCE, "color", "#f97316", "#f97316"),
    );
    expect(fixed.tokens[0].id).toBe(tokenRowId(SOURCE, "--brand-primary"));
  });

  it("overwrites incorrect IDs with the correct deterministic hash", () => {
    const fixed = recomputeSurveyIds(survey());
    expect(fixed.values[1].id).toBe(valueRowId(SOURCE, "spacing", "8", "8px"));
    expect(fixed.values[1].id).not.toBe("wrong-id");
  });

  it("does not mutate the input survey", () => {
    const input = survey();
    recomputeSurveyIds(input);
    expect(input.values[0].id).toBe("");
    expect(input.values[1].id).toBe("wrong-id");
  });

  it("is idempotent — running twice yields the same result", () => {
    const once = recomputeSurveyIds(survey());
    const twice = recomputeSurveyIds(once);
    expect(twice.values).toEqual(once.values);
    expect(twice.tokens).toEqual(once.tokens);
  });
});
