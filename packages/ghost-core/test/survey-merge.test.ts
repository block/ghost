import { describe, expect, it } from "vitest";
import { tokenRowId, uiSurfaceRowId, valueRowId } from "../src/survey/id.js";
import { mergeSurveys } from "../src/survey/merge.js";
import type {
  Survey,
  SurveySource,
  TokenRow,
  UiSurfaceRow,
  ValueRow,
} from "../src/survey/types.js";

const SOURCE_A: SurveySource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
};

const SOURCE_B: SurveySource = {
  target: "github:block/other",
  commit: "def456",
  scanned_at: "2026-04-29T12:00:00Z",
};

function valueRow(
  source: SurveySource,
  kind: string,
  value: string,
  raw: string,
  occurrences = 1,
): ValueRow {
  return {
    id: valueRowId(source, kind, value, raw),
    source,
    kind,
    value,
    raw,
    occurrences,
    files_count: 1,
  };
}

function tokenRow(
  source: SurveySource,
  name: string,
  resolved: string,
): TokenRow {
  return {
    id: tokenRowId(source, name),
    source,
    name,
    alias_chain: [],
    resolved_value: resolved,
    occurrences: 1,
  };
}

function uiSurfaceRow(
  source: SurveySource,
  name: string,
  kind: UiSurfaceRow["kind"],
  locator: string,
): UiSurfaceRow {
  return {
    id: uiSurfaceRowId(source, name, kind, locator),
    source,
    name,
    kind,
    locator,
    renderability: "source-only",
    files: [`src/${name.toLowerCase()}.tsx`],
    classification: {
      intent: "configure",
      surface_type: "settings",
      density: "standard",
      layout_shape: "control-surface",
      confidence: 0.8,
    },
    signals: {
      dominant_components: ["Button"],
      layout_patterns: ["sectioned-form"],
    },
  };
}

function makeSurvey(
  source: SurveySource,
  values: ValueRow[] = [],
  tokens: TokenRow[] = [],
  uiSurfaces: UiSurfaceRow[] = [],
): Survey {
  return {
    schema: "ghost.survey/v2",
    sources: [source],
    values,
    tokens,
    components: [],
    ui_surfaces: uiSurfaces,
  };
}

describe("mergeSurveys", () => {
  it("merging a single survey returns equivalent rowset", () => {
    const a = makeSurvey(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
    ]);
    const merged = mergeSurveys(a);
    expect(merged.values).toEqual(a.values);
    expect(merged.sources).toEqual([SOURCE_A]);
  });

  it("is idempotent — merging the same survey twice yields the same rowset", () => {
    const a = makeSurvey(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
      valueRow(SOURCE_A, "spacing", "8", "8px"),
    ]);
    const once = mergeSurveys(a);
    const twice = mergeSurveys(a, a);
    expect(twice.values).toEqual(once.values);
    expect(twice.sources).toEqual(once.sources);
  });

  it("preserves rows with distinct IDs across different sources", () => {
    const a = makeSurvey(SOURCE_A, [
      valueRow(SOURCE_A, "color", "#f97316", "#f97316"),
    ]);
    const b = makeSurvey(SOURCE_B, [
      valueRow(SOURCE_B, "color", "#f97316", "#f97316"),
    ]);
    const merged = mergeSurveys(a, b);
    expect(merged.values).toHaveLength(2);
    expect(merged.sources).toEqual([SOURCE_A, SOURCE_B]);
  });

  it("dedupes rows with identical IDs (same source + same content)", () => {
    const row = valueRow(SOURCE_A, "color", "#f97316", "#f97316");
    const a = makeSurvey(SOURCE_A, [row]);
    const b = makeSurvey(SOURCE_A, [row]); // same source, same content -> same ID
    const merged = mergeSurveys(a, b);
    expect(merged.values).toHaveLength(1);
    expect(merged.sources).toHaveLength(1);
  });

  it("preserves distinct source-graph roles for the same target", () => {
    const primary: SurveySource = {
      ...SOURCE_A,
      id: "cash-ios",
      role: "primary",
    };
    const resolver: SurveySource = {
      ...SOURCE_A,
      id: "arcade-ios-package",
      role: "resolver",
      resolves: ["color"],
    };
    const merged = mergeSurveys(makeSurvey(primary), makeSurvey(resolver));
    expect(merged.sources).toEqual([primary, resolver]);
  });

  it("preserves tokens and components independently", () => {
    const a = makeSurvey(
      SOURCE_A,
      [],
      [tokenRow(SOURCE_A, "--brand-primary", "#f97316")],
    );
    const b = makeSurvey(
      SOURCE_B,
      [],
      [tokenRow(SOURCE_B, "--brand-primary", "#0000ff")],
    );
    const merged = mergeSurveys(a, b);
    expect(merged.tokens).toHaveLength(2);
    // Same token name, different sources, distinct IDs — both survive.
    expect(merged.tokens.map((t) => t.resolved_value).sort()).toEqual([
      "#0000ff",
      "#f97316",
    ]);
  });

  it("preserves and dedupes UI surface rows", () => {
    const settings = uiSurfaceRow(SOURCE_A, "Settings", "route", "/settings");
    const a = makeSurvey(SOURCE_A, [], [], [settings]);
    const b = makeSurvey(SOURCE_A, [], [], [settings]);
    const c = makeSurvey(
      SOURCE_B,
      [],
      [],
      [uiSurfaceRow(SOURCE_B, "Settings", "route", "/settings")],
    );
    const merged = mergeSurveys(a, b, c);
    expect(merged.ui_surfaces).toHaveLength(2);
  });

  it("throws when given zero surveys", () => {
    expect(() => mergeSurveys()).toThrow(/at least one/);
  });

  it("schema field on the merged survey is ghost.survey/v2", () => {
    const a = makeSurvey(SOURCE_A);
    const merged = mergeSurveys(a);
    expect(merged.schema).toBe("ghost.survey/v2");
  });
});
