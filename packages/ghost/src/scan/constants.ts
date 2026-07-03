/** Canonical directory for the Ghost fingerprint package. */
export const FINGERPRINT_PACKAGE_DIR = ".ghost";

/** Portable fingerprint package manifest filename. */
export const FINGERPRINT_MANIFEST_FILENAME = "manifest.yml";

/** Reserved package-root glossary filename. */
export const GHOST_GLOSSARY_FILENAME = "glossary.md";

/** Append-only local observability tape for gather/pull events. */
export const GHOST_EVENTS_FILENAME = ".events";

/** Legacy local pull-history tape, retained for compatibility only. */
export const LEGACY_PULL_HISTORY_FILENAME = ".pulls";

/**
 * Legacy facet filenames — retained only so the loader can detect a
 * pre-graph package and guide the user to `ghost migrate`.
 */
export const FINGERPRINT_INTENT_FILENAME = "intent.yml";
export const FINGERPRINT_INVENTORY_FILENAME = "inventory.yml";
export const FINGERPRINT_COMPOSITION_FILENAME = "composition.yml";
