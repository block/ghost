export { defineConfig, loadConfig } from "./config.js";
export { detectExtractors, extract } from "./extractors/index.js";
export {
  compareFingerprints,
  computeEmbedding,
  embeddingDistance,
  fingerprintFromRegistry,
} from "./fingerprint/index.js";
export { createProvider } from "./llm/index.js";
export { profile, profileRegistry } from "./profile.js";
export { formatReport as formatCLIReport } from "./reporters/cli.js";
export {
  formatComparison,
  formatComparisonJSON,
  formatFingerprint,
  formatFingerprintJSON,
} from "./reporters/fingerprint.js";
export { formatReport as formatJSONReport } from "./reporters/json.js";
export { parseCSS } from "./resolvers/css.js";
export { resolveRegistry } from "./resolvers/registry.js";
export { scan } from "./scan.js";
export { scanVisual } from "./scanners/visual.js";
export type {
  ColorRamp,
  CSSToken,
  DesignFingerprint,
  DesignSystemConfig,
  DesignSystemReport,
  DimensionDelta,
  DriftReport,
  DriftSummary,
  ExtractedFile,
  ExtractedMaterial,
  Extractor,
  ExtractorOptions,
  FingerprintComparison,
  GhostConfig,
  LLMConfig,
  LLMProvider,
  Registry,
  RegistryFile,
  RegistryItem,
  ResolvedRegistry,
  RuleSeverity,
  ScanOptions,
  SemanticColor,
  StructureDrift,
  TokenCategory,
  ValueDrift,
  VisualDrift,
  VisualScanConfig,
} from "./types.js";
