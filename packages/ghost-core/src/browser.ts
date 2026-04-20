// Browser-safe re-exports. Each import below is a *deep* path into a
// specific module — never a sub-barrel — so the module graph bundlers
// walk never touches files that import `node:fs`, `node:path`, or
// similar. If you add an export here, verify the file you're pulling
// from does not (transitively) import node internals.

// NOTE: the top-level `compare` verb is deliberately NOT re-exported —
// it pulls in `evolution/temporal.js` and `evolution/sync.js`, which
// use `node:fs`. For browser-side comparison, use `compareFingerprints`
// from `./embedding/compare.js` or `embeddingDistance` directly.
export { compareFingerprints } from "./embedding/compare.js";
export { describeFingerprint } from "./embedding/describe.js";
export { computeEmbedding, embeddingDistance } from "./embedding/embedding.js";
export type { RoleCandidate } from "./embedding/semantic-roles.js";
export { inferSemanticRole } from "./embedding/semantic-roles.js";
export { DIMENSION_RANGES } from "./evolution/vector.js";
export type { BodyData } from "./fingerprint/body.js";
export { parseBody } from "./fingerprint/body.js";
export type { DesignDecision } from "./fingerprint/compose.js";
export { mergeFingerprint } from "./fingerprint/compose.js";
export type {
  ColorChange,
  DecisionChange,
  SemanticDiff,
  TokenChange,
} from "./fingerprint/diff.js";
export { diffFingerprints, formatSemanticDiff } from "./fingerprint/diff.js";
export type {
  FingerprintMeta,
  FrontmatterData,
} from "./fingerprint/frontmatter.js";
export type {
  LintIssue,
  LintOptions,
  LintReport,
  LintSeverity,
} from "./fingerprint/lint.js";
export { lintFingerprint } from "./fingerprint/lint.js";
export type { ParsedFingerprint, ParseOptions } from "./fingerprint/parser.js";
export { parseFingerprint, splitRaw } from "./fingerprint/parser.js";
export type { FrontmatterShape } from "./fingerprint/schema.js";
export {
  FrontmatterSchema,
  toJsonSchema,
  validateFrontmatter,
} from "./fingerprint/schema.js";
export type {
  ColorRamp,
  CSSToken,
  DesignObservation,
  DimensionAck,
  DimensionDelta,
  DimensionStance,
  DriftVector,
  EmbeddingConfig,
  Fingerprint,
  FingerprintComparison,
  FontDescriptor,
  RuleSeverity,
  SemanticColor,
  TokenCategory,
} from "./types.js";
