import { describe, expect, it } from "vitest";
import {
  componentRowId,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "../src/survey/id.js";
import {
  formatSurveySummaryMarkdown,
  summarizeSurvey,
} from "../src/survey/summary.js";
import type {
  ComponentRow,
  Survey,
  SurveySource,
  TokenRow,
  UiSurfaceRow,
  ValueRow,
} from "../src/survey/types.js";

const SOURCE: SurveySource = {
  id: "app",
  role: "primary",
  target: "github:example/portal",
  commit: "abc123",
  scanned_at: "2026-05-04T12:00:00Z",
  scanner_version: "0.2.0",
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
    files_count: Math.max(1, Math.floor(occurrences / 3)),
    ...overrides,
  };
}

function tokenRow(
  name: string,
  resolvedValue: string,
  occurrences: number,
  overrides: Partial<TokenRow> = {},
): TokenRow {
  return {
    id: tokenRowId(SOURCE, name),
    source: SOURCE,
    name,
    alias_chain: [],
    resolved_value: resolvedValue,
    occurrences,
    ...overrides,
  };
}

function componentRow(name: string, index: number): ComponentRow {
  return {
    id: componentRowId(SOURCE, name),
    source: SOURCE,
    name,
    discovered_via: index % 2 === 0 ? "registry.json" : "barrel-export",
    variants: index % 3 === 0 ? ["default", "secondary"] : undefined,
    sizes: index % 4 === 0 ? ["sm", "md"] : undefined,
  };
}

function uiSurfaceRow(index: number): UiSurfaceRow {
  const name = `Surface ${index}`;
  const kind = "route";
  const locator = `/surface-${index}`;
  return {
    id: uiSurfaceRowId(SOURCE, name, kind, locator),
    source: SOURCE,
    name,
    kind,
    locator,
    renderability: "source-only",
    files: [`src/routes/surface-${index}.tsx`],
    classification: {
      intent: index % 2 === 0 ? "configure" : "review",
      surface_type: index % 2 === 0 ? "settings" : "audit",
      density: index % 2 === 0 ? "compressed" : "standard",
      layout_shape: index % 2 === 0 ? "control-surface" : "tracker",
      confidence: 0.9,
    },
    signals: {
      dominant_components: ["Button", "Input", "Table"],
      layout_patterns:
        index % 2 === 0
          ? ["sectioned-form", "persistent-actions"]
          : ["data-table", "status-row"],
      value_refs: [],
      notes: [`Observed surface ${index}.`],
    },
  };
}

function survey(): Survey {
  return {
    schema: "ghost.survey/v2",
    sources: [SOURCE],
    values: [
      valueRow("color", "#222222", "#222222", 30, {
        role_hypothesis: "foreground",
        usage: { className: 20, css_var: 10 },
      }),
      valueRow("color", "#111111", "text-[#111111]", 20, {
        usage: { arbitrary_class: 20 },
      }),
      valueRow("spacing", "8px", "p-2", 40),
      valueRow("spacing", "999px", "p-[999px]", 3, {
        usage: { arbitrary_class: 3 },
      }),
      valueRow("typography", "Inter", "font-inter", 14, {
        spec: { family: "Inter" },
      }),
      valueRow("radius", "4px", "rounded", 8, {
        resolution: {
          status: "unresolved-local",
          symbol: "--radius-base",
          message: "Local alias was not resolved.",
        },
      }),
      valueRow("z-index", "10", "z-10", 2),
    ],
    tokens: [
      tokenRow("--color-background", "#ffffff", 50, {
        alias_chain: ["--color-white"],
        by_theme: { light: "#ffffff", dark: "#111111" },
      }),
      tokenRow("--spacing-card-padding", "16px", 20, {
        alias_chain: ["--spacing-4", "--base-spacing"],
      }),
      tokenRow("--external-danger", "danger-token", 5, {
        resolution: {
          status: "unresolved-external",
          source_id: "design-tokens",
          symbol: "danger-token",
        },
      }),
    ],
    components: Array.from({ length: 25 }, (_, index) =>
      componentRow(`Component${String(index).padStart(2, "0")}`, index),
    ),
    ui_surfaces: Array.from({ length: 10 }, (_, index) => uiSurfaceRow(index)),
  };
}

describe("summarizeSurvey", () => {
  it("builds a bounded deterministic digest with row ids", () => {
    const summary = summarizeSurvey(survey(), { budget: "compact" });

    expect(summary.schema).toBe("ghost.survey.summary/v1");
    expect(summary.counts).toEqual({
      sources: 1,
      values: 7,
      tokens: 3,
      components: 25,
      ui_surfaces: 10,
      total_rows: 45,
    });

    const colors = summary.values.kinds.find((kind) => kind.kind === "color");
    expect(colors?.top.map((row) => row.value)).toEqual(["#222222", "#111111"]);
    expect(colors?.top[0].id).toBe(
      valueRowId(SOURCE, "color", "#222222", "#222222"),
    );

    expect(summary.values.arbitrary_or_raw.map((row) => row.raw)).toEqual([
      "text-[#111111]",
      "p-[999px]",
    ]);
    expect(summary.values.unresolved).toHaveLength(1);
    expect(summary.values.unresolved[0].resolution?.status).toBe(
      "unresolved-local",
    );

    expect(summary.tokens.families[0]).toMatchObject({
      name: "color/background",
      count: 1,
      occurrences: 50,
    });
    expect(summary.tokens.semantic_or_themed[0].name).toBe(
      "--color-background",
    );
    expect(summary.tokens.unresolved[0].resolution?.status).toBe(
      "unresolved-external",
    );

    expect(summary.components.top).toHaveLength(20);
    expect(summary.components.omitted).toBe(5);
    expect(summary.ui_surfaces.surfaces).toHaveLength(8);
    expect(summary.ui_surfaces.omitted).toBe(2);
    expect(summary.ui_surfaces.groups[0].examples.length).toBeLessThanOrEqual(
      2,
    );
  });

  it("expands row caps when the full budget is requested", () => {
    const summary = summarizeSurvey(survey(), { budget: "full" });

    expect(summary.components.top).toHaveLength(25);
    expect(summary.components.omitted).toBe(0);
    expect(summary.ui_surfaces.surfaces).toHaveLength(10);
    expect(summary.ui_surfaces.omitted).toBe(0);
  });
});

describe("formatSurveySummaryMarkdown", () => {
  it("renders agent-readable Markdown without dumping the full survey", () => {
    const summary = summarizeSurvey(survey(), { budget: "compact" });
    const markdown = formatSurveySummaryMarkdown(summary);

    expect(markdown).toContain("# Survey Summary");
    expect(markdown).toContain("Budget: `compact`");
    expect(markdown).toContain("## Values");
    expect(markdown).toContain("`text-[#111111]`");
    expect(markdown).toContain("## UI Surfaces");
    expect(markdown.length).toBeLessThan(12_000);
  });
});
