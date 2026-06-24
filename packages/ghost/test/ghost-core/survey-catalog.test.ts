import { describe, expect, it } from "vitest";
import {
  catalogSurveyValues,
  formatSurveyCatalogMarkdown,
  type Survey,
  type SurveySource,
  type ValueRow,
  valueRowId,
} from "#ghost-core";

const SOURCE: SurveySource = {
  id: "app",
  role: "primary",
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-05-04T12:00:00Z",
};

function valueRow(
  kind: string,
  value: string,
  raw: string,
  occurrences: number,
  overrides: Partial<ValueRow> = {},
): ValueRow {
  return {
    id: valueRowId(SOURCE, kind, value, raw),
    source: SOURCE,
    kind,
    value,
    raw,
    occurrences,
    files_count: Math.max(1, Math.floor(occurrences / 2)),
    ...overrides,
  };
}

function survey(): Survey {
  return {
    schema: "ghost.survey/v1",
    sources: [SOURCE],
    values: [
      valueRow("color", "#111111", "#111111", 4, {
        usage: { css_var: 4 },
        role_hypothesis: "foreground",
      }),
      valueRow("color", "#111111", "text-foreground", 8, {
        usage: { className: 8 },
        spec: { space: "srgb", hex: "#111111" },
      }),
      valueRow("spacing", "8px", "p-2", 12, {
        spec: { scalar: 8, unit: "px" },
      }),
      valueRow("spacing", "16px", "p-4", 6, {
        spec: { scalar: 16, unit: "px" },
      }),
      valueRow("z-index", "10", "z-10", 1),
    ],
    tokens: [],
    components: [],
    ui_surfaces: [],
  };
}

describe("catalogSurveyValues", () => {
  it("aggregates duplicate values deterministically", () => {
    const catalog = catalogSurveyValues(survey());

    expect(catalog.schema).toBe("ghost.survey.catalog/v1");
    expect(catalog.counts).toEqual({
      kinds: 3,
      values: 4,
      rows: 5,
      total_occurrences: 31,
    });
    expect(catalog.kinds.map((kind) => kind.kind)).toEqual([
      "color",
      "spacing",
      "z-index",
    ]);

    const color = catalog.kinds[0].values[0];
    expect(color).toMatchObject({
      value: "#111111",
      rows: 2,
      occurrences: 12,
      files_count: 6,
      raws: ["#111111", "text-foreground"],
      usage: { className: 8, css_var: 4 },
      role_hypotheses: ["foreground"],
      sources: ["app"],
    });
    expect(color.ids).toEqual([...color.ids].sort());
  });

  it("filters by kind without mutating ordering inside the kind", () => {
    const catalog = catalogSurveyValues(survey(), { kind: "spacing" });

    expect(catalog.filter).toEqual({ kind: "spacing" });
    expect(catalog.kinds.map((kind) => kind.kind)).toEqual(["spacing"]);
    expect(catalog.kinds[0].values.map((value) => value.value)).toEqual([
      "8px",
      "16px",
    ]);
  });
});

describe("formatSurveyCatalogMarkdown", () => {
  it("renders a compact value enum/spec view", () => {
    const markdown = formatSurveyCatalogMarkdown(catalogSurveyValues(survey()));

    expect(markdown).toContain("# Survey Value Catalog");
    expect(markdown).toContain("## color");
    expect(markdown).toContain("`#111111`");
    expect(markdown).toContain("usage className:8,css_var:4");
    expect(markdown).toContain('spec {"hex":"#111111","space":"srgb"}');
    expect(markdown.length).toBeLessThan(8000);
  });
});
