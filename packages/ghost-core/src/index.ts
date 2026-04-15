export {
  BaseAgent,
  ComparisonAgent,
  ComplianceAgent,
  Director,
  DiscoveryAgent,
  ExtractionAgent,
  FingerprintAgent,
} from "./agents/index.js";
export type {
  Agent,
  AgentState,
  ComparisonInput,
  ComplianceInput,
  ComplianceReport,
  ComplianceRule,
  ComplianceThresholds,
  ComplianceViolation,
  DiscoveredSystem,
  DiscoveryInput,
} from "./agents/index.js";
export { defineConfig, loadConfig, resolveTarget } from "./config.js";
export type { ComponentDiff, DiffResult, DiffSeverity } from "./diff.js";
export { diff } from "./diff.js";
export {
  acknowledge,
  appendHistory,
  checkBounds,
  compareFleet,
  computeDriftVectors,
  computeTemporalComparison,
  DIMENSION_RANGES,
  emitFingerprint,
  normalizeParentSource,
  readHistory,
  readRecentHistory,
  readSyncManifest,
  resolveParent,
  writeSyncManifest,
} from "./evolution/index.js";
export type { CheckBoundsOptions } from "./evolution/index.js";
export type { FleetClusterOptions } from "./evolution/index.js";
export {
  detectExtractors,
  extract,
  extractFromTarget,
  sampleDirectory,
  walkAndCategorize,
  walkDirectory,
} from "./extractors/index.js";
export type { CompareOptions } from "./fingerprint/compare.js";
export {
  compareFingerprints,
  computeEmbedding,
  computeSemanticEmbedding,
  describeFingerprint,
  embeddingDistance,
  fingerprintFromRegistry,
  inferSemanticRole,
} from "./fingerprint/index.js";
export type { RoleCandidate } from "./fingerprint/index.js";
export {
  analyzeStructure,
  createProvider,
  validateFingerprint,
} from "./llm/index.js";
export type {
  FingerprintValidation,
  StructuralAnalysis,
  ValidationIssue,
} from "./llm/index.js";
export type { ProfileOptions, ProfileResult, ProfileTargetResult } from "./profile.js";
export { profile, profileRegistry, profileTarget, profileWithAnalysis } from "./profile.js";
export { formatReport as formatCLIReport } from "./reporters/cli.js";
export {
  formatComplianceCLI,
  formatComplianceJSON,
  formatComplianceSARIF,
} from "./reporters/compliance.js";
export {
  formatDiscoveryCLI,
  formatDiscoveryJSON,
} from "./reporters/discovery.js";
export { formatDiffCLI, formatDiffJSON } from "./reporters/diff.js";
export {
  formatComparison,
  formatComparisonJSON,
  formatFingerprint,
  formatFingerprintJSON,
} from "./reporters/fingerprint.js";
export {
  formatFleetComparison,
  formatFleetComparisonJSON,
} from "./reporters/fleet.js";
export { formatReport as formatJSONReport } from "./reporters/json.js";
export {
  formatTemporalComparison,
  formatTemporalComparisonJSON,
} from "./reporters/temporal.js";
export { parseCSS } from "./resolvers/css.js";
export { review } from "./review/index.js";
export type { ReviewOptions } from "./review/index.js";
export { formatReviewCLI } from "./reporters/review-cli.js";
export { formatReviewJSON } from "./reporters/review-json.js";
export {
  formatGitHubPRComments,
  formatIssueComment,
  formatReviewSummary,
} from "./reporters/github-pr.js";
export type { GitHubPRComment } from "./reporters/github-pr.js";
export { resolveRegistry } from "./resolvers/registry.js";
export { detectTailwind, resolveTailwindConfig } from "./resolvers/tailwind.js";
export { scan } from "./scan.js";
export { scanVisual } from "./scanners/visual.js";
export { getToolDefinitions, FINGERPRINT_TOOLS } from "./agents/tools/index.js";
export type {
  AgentTool,
  ChatMessage,
  ChatResponse,
  ToolCall,
  ToolContext,
  ToolDefinition,
  ToolResult,
} from "./agents/tools/index.js";
// Pipeline stages — plain async functions replacing agent classes
export {
  compare as compareStage,
  comply as complyStage,
  extract as extractStage,
  materializeTarget,
} from "./stages/index.js";
export type {
  CompareInput,
  StageContext,
  StageResult,
} from "./stages/index.js";
export type {
  AgentContext,
  AgentMessage,
  AgentResult,
  AgentsConfig,
  ColorRamp,
  ComponentMeta,
  CSSToken,
  CSSVarsMap,
  DesignFingerprint,
  DesignLanguageProfile,
  DesignSystemReport,
  DetectedFormat,
  DimensionAck,
  DimensionDelta,
  DimensionStance,
  DivergenceClass,
  DriftReport,
  DriftSummary,
  DriftVector,
  DriftVelocity,
  EmbeddingConfig,
  EnrichedComparison,
  EnrichedFingerprint,
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  FingerprintComparison,
  FingerprintHistoryEntry,
  FleetCluster,
  FleetComparison,
  FleetMember,
  FleetPair,
  FontDescriptor,
  GhostConfig,
  LLMConfig,
  LLMProvider,
  NormalizedToken,
  SampledFile,
  SampledMaterial,
  Registry,
  RegistryFile,
  RegistryItem,
  RegistryItemType,
  ResolvedRegistry,
  RuleSeverity,
  ScanOptions,
  SemanticColor,
  StructureDrift,
  SyncManifest,
  Target,
  TargetOptions,
  TargetType,
  TemporalComparison,
  TokenCategory,
  TokenFormat,
  ValueDrift,
  VisualDrift,
  VisualScanConfig,
  CollectedFile,
  ReviewConfig,
  ReviewDimension,
  ReviewFileResult,
  ReviewFix,
  ReviewIssue,
  ReviewReport,
  ReviewSeverity,
  ReviewSummary,
} from "./types.js";
