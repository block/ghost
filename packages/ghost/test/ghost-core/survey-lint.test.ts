import { describe, expect, it } from "vitest";
import type {
  Survey,
  SurveySource,
  TokenRow,
  UiSurfaceRow,
  ValueRow,
} from "#ghost-core";
import {
  lintSurvey,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "#ghost-core";

const SOURCE: SurveySource = {
  target: "github:block/ghost",
  commit: "abc123",
  scanned_at: "2026-04-29T12:00:00Z",
  scanner_version: "0.1.0",
};

const RESOLVER_SOURCE: SurveySource = {
  id: "design-tokens",
  role: "resolver",
  target: "github:block/design-tokens",
  commit: "def456",
  scanned_at: "2026-04-29T12:00:00Z",
  scanner_version: "0.1.0",
  resolves: ["color"],
};

function makeValueRow(
  kind: string,
  value: string,
  raw: string,
  overrides: Partial<{
    occurrences: number;
    files_count: number;
    role_hypothesis: string;
    source: SurveySource;
    resolution: ValueRow["resolution"];
  }> = {},
) {
  const source = overrides.source ?? SOURCE;
  return {
    id: valueRowId(source, kind, value, raw),
    source,
    kind,
    value,
    raw,
    occurrences: overrides.occurrences ?? 1,
    files_count: overrides.files_count ?? 1,
    role_hypothesis: overrides.role_hypothesis,
    resolution: overrides.resolution,
  };
}

function makeTokenRow(
  source: SurveySource,
  name: string,
  resolvedValue: string,
  resolution?: TokenRow["resolution"],
): TokenRow {
  return {
    id: tokenRowId(source, name),
    source,
    name,
    alias_chain: [],
    resolved_value: resolvedValue,
    occurrences: 1,
    resolution,
  };
}

function makeUiSurfaceRow(overrides: Partial<UiSurfaceRow> = {}): UiSurfaceRow {
  const source = overrides.source ?? SOURCE;
  const name = overrides.name ?? "Settings account";
  const kind = overrides.kind ?? "route";
  const locator = overrides.locator ?? "/settings/account";
  return {
    id: overrides.id ?? uiSurfaceRowId(source, name, kind, locator),
    source,
    name,
    kind,
    locator,
    renderability: overrides.renderability ?? "source-only",
    files: overrides.files ?? ["src/routes/settings/account.tsx"],
    classification: overrides.classification ?? {
      intent: "configure",
      surface_type: "settings",
      density: "standard",
      layout_shape: "control-surface",
      confidence: 0.82,
    },
    signals: overrides.signals ?? {
      dominant_components: ["Input", "Button"],
      layout_patterns: ["sectioned-form", "persistent-actions"],
      breakpoint_behavior: ["single-column mobile"],
      notes: ["Compact controls sit inside sectioned settings groups."],
    },
  };
}

function makeSurvey(
  values: ReturnType<typeof makeValueRow>[] = [],
  tokens: TokenRow[] = [],
  sources: SurveySource[] = [SOURCE],
  uiSurfaces: UiSurfaceRow[] = [makeUiSurfaceRow()],
): Survey {
  return {
    schema: "ghost.survey/v1",
    sources,
    values,
    tokens,
    components: [],
    ui_surfaces: uiSurfaces,
  };
}

describe("lintSurvey", () => {
  it("accepts an empty well-formed survey", () => {
    const report = lintSurvey(makeSurvey());
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("accepts a survey with recommended-kind value rows", () => {
    const survey = makeSurvey([
      makeValueRow("color", "#f97316", "bg-orange-500", {
        occurrences: 47,
        files_count: 12,
      }),
      makeValueRow("spacing", "8", "8px", {
        occurrences: 312,
        files_count: 89,
      }),
    ]);
    const report = lintSurvey(survey);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBe(0);
  });

  it("rejects missing schema field", () => {
    const survey = makeSurvey() as Record<string, unknown>;
    delete survey.schema;
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule.startsWith("schema/"))).toBe(true);
  });

  it("rejects the old ghost.bucket/v1 schema", () => {
    const survey: unknown = {
      ...makeSurvey(),
      schema: "ghost.bucket/v1",
    };
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule.startsWith("schema/"))).toBe(true);
  });

  it("rejects negative occurrences", () => {
    const row = makeValueRow("color", "#f97316", "#f97316");
    const report = lintSurvey(makeSurvey([{ ...row, occurrences: -1 }]));
    expect(report.errors).toBeGreaterThan(0);
  });

  it("warns on unknown value kinds without rejecting", () => {
    const survey = makeSurvey([
      makeValueRow("z-index", "10", "z-10"), // not in recommended set
    ]);
    const report = lintSurvey(survey);
    expect(report.errors).toBe(0);
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "value-kind-unknown")).toBe(
      true,
    );
  });

  it("warns when a row's id does not match the deterministic generator", () => {
    const survey = makeSurvey([
      {
        ...makeValueRow("color", "#f97316", "#f97316"),
        id: "deadbeefdeadbeef", // hand-rolled, not from generator
      },
    ]);
    const report = lintSurvey(survey);
    expect(report.warnings).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "id-mismatch")).toBe(true);
  });

  it("flags duplicate IDs within a section as errors", () => {
    const row = makeValueRow("color", "#f97316", "#f97316");
    const report = lintSurvey(makeSurvey([row, { ...row }])); // same ID, two rows
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.rule === "duplicate-id")).toBe(true);
  });

  it("flags duplicate UI surface IDs within the ui_surfaces section", () => {
    const row = makeUiSurfaceRow();
    const report = lintSurvey(makeSurvey([], [], [SOURCE], [row, { ...row }]));
    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some(
        (i) => i.rule === "duplicate-id" && i.path === "ui_surfaces[1].id",
      ),
    ).toBe(true);
  });

  it("requires the ui_surfaces section", () => {
    const survey = makeSurvey() as unknown as Record<string, unknown>;
    delete survey.ui_surfaces;
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.path === "ui_surfaces")).toBe(true);
  });

  it("warns when ui_surfaces is empty", () => {
    const report = lintSurvey(makeSurvey([], [], [SOURCE], []));
    expect(report.errors).toBe(0);
    expect(report.issues.some((i) => i.rule === "ui-surfaces-empty")).toBe(
      true,
    );
  });

  it("rejects invalid UI surface enum values and confidence bounds", () => {
    const survey: unknown = {
      ...makeSurvey(),
      ui_surfaces: [
        {
          ...makeUiSurfaceRow(),
          kind: "page",
          classification: {
            density: "roomy",
            layout_shape: "control-surface",
            confidence: 1.5,
          },
        },
      ],
    };
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
    expect(
      report.issues.some((i) => i.path?.startsWith("ui_surfaces[0]")),
    ).toBe(true);
  });

  it("requires a UI surface locator", () => {
    const survey: unknown = {
      ...makeSurvey(),
      ui_surfaces: [{ ...makeUiSurfaceRow(), locator: "" }],
    };
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
    expect(report.issues.some((i) => i.path === "ui_surfaces[0].locator")).toBe(
      true,
    );
  });

  it("accepts factual composition observations on UI surfaces", () => {
    const report = lintSurvey(
      makeSurvey(
        [],
        [],
        [SOURCE],
        [
          makeUiSurfaceRow({
            composition: {
              anatomy: ["shell", "compact-header", "sectioned-form"],
              primary_region: "form",
              action_placement: ["footer", "section-local"],
              navigation_context: "persistent-shell",
              responsive_behavior: ["mobile stacks sections vertically"],
              confidence: 0.74,
            },
          }),
        ],
      ),
    );

    expect(report.errors).toBe(0);
  });

  it("rejects sources array with no entries", () => {
    const survey: unknown = {
      ...makeSurvey(),
      sources: [],
    };
    const report = lintSurvey(survey);
    expect(report.errors).toBeGreaterThan(0);
  });

  it("accepts source roles and resolution provenance", () => {
    const primary: SurveySource = {
      ...SOURCE,
      id: "cash-ios",
      role: "primary",
      target: "github:squareup/cash-ios",
    };
    const row = makeValueRow("color", "#ffffff", "CashTheme.color.bg", {
      source: primary,
      resolution: {
        status: "resolved",
        source_id: "arcade-ios-package",
        target: "github:squareup/arcade-ios-package",
        symbol: "ArcadeColor.background",
        chain: ["CashTheme.color.bg", "ArcadeColor.background"],
      },
    });
    const report = lintSurvey(
      makeSurvey([row], [], [primary, RESOLVER_SOURCE]),
    );
    expect(report.errors).toBe(0);
    expect(report.issues).toEqual([]);
  });

  it("warns when source roles omit a primary source", () => {
    const report = lintSurvey(makeSurvey([], [], [RESOLVER_SOURCE]));
    expect(report.errors).toBe(0);
    expect(
      report.issues.some((i) => i.rule === "source-graph-primary-count"),
    ).toBe(true);
  });

  it("accepts unresolved external token provenance", () => {
    const primary: SurveySource = {
      ...SOURCE,
      id: "cash-ios",
      role: "primary",
    };
    const token = makeTokenRow(
      primary,
      "CashTheme.color.bg",
      "CashTheme.color.bg",
      {
        status: "unresolved-external",
        source_id: "arcade-ios-package",
        symbol: "ArcadeColor.background",
      },
    );
    const report = lintSurvey(
      makeSurvey([], [token], [primary, RESOLVER_SOURCE]),
    );
    expect(report.errors).toBe(0);
    expect(
      report.issues.some(
        (i) => i.rule === "resolution-unresolved-context-missing",
      ),
    ).toBe(false);
  });
});
