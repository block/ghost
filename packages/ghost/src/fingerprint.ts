/** @deprecated Import from `@design-intelligence/ghost/package`. */
export {
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
} from "./scan/constants.js";
export type {
  FingerprintPackagePaths,
  InitFingerprintPackageOptions,
  InitFingerprintPackageResult,
  LoadedFingerprintPackage,
} from "./scan/fingerprint-package.js";
export {
  initFingerprintPackage,
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./scan/fingerprint-package.js";
export type { LintIssue, LintReport, LintSeverity } from "./scan/lint.js";
