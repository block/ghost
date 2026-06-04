import type { ValueSpec } from "./types.js";

export interface SurveyCatalogOptions {
  kind?: string;
}

export interface SurveyValueCatalog {
  schema: "ghost.survey.catalog/v1";
  source_schema: "ghost.survey/v1";
  filter?: {
    kind?: string;
  };
  counts: SurveyCatalogCounts;
  kinds: SurveyCatalogKind[];
}

export interface SurveyCatalogCounts {
  kinds: number;
  values: number;
  rows: number;
  total_occurrences: number;
}

export interface SurveyCatalogKind {
  kind: string;
  values: SurveyCatalogValue[];
  rows: number;
  occurrences: number;
  files_count: number;
}

export interface SurveyCatalogValue {
  value: string;
  rows: number;
  occurrences: number;
  files_count: number;
  ids: string[];
  raws: string[];
  usage?: Record<string, number>;
  role_hypotheses?: string[];
  specs?: ValueSpec[];
  sources: string[];
  resolution_statuses?: string[];
}
