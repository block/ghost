export { defineConfig, loadConfig } from "./config.js";
export { scan } from "./scan.js";
export { resolveRegistry } from "./resolvers/registry.js";
export { parseCSS } from "./resolvers/css.js";
export { formatReport as formatCLIReport } from "./reporters/cli.js";
export { formatReport as formatJSONReport } from "./reporters/json.js";
export { scanVisual } from "./scanners/visual.js";
export type {
  GhostConfig,
  DesignSystemConfig,
  Registry,
  RegistryItem,
  RegistryFile,
  ResolvedRegistry,
  CSSToken,
  TokenCategory,
  DriftReport,
  DriftSummary,
  DesignSystemReport,
  ValueDrift,
  StructureDrift,
  VisualDrift,
  VisualScanConfig,
  ScanOptions,
  RuleSeverity,
} from "./types.js";
