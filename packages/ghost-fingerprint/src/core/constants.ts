/** Canonical directory for the Ghost fingerprint package. */
export const FINGERPRINT_PACKAGE_DIR = ".ghost/fingerprint";

/** Canonical filename for the non-enforcing design-language prior. */
export const PROFILE_FILENAME = "profile.md";

/**
 * @deprecated Internal alias kept while older compare/evolution helpers are
 * renamed. New user-facing flows must say `profile.md`.
 */
export const FINGERPRINT_FILENAME = PROFILE_FILENAME;

/** Directory containing scoped fingerprint overlays. */
export const FINGERPRINTS_DIRNAME = "fingerprints";

/** Directory containing per-scope survey artifacts. */
export const SCOPE_SURVEYS_DIRNAME = "modules";

/** Canonical filename for human-promoted deterministic gates. */
export const CHECKS_FILENAME = "checks.yml";
