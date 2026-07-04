/** Canonical directory for the Ghost fingerprint package. */
export const FINGERPRINT_PACKAGE_DIR = ".ghost";

/** Portable fingerprint package manifest filename. */
export const FINGERPRINT_MANIFEST_FILENAME = "manifest.yml";

/** Reserved package-root glossary filename. */
export const GHOST_GLOSSARY_FILENAME = "glossary.md";

/** Reserved package-root directory for bundled materials. */
export const GHOST_MATERIALS_DIR = "materials";

/** Append-only events tape for gather/pull events. */
export const GHOST_EVENTS_FILENAME = ".events";

/** Legacy pull events tape, retained for compatibility only. */
export const LEGACY_PULL_HISTORY_FILENAME = ".pulls";

/**
 * Legacy facet filenames from the pre-flat-corpus package shape — retained
 * only so path helpers can still name them when detecting legacy packages.
 * There is no automated migration; legacy packages are re-authored by hand.
 */
export const FINGERPRINT_INTENT_FILENAME = "intent.yml";
export const FINGERPRINT_INVENTORY_FILENAME = "inventory.yml";
export const FINGERPRINT_COMPOSITION_FILENAME = "composition.yml";
