export { defineConfig, loadConfig } from "./config.js";
export { formatReport as formatCLIReport } from "./reporters/cli.js";
export { formatReport as formatJSONReport } from "./reporters/json.js";
export { parseCSS } from "./resolvers/css.js";
export { resolveRegistry } from "./resolvers/registry.js";
export { scan } from "./scan.js";
export { scanVisual } from "./scanners/visual.js";
export type {
  CSSToken,
  DesignSystemConfig,
  DesignSystemReport,
  DriftReport,
  DriftSummary,
  GhostConfig,
  Registry,
  RegistryFile,
  RegistryItem,
  ResolvedRegistry,
  RuleSeverity,
  ScanOptions,
  StructureDrift,
  TokenCategory,
  ValueDrift,
  VisualDrift,
  VisualScanConfig,
} from "./types.js";
