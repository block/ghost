export { defineConfig, loadConfig } from "./config.js";
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
export { detectExtractors, extract } from "./extractors/index.js";
export type { CompareOptions } from "./fingerprint/compare.js";
export {
  compareFingerprints,
  computeEmbedding,
  computeSemanticEmbedding,
  describeFingerprint,
  embeddingDistance,
  fingerprintFromRegistry,
} from "./fingerprint/index.js";
export { createProvider } from "./llm/index.js";
export type { ProfileOptions } from "./profile.js";
export { profile, profileRegistry } from "./profile.js";
export { formatReport as formatCLIReport } from "./reporters/cli.js";
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
export { resolveRegistry } from "./resolvers/registry.js";
export { scan } from "./scan.js";
export { scanVisual } from "./scanners/visual.js";
export type {
  ColorRamp,
  ComponentMeta,
  CSSToken,
  CSSVarsMap,
  DesignFingerprint,
  DesignSystemConfig,
  DesignSystemReport,
  DimensionAck,
  DimensionDelta,
  DimensionStance,
  DriftReport,
  DriftSummary,
  DriftVector,
  DriftVelocity,
  EmbeddingConfig,
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
  ParentSource,
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
  TemporalComparison,
  TokenCategory,
  ValueDrift,
  VisualDrift,
  VisualScanConfig,
} from "./types.js";
