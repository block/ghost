/**
 * Shared types for `ghost.map/v1`.
 *
 * The inventory shape is the deterministic facts the CLI emits; the recipe
 * synthesizes the final `map.md` from these signals plus its own reads.
 */

/** Single language-extension bucket. */
export interface LanguageHistogramEntry {
  /** Canonical language name (lowercase). */
  name: string;
  /** Number of files matching this language's extensions. */
  files: number;
}

/** A top-level entry under the inventoried path. */
export interface TopLevelEntry {
  /** Path relative to the inventoried root, with a trailing slash for dirs. */
  path: string;
  /** Whether this entry is a directory or file. */
  kind: "dir" | "file";
  /** Direct child count (immediate children only). Files have child_count: 0. */
  child_count: number;
}

/** Best-effort git information. Either field may be null when unavailable. */
export interface GitInfo {
  /** Configured remote URL for `origin` — null when not a git repo. */
  remote: string | null;
  /** Default branch (origin/HEAD target, falling back to current branch). */
  default_branch: string | null;
}

/** Full output shape of `ghost map inventory`. */
export interface InventoryOutput {
  /** Resolved absolute path that was inventoried. */
  root: string;
  /** Coarse hints derived from manifest presence (e.g. "android" if Gradle, "ios" if podspec). */
  platform_hints: string[];
  /**
   * Coarse hints derived from manifest presence for the build system
   * (e.g. `gradle` if `settings.gradle*`, `style-dictionary` if a sibling
   * `style-dictionary.config.*` is found). Informational — the recipe
   * authors the authoritative `build_system` value in `map.md`.
   */
  build_system_hints: string[];
  /** Files-per-language histogram, sorted desc by `files`. Top 20. */
  language_histogram: LanguageHistogramEntry[];
  /**
   * Canonical package manifests. Root entries are basenames
   * (`package.json`); workspace-expanded entries are POSIX relative paths
   * (`packages/foo/package.json`). Sorted lexicographically, deduped.
   */
  package_manifests: string[];
  /** Candidate config files matched anywhere under root (relative paths, sorted). */
  candidate_config_files: string[];
  /** registry.json files matched anywhere under root. */
  registry_files: string[];
  /** Top-level (one level deep) directory tree. */
  top_level_tree: TopLevelEntry[];
  /** Best-effort git remote URL. */
  git_remote: string | null;
  /** Best-effort git default branch. */
  git_default_branch: string | null;
}
