export type {
  DiscoveredSystem,
  DiscoveryInput,
  DiscoveryResult,
} from "./agents/index.js";
export { discover } from "./agents/index.js";
export type { CompareOptions, CompareResult } from "./compare.js";
export { compare } from "./compare.js";
export { defineConfig, loadConfig, resolveTarget } from "./config.js";
export type {
  ContextFormat,
  EmitReviewInput,
  WriteContextOptions,
  WriteContextResult,
} from "./context/index.js";
export {
  buildSkillMd,
  buildTokensCss,
  emitReviewCommand,
  writeContextBundle,
} from "./context/index.js";
export type { RoleCandidate } from "./embedding/index.js";
export {
  compareExpressions,
  computeEmbedding,
  computeSemanticEmbedding,
  describeExpression,
  embeddingDistance,
  inferSemanticRole,
} from "./embedding/index.js";
export type {
  CheckBoundsOptions,
  FleetClusterOptions,
} from "./evolution/index.js";
export {
  acknowledge,
  appendHistory,
  checkBounds,
  compareFleet,
  computeDriftVectors,
  computeTemporalComparison,
  DIMENSION_RANGES,
  emitExpression,
  normalizeParentSource,
  readHistory,
  readRecentHistory,
  readSyncManifest,
  resolveParent,
  writeSyncManifest,
} from "./evolution/index.js";
export type {
  BodyData,
  ColorChange,
  DecisionChange,
  ExpressionMeta,
  FrontmatterData,
  FrontmatterShape,
  LintIssue,
  LintOptions,
  LintReport,
  LintSeverity,
  ParsedExpression,
  SemanticDiff,
  TokenChange,
} from "./expression/index.js";
export {
  diffExpressions,
  EMBEDDING_FRAGMENT_FILENAME,
  EXPRESSION_FILENAME,
  EXPRESSION_SCHEMA_VERSION,
  embeddingSiblingPath,
  FrontmatterSchema,
  findFragmentLinks,
  formatSemanticDiff,
  lintExpression,
  loadEmbeddingFragment,
  loadExpression,
  parseBody,
  parseExpression,
  resolveEmbeddingReference,
  serializeEmbeddingFragment,
  serializeExpression,
  splitRaw,
  toJsonSchema,
  validateFrontmatter,
} from "./expression/index.js";
export {
  sampleDirectory,
  walkAndCategorize,
  walkDirectory,
} from "./extractors/index.js";
export type { StagedSource, StagedTargets } from "./extractors/stage.js";
export { stageTargets } from "./extractors/stage.js";
export type {
  BuildGenerationPromptOptions,
  GenerateAttempt,
  GenerateFormat,
  GenerateOptions,
  GenerateResult,
} from "./generate/index.js";
export {
  buildGenerationPrompt,
  extractHtml,
  generate,
} from "./generate/index.js";
export type {
  ExpressionValidation,
  ValidationIssue,
} from "./llm/index.js";
export { createProvider, validateExpression } from "./llm/index.js";
export type {
  ProfileOptions,
  ProfileResult,
  ProfileTargetResult,
} from "./profile.js";
export { profile, profileTarget, profileTargets } from "./profile.js";
export {
  formatComplianceCLI,
  formatComplianceJSON,
  formatComplianceSARIF,
} from "./reporters/compliance.js";
export {
  formatDiscoveryCLI,
  formatDiscoveryJSON,
} from "./reporters/discovery.js";
export {
  formatComparison,
  formatComparisonJSON,
  formatExpression,
  formatExpressionJSON,
} from "./reporters/expression.js";
export {
  formatFleetComparison,
  formatFleetComparisonJSON,
} from "./reporters/fleet.js";
export type { GitHubPRComment } from "./reporters/github-pr.js";
export {
  formatGitHubPRComments,
  formatIssueComment,
  formatReviewSummary,
} from "./reporters/github-pr.js";
export { formatReviewCLI } from "./reporters/review-cli.js";
export { formatReviewJSON } from "./reporters/review-json.js";
export {
  formatTemporalComparison,
  formatTemporalComparisonJSON,
} from "./reporters/temporal.js";
export type {
  ComplianceInput,
  ComplianceReport,
  ComplianceRule,
  ComplianceThresholds,
  ComplianceViolation,
  ReviewOptions,
} from "./review/index.js";
export { comply, review } from "./review/index.js";
export type {
  AgentContext,
  AgentMessage,
  AgentResult,
  AgentsConfig,
  CollectedFile,
  ColorRamp,
  ComponentMeta,
  CSSToken,
  CSSVarsMap,
  DesignDecision,
  DesignObservation,
  DetectedFormat,
  DimensionAck,
  DimensionDelta,
  DimensionStance,
  DivergenceClass,
  DriftVector,
  DriftVelocity,
  EmbeddingConfig,
  EnrichedComparison,
  EnrichedExpression,
  Expression,
  ExpressionComparison,
  ExpressionHistoryEntry,
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  FleetCluster,
  FleetComparison,
  FleetMember,
  FleetPair,
  FontDescriptor,
  GhostConfig,
  LLMConfig,
  LLMProvider,
  NormalizedToken,
  Registry,
  RegistryFile,
  RegistryItem,
  RegistryItemType,
  ResolvedRegistry,
  ReviewConfig,
  ReviewDimension,
  ReviewFileResult,
  ReviewFix,
  ReviewIssue,
  ReviewReport,
  ReviewSeverity,
  ReviewSummary,
  RuleSeverity,
  SampledFile,
  SampledMaterial,
  SemanticColor,
  SourceInfo,
  StructureDrift,
  SyncManifest,
  Target,
  TargetOptions,
  TargetType,
  TemporalComparison,
  TokenCategory,
  TokenFormat,
  ValueDrift,
} from "./types.js";
export type {
  DimensionRollup,
  DriftClassification,
  PromptResult,
  PromptSuite,
  SuiteDimension,
  SuitePrompt,
  VerifyAggregate,
  VerifyOptions,
} from "./verify/index.js";
export {
  aggregate as aggregateVerify,
  formatVerifyCLI,
  loadPromptSuite,
  verify,
} from "./verify/index.js";
