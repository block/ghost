import type { LoadedFingerprintPackage } from "@anarchitecture/ghost-fingerprint/fingerprint";
import {
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "@anarchitecture/ghost-fingerprint/fingerprint";
import { resolveGhostDirDefault } from "@anarchitecture/ghost-fingerprint/scan";

export type { LoadedFingerprintPackage };

export interface LoadFingerprintOptions {
  /** Explicit `.ghost/` package dir (overrides GHOST_PACKAGE_DIR + default). */
  ghostDir?: string;
  cwd?: string;
}

/**
 * Resolve and load the repo's `.ghost/` fingerprint package, or `null` when
 * none resolves (absent or broken — `ghost validate` owns diagnosing a broken
 * one). `ghost-haunt validate` treats null as a warning/info; `ghost-haunt review` treats
 * it as a hard error (fingerprint truths are the review baseline).
 */
export async function loadFingerprint(
  options: LoadFingerprintOptions = {},
): Promise<LoadedFingerprintPackage | null> {
  const cwd = options.cwd ?? process.cwd();
  try {
    // An explicit --ghost-dir may be absolute; only the env/default path goes
    // through resolveGhostDirDefault (which enforces a relative repo dir).
    const ghostDir = options.ghostDir ?? resolveGhostDirDefault();
    const paths = resolveFingerprintPackage(ghostDir, cwd);
    return await loadFingerprintPackage(paths);
  } catch {
    return null;
  }
}
