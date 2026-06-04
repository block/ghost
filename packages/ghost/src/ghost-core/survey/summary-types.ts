import type {
  ComponentRow,
  Resolution,
  SurveySource,
  UiSurfaceClassification,
  UiSurfaceRow,
  UiSurfaceSignals,
} from "./types.js";

export type SurveySummaryBudget = "compact" | "standard" | "full";

export interface SurveySummaryOptions {
  budget?: SurveySummaryBudget;
}

export interface SurveySummary {
  schema: "ghost.survey.summary/v1";
  source_schema: "ghost.survey/v1";
  budget: SurveySummaryBudget;
  counts: SurveySummaryCounts;
  sources: SurveySourceSummary[];
  values: SurveyValuesSummary;
  tokens: SurveyTokensSummary;
  components: SurveyComponentsSummary;
  ui_surfaces: SurveyUiSurfacesSummary;
}

export interface SurveySummaryCounts {
  sources: number;
  values: number;
  tokens: number;
  components: number;
  ui_surfaces: number;
  total_rows: number;
}

export interface SurveySourceSummary {
  id?: string;
  role?: SurveySource["role"];
  target: string;
  commit?: string;
  scanned_at: string;
  scanner_version?: string;
  resolves?: string[];
}

export interface SurveyValuesSummary {
  total_occurrences: number;
  kinds: ValueKindSummary[];
  arbitrary_or_raw: ValueEvidenceSummary[];
  unresolved: ValueEvidenceSummary[];
}

export interface ValueKindSummary {
  kind: string;
  rows: number;
  occurrences: number;
  files_count: number;
  top: ValueEvidenceSummary[];
  omitted: number;
}

export interface ValueEvidenceSummary {
  id: string;
  kind: string;
  value: string;
  raw: string;
  occurrences: number;
  files_count: number;
  usage?: Record<string, number>;
  role_hypothesis?: string;
  source?: string;
  resolution?: ResolutionSummary;
}

export interface ResolutionSummary {
  status: Resolution["status"];
  source_id?: string;
  target?: string;
  symbol?: string;
  chain?: string[];
  message?: string;
}

export interface SurveyTokensSummary {
  total_occurrences: number;
  families: CountSummary[];
  alias_depths: CountSummary[];
  top: TokenEvidenceSummary[];
  semantic_or_themed: TokenEvidenceSummary[];
  unresolved: TokenEvidenceSummary[];
}

export interface CountSummary {
  name: string;
  count: number;
  occurrences?: number;
}

export interface TokenEvidenceSummary {
  id: string;
  name: string;
  resolved_value: string;
  occurrences: number;
  alias_depth: number;
  alias_chain?: string[];
  by_theme?: Record<string, string>;
  source?: string;
  resolution?: ResolutionSummary;
}

export interface SurveyComponentsSummary {
  discovered_via: CountSummary[];
  with_variants: number;
  with_sizes: number;
  top: ComponentEvidenceSummary[];
  omitted: number;
}

export interface ComponentEvidenceSummary {
  id: string;
  name: string;
  discovered_via: ComponentRow["discovered_via"];
  variants?: string[];
  sizes?: string[];
  source?: string;
}

export interface SurveyUiSurfacesSummary {
  groups: UiSurfaceGroupSummary[];
  surfaces: UiSurfaceEvidenceSummary[];
  omitted: number;
}

export interface UiSurfaceGroupSummary {
  key: string;
  count: number;
  examples: UiSurfaceEvidenceSummary[];
}

export interface UiSurfaceEvidenceSummary {
  id: string;
  name: string;
  kind: UiSurfaceRow["kind"];
  locator: string;
  renderability: UiSurfaceRow["renderability"];
  files_count: number;
  classification?: UiSurfaceClassification;
  signals: UiSurfaceSignals;
  source?: string;
}

export interface BudgetLimits {
  valuesPerKind: number;
  tokens: number;
  components: number;
  surfaces: number;
  arbitraryValues: number;
  unresolvedValues: number;
  tokenFamilies: number;
  tokenAliasDepths: number;
  themedTokens: number;
  unresolvedTokens: number;
  componentSources: number;
  surfaceGroups: number;
  groupExamples: number;
  signalItems: number;
  resolutionChain: number;
}
