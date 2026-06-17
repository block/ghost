export {
  CACHE_DIRNAME,
  CONFIG_FILENAME,
  FINGERPRINT_DIRNAME,
  FINGERPRINT_MEMORY_DIRNAME,
  FINGERPRINT_PACKAGE_DIR,
  FINGERPRINT_SOURCES_DIRNAME,
} from "./constants.js";
export type {
  DiscoveredGhostPackage,
  FingerprintDirectoryOptions,
  GhostFingerprintStack,
  GhostFingerprintStackGroup,
  GhostFingerprintStackLayer,
  GhostFingerprintStackLayerRef,
} from "./fingerprint-stack.js";
export {
  buildFingerprintStack,
  discoverFingerprintStack,
  discoverGhostPackages,
  fingerprintPackageDisplayPath,
  GHOST_MEMORY_DIR_ENV,
  groupFingerprintStacksForPaths,
  loadFingerprintStackForPath,
  normalizeMemoryDir,
  resolveGitRoot,
  resolveMemoryDirDefault,
} from "./fingerprint-stack.js";
export { inventory } from "./inventory.js";
export type {
  ScanScopeReport,
  ScanStage,
  ScanStageReport,
  ScanStageState,
  ScanStatus,
  ScanStatusOptions,
} from "./scan-status.js";
export { scanStatus } from "./scan-status.js";
