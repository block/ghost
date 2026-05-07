export type {
  ColorRamp,
  ComponentMeta,
  CompositeCluster,
  CompositeComparison,
  CompositeMember,
  CompositePair,
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
  EnrichedFingerprint,
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  Fingerprint,
  FingerprintComparison,
  FingerprintHistoryEntry,
  FontDescriptor,
  GhostConfig,
  NormalizedToken,
  Registry,
  RegistryFile,
  RegistryItem,
  RegistryItemType,
  ResolvedRegistry,
  RoleCandidate,
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
} from "@ghost/core";
export {
  compareFingerprints,
  computeEmbedding,
  computeSemanticEmbedding,
  describeFingerprint,
  embeddingDistance,
  inferSemanticRole,
} from "@ghost/core";
export type {
  GhostDriftChangedFile,
  GhostDriftChangedLine,
  GhostDriftCheckFinding,
  GhostDriftCheckOptions,
  GhostDriftCheckReport,
  GhostDriftRoutedFile,
} from "./check.js";
export {
  formatGhostDriftCheckMarkdown,
  parseUnifiedDiff,
  runGhostDriftCheck,
} from "./check.js";
export type { CompareOptions, CompareResult } from "./compare.js";
export { compare } from "./compare.js";
export { defineConfig, loadConfig, resolveTarget } from "./config.js";
export type {
  CheckBoundsOptions,
  CompositeClusterOptions,
} from "./evolution/index.js";
export {
  acknowledge,
  appendHistory,
  checkBounds,
  compareComposite,
  computeDriftVectors,
  computeTemporalComparison,
  DIMENSION_RANGES,
  emitFingerprint,
  normalizeTrackedSource,
  readHistory,
  readRecentHistory,
  readSyncManifest,
  resolveTrackedFingerprint,
  writeSyncManifest,
} from "./evolution/index.js";
export {
  formatCompositeComparison,
  formatCompositeComparisonJSON,
} from "./reporters/composite.js";
export {
  formatComparison,
  formatComparisonJSON,
  formatFingerprint,
  formatFingerprintJSON,
} from "./reporters/fingerprint.js";
export {
  formatTemporalComparison,
  formatTemporalComparisonJSON,
} from "./reporters/temporal.js";
export type {
  PathFingerprintResolution,
  ResolveFingerprintsForPathsOptions,
} from "./scope-resolver.js";
export { resolveFingerprintsForPaths } from "./scope-resolver.js";
