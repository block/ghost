/**
 * Public surface for `ghost.survey/v2` — types, schemas, ID generation,
 * lint, and merge. Consumed by `ghost-expression` and any future ghost
 * tool that operates on survey data.
 */

export { recomputeSurveyIds } from "./fix-ids.js";
export {
  componentRowId,
  tokenRowId,
  uiSurfaceRowId,
  valueRowId,
} from "./id.js";
export {
  lintSurvey,
  SURVEY_FILENAME,
  type SurveyLintIssue,
  type SurveyLintReport,
  type SurveyLintSeverity,
} from "./lint.js";
export { mergeSurveys } from "./merge.js";
export {
  ColorSpecSchema,
  ComponentRowSchema,
  RECOMMENDED_VALUE_KINDS,
  ResolutionSchema,
  SurveySchema,
  SurveySourceSchema,
  TokenRowSchema,
  UiSurfaceClassificationSchema,
  UiSurfaceKindSchema,
  UiSurfaceRenderabilitySchema,
  UiSurfaceRowSchema,
  UiSurfaceSignalsSchema,
  ValueRowSchema,
  ValueSpecSchema,
} from "./schema.js";
export type {
  BreakpointSpec,
  ColorSpec,
  ComponentRow,
  LayoutPrimitiveSpec,
  MotionSpec,
  RadiusSpec,
  RecommendedValueKind,
  Resolution,
  RowBase,
  ScalarUnit,
  ShadowSpec,
  SpacingSpec,
  Survey,
  SurveySource,
  TokenRow,
  TypographySpec,
  UiSurfaceClassification,
  UiSurfaceDensity,
  UiSurfaceKind,
  UiSurfaceLayoutShape,
  UiSurfaceRenderability,
  UiSurfaceRow,
  UiSurfaceSignals,
  UnknownSpec,
  ValueRow,
  ValueSpec,
} from "./types.js";
