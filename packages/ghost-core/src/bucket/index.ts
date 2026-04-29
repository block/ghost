/**
 * Public surface for `ghost.bucket/v1` — types, schemas, ID generation,
 * lint, and merge. Consumed by `ghost-expression` and any future ghost
 * tool that operates on bucket data.
 */

export { recomputeBucketIds } from "./fix-ids.js";
export {
  componentRowId,
  libraryRowId,
  tokenRowId,
  valueRowId,
} from "./id.js";
export {
  BUCKET_FILENAME,
  type BucketLintIssue,
  type BucketLintReport,
  type BucketLintSeverity,
  lintBucket,
} from "./lint.js";
export { mergeBuckets } from "./merge.js";
export {
  BucketSchema,
  BucketSourceSchema,
  ColorSpecSchema,
  ComponentRowSchema,
  LibraryRowSchema,
  RECOMMENDED_VALUE_KINDS,
  TokenRowSchema,
  ValueRowSchema,
  ValueSpecSchema,
} from "./schema.js";
export type {
  BreakpointSpec,
  Bucket,
  BucketSource,
  ColorSpec,
  ComponentRow,
  LayoutPrimitiveSpec,
  LibraryRow,
  MotionSpec,
  RadiusSpec,
  RecommendedValueKind,
  RowBase,
  ScalarUnit,
  ShadowSpec,
  SpacingSpec,
  TokenRow,
  TypographySpec,
  UnknownSpec,
  ValueRow,
  ValueSpec,
} from "./types.js";
