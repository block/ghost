/**
 * Static lookup tables for the deterministic repository inventory pass.
 * No logic here — just the curated, OSS-generalizable signal vocabulary.
 */

/**
 * Canonical package manifests we scan for at the inventoried root.
 *
 * Matched against immediate children of the root only — nested manifests
 * live in `language_histogram` / `top_level_tree`. The list aims to be
 * OSS-generalizable; organization-specific manifests are deliberately omitted.
 */
export const PACKAGE_MANIFEST_NAMES = [
  // Node / web
  "package.json",
  // Rust
  "Cargo.toml",
  // Python
  "pyproject.toml",
  "Pipfile",
  "setup.py",
  // Go
  "go.mod",
  // Swift / iOS
  "Package.swift",
  "Package.resolved",
  // Flutter / Dart
  "pubspec.yaml",
  // JVM — Maven
  "pom.xml",
  // JVM — Gradle
  "settings.gradle",
  "settings.gradle.kts",
  "build.gradle",
  "build.gradle.kts",
  // JVM — Bazel
  "WORKSPACE",
  "WORKSPACE.bazel",
  "MODULE.bazel",
  "BUILD.bazel",
  ".bazelversion",
  // Ruby
  "Gemfile",
  "Gemfile.lock",
  // Elixir
  "mix.exs",
  // PHP
  "composer.json",
] as const;

/** Regex matchers for less-stable manifest names (added to package_manifests). */
export const PACKAGE_MANIFEST_PATTERNS: RegExp[] = [
  /\.podspec$/, // CocoaPods (iOS)
  /\.gemspec$/, // RubyGems
];

/**
 * Config files we look for anywhere under the root. Weak signals the host
 * agent reads to confirm what a repo actually is.
 */
export const CONFIG_FILE_EXACT = new Set<string>([
  "tsconfig.json",
  "tokens.css",
  "tokens.json",
  "colors.xml",
  "themes.xml",
  "Theme.kt",
  "Color.kt",
  "Theme.swift",
  "registry.json",
]);

/** Patterns matched against the basename of any file under root. */
export const CONFIG_FILE_PATTERNS: RegExp[] = [
  /^tailwind\.config\.[cm]?[jt]sx?$/,
  /^vite\.config\.[cm]?[jt]sx?$/,
  /^next\.config\.[cm]?[jt]sx?$/,
  /^Color\+.+\.swift$/,
  /^style-dictionary\.config\.[cm]?[jt]sx?$/,
  /^style-dictionary\.config\.json$/,
  /^webpack\.config\.[cm]?[jt]sx?$/,
  /^rollup\.config\.[cm]?[jt]sx?$/,
  /^parcel\.config\.[cm]?[jt]sx?$/,
  /^esbuild\.config\.[cm]?[jt]sx?$/,
];

/** Basenames that indicate a Style Dictionary token pipeline lives nearby. */
export const STYLE_DICTIONARY_FILES = new Set<string>([
  "style-dictionary.config.js",
  "style-dictionary.config.cjs",
  "style-dictionary.config.mjs",
  "style-dictionary.config.ts",
  "style-dictionary.config.json",
]);

/** Maps a build-tool hint (from the `build_system` enum) to its basename matcher. */
export interface BuildToolMatcher {
  hint: string;
  matches: (basename: string) => boolean;
}

export const BUILD_TOOL_MATCHERS: BuildToolMatcher[] = [
  { hint: "vite", matches: (n) => /^vite\.config\.[cm]?[jt]sx?$/.test(n) },
  {
    hint: "webpack",
    matches: (n) => /^webpack\.config\.[cm]?[jt]sx?$/.test(n),
  },
  { hint: "rollup", matches: (n) => /^rollup\.config\.[cm]?[jt]sx?$/.test(n) },
  { hint: "parcel", matches: (n) => /^parcel\.config\.[cm]?[jt]sx?$/.test(n) },
  {
    hint: "esbuild",
    matches: (n) => /^esbuild\.config\.[cm]?[jt]sx?$/.test(n),
  },
  { hint: "nx", matches: (n) => n === "nx.json" },
  { hint: "turbo", matches: (n) => n === "turbo.json" },
];

/** Language-name lookup keyed by lowercase extension (no leading dot). */
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  swift: "swift",
  m: "objective-c",
  mm: "objective-c",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  hpp: "cpp",
  hh: "cpp",
  cs: "csharp",
  dart: "dart",
  scala: "scala",
  php: "php",
  vue: "vue",
  svelte: "svelte",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  xml: "xml",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "markdown",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
};

/** Directories we don't walk into when computing histograms / configs. */
export const SKIP_DIRS = new Set<string>([
  ".git",
  "node_modules",
  ".pnpm",
  ".yarn",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".gradle",
  ".idea",
  ".vscode",
  ".fleet",
  "build",
  "dist",
  "out",
  "target",
  "coverage",
  "Pods",
  "DerivedData",
  ".cxx",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "venv",
  ".venv",
  "vendor",
  "bin",
  "obj",
]);

/** Directory-name prefixes that indicate a build/output tree (bazel-*, dist-*). */
export const SKIP_DIR_PREFIXES: readonly string[] = ["bazel-", "dist-"];

/** Directory basenames that signal a token / theme pipeline lives there. */
export const TOKEN_DIR_BASENAMES = new Set<string>([
  "tokens",
  "design-tokens",
  "design_tokens",
  "theme",
  "themes",
]);

/** Path segments that indicate a file lives under a design-system tree. */
export const DS_ANCESTOR_SEGMENTS: ReadonlySet<string> = new Set([
  "design-system",
  "design_system",
  "designsystem",
  "tokens",
  "design-tokens",
  "design_tokens",
  "theme",
  "themes",
  "styles",
]);

/** Cap how many files we keep in the histogram output. */
export const HISTOGRAM_TOP_N = 20;

/** The closed set of values `platform_hints` may emit (mirrors the map enum). */
export const PLATFORM_ENUM_VALUES: ReadonlySet<string> = new Set([
  "web",
  "ios",
  "android",
  "desktop",
  "flutter",
  "mixed",
  "other",
]);

/** Conventional one-level workspace directories scanned in addition to root. */
export const CONVENTIONAL_WORKSPACE_DIRS = [
  "apps",
  "packages",
  "libs",
  "common",
] as const;
