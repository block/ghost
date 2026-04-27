import { execFileSync } from "node:child_process";
import { type Dirent, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type {
  GitInfo,
  InventoryOutput,
  LanguageHistogramEntry,
  TopLevelEntry,
} from "./types.js";

/**
 * Canonical package manifests we scan for at the inventoried root.
 *
 * These are matched against immediate children of the root only — nested
 * manifests live in `language_histogram` / `top_level_tree` instead.
 *
 * The list aims to be OSS-generalizable across the major language
 * ecosystems an agent might encounter. Organization-specific manifests
 * (kochiku.yml, .sqiosbuild.json, …) are deliberately omitted.
 */
const PACKAGE_MANIFEST_NAMES = [
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

/**
 * Regex matchers for less-stable manifest names. Files matching at the root
 * are added to `package_manifests`.
 */
const PACKAGE_MANIFEST_PATTERNS: RegExp[] = [
  /\.podspec$/, // CocoaPods (iOS)
  /\.gemspec$/, // RubyGems
];

/**
 * Config files we look for anywhere under the root (depth-limited).
 *
 * These are weak signals — the host agent reads them to confirm what a repo
 * actually is. We collect them so the recipe doesn't need to re-scan.
 */
const CONFIG_FILE_EXACT = new Set<string>([
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
const CONFIG_FILE_PATTERNS: RegExp[] = [
  /^tailwind\.config\.[cm]?[jt]sx?$/,
  /^vite\.config\.[cm]?[jt]sx?$/,
  /^next\.config\.[cm]?[jt]sx?$/,
  /^Color\+.+\.swift$/,
];

/** Language-name lookup keyed by lowercase extension (no leading dot). */
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
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

/**
 * Directories we don't walk into when computing histograms / configs.
 *
 * Universal build/cache patterns only — anything organization-specific
 * stays out. Bazel symlink directories (`bazel-bin`, `bazel-out`,
 * `bazel-testlogs`, `bazel-<repo-name>`) are skipped via the prefix
 * check in `walkTree`.
 */
const SKIP_DIRS = new Set<string>([
  // VCS
  ".git",
  // JS/TS package managers + framework caches
  "node_modules",
  ".pnpm",
  ".yarn",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  // JVM
  ".gradle",
  // IDE / tooling
  ".idea",
  ".vscode",
  ".fleet",
  // Universal output / build directories
  "build",
  "dist",
  "out",
  "target", // Rust, Maven, Scala
  "coverage",
  // Apple
  "Pods",
  "DerivedData",
  ".cxx",
  // Python
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "venv",
  ".venv",
  // Go modules / Composer / generic vendor
  "vendor",
  // C# / .NET
  "bin",
  "obj",
]);

/**
 * Directory-name prefixes that indicate a build/output tree.
 *
 * Distinct from `SKIP_DIRS` because they're not exact names. Notably:
 *   - Bazel emits `bazel-bin`, `bazel-out`, `bazel-testlogs`,
 *     `bazel-<repo-name>` symlinks at the workspace root.
 *   - Frameworks like Astro emit `dist-*` siblings.
 */
const SKIP_DIR_PREFIXES: readonly string[] = ["bazel-", "dist-"];

/**
 * Directory basenames that signal a token / theme pipeline lives there.
 * Matched anywhere in the walked tree (not just at root). Generalizable
 * across web, native, and design-token-pipeline repos.
 */
const TOKEN_DIR_BASENAMES = new Set<string>([
  "tokens",
  "design-tokens",
  "design_tokens",
  "theme",
  "themes",
]);

/**
 * Path segments that indicate a file lives under a design-system tree.
 * Used to score `candidate_config_files` so DS-ancestor matches surface
 * before incidental hits in feature folders.
 *
 * Lowercase comparison — segments are normalized before matching.
 */
const DS_ANCESTOR_SEGMENTS: ReadonlySet<string> = new Set([
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
const HISTOGRAM_TOP_N = 20;

/**
 * Run a deterministic inventory pass over the given path.
 *
 * No LLM calls, no network, no filesystem mutations. Pure reads plus a
 * best-effort git invocation.
 */
export function inventory(path: string): InventoryOutput {
  const root = resolve(path);

  const packageManifests = collectRootManifests(root);

  const walkResult = walkTree(root);
  const languageHistogram = topLanguages(walkResult.languageCounts);
  const candidateConfigFiles = orderConfigCandidates(
    walkResult.configFiles,
    root,
  );
  const registryFiles = sortRelative(walkResult.registryFiles, root);
  const topLevelTree = readTopLevel(root);
  const git = readGit(root);

  // Token directories surface as additional config candidates so the
  // recipe can find directory-shaped token graphs without a separate scan.
  for (const tokenDir of orderConfigCandidates(walkResult.tokenDirs, root)) {
    const withSlash = tokenDir.endsWith("/") ? tokenDir : `${tokenDir}/`;
    if (!candidateConfigFiles.includes(withSlash)) {
      candidateConfigFiles.push(withSlash);
    }
  }

  const platformHints = derivePlatformHints(
    packageManifests,
    languageHistogram,
    walkResult,
  );

  return {
    root,
    platform_hints: platformHints,
    language_histogram: languageHistogram,
    package_manifests: packageManifests,
    candidate_config_files: candidateConfigFiles,
    registry_files: registryFiles,
    top_level_tree: topLevelTree,
    git_remote: git.remote,
    git_default_branch: git.default_branch,
  };
}

interface WalkResult {
  languageCounts: Map<string, number>;
  configFiles: string[];
  registryFiles: string[];
  /** Directories whose basename matched a token-pipeline pattern. */
  tokenDirs: string[];
  /** True if any `AndroidManifest.xml` was found under the root. */
  hasAndroidManifest: boolean;
  /** True if any `*.xcodeproj/project.pbxproj` was found under the root. */
  hasXcodeProject: boolean;
}

function walkTree(root: string): WalkResult {
  const languageCounts = new Map<string, number>();
  const configFiles: string[] = [];
  const registryFiles: string[] = [];
  const tokenDirs: string[] = [];
  let hasAndroidManifest = false;
  let hasXcodeProject = false;

  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    if (!dir) continue;

    let entries: Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) continue;
        if (entry.name.startsWith(".") && entry.name !== ".") continue;
        // Token-pipeline directories — record then continue walking so any
        // tokens.json / colors.json inside still flows through the file
        // matchers below.
        if (TOKEN_DIR_BASENAMES.has(entry.name.toLowerCase())) {
          tokenDirs.push(full);
        }
        // *.xcodeproj/project.pbxproj — recognize as an iOS project.
        if (entry.name.endsWith(".xcodeproj")) {
          try {
            statSync(join(full, "project.pbxproj"));
            hasXcodeProject = true;
          } catch {
            // not a real Xcode project — keep walking
          }
        }
        stack.push(full);
        continue;
      }
      if (!entry.isFile()) continue;

      // Language histogram
      const ext = extOf(entry.name);
      if (ext) {
        const lang = EXTENSION_TO_LANGUAGE[ext];
        if (lang) {
          languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
        }
      }

      // Candidate config files
      if (matchesConfig(entry.name)) {
        configFiles.push(full);
      }
      if (entry.name === "registry.json") {
        registryFiles.push(full);
      }
      if (entry.name === "AndroidManifest.xml") {
        hasAndroidManifest = true;
      }
    }
  }

  return {
    languageCounts,
    configFiles,
    registryFiles,
    tokenDirs,
    hasAndroidManifest,
    hasXcodeProject,
  };
}

function shouldSkipDir(name: string): boolean {
  if (SKIP_DIRS.has(name)) return true;
  for (const prefix of SKIP_DIR_PREFIXES) {
    if (name.startsWith(prefix)) return true;
  }
  return false;
}

function matchesConfig(name: string): boolean {
  if (CONFIG_FILE_EXACT.has(name)) return true;
  for (const pattern of CONFIG_FILE_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

function extOf(name: string): string | null {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return null;
  return name.slice(dot + 1).toLowerCase();
}

function topLanguages(counts: Map<string, number>): LanguageHistogramEntry[] {
  return [...counts.entries()]
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => {
      if (b.files !== a.files) return b.files - a.files;
      return a.name.localeCompare(b.name);
    })
    .slice(0, HISTOGRAM_TOP_N);
}

function collectRootManifests(root: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if ((PACKAGE_MANIFEST_NAMES as readonly string[]).includes(entry.name)) {
      found.push(entry.name);
      continue;
    }
    for (const pattern of PACKAGE_MANIFEST_PATTERNS) {
      if (pattern.test(entry.name)) {
        found.push(entry.name);
        break;
      }
    }
  }
  return found.sort();
}

/**
 * Derive coarse platform hints from manifest presence + the language
 * histogram + walk signals.
 *
 * Manifests give cheap, exact signal (Bazel WORKSPACE → JVM build,
 * pubspec.yaml → Flutter). Histograms cover repos where the manifest
 * doesn't exist or doesn't disambiguate (a Bazel monorepo of Swift
 * targets is "ios"; a Bazel monorepo of Kotlin targets is "android"
 * — the manifest alone can't tell us which).
 *
 * Cases this deliberately does not try to disambiguate:
 *   - Kotlin Multiplatform (Swift + Kotlin balanced) — both `ios` and
 *     `android` will fire; the recipe is expected to pick `mixed`.
 *   - React Native (TS dominant + native shells) — surfaces as `web`
 *     today; future: detect `ios/`, `android/` shell directories.
 *   - .NET MAUI (C# + XAML) — no special handling.
 *   - Tauri / Electron (web stack with Rust/native shell) — surfaces
 *     as `web` plus `rust`; the recipe judges from there.
 *
 * The output is intentionally a deduped sorted list of *hints*, not a
 * single platform — `map.md`'s `platform:` enum is the recipe's call.
 */
function derivePlatformHints(
  manifests: string[],
  languageHistogram: LanguageHistogramEntry[],
  walk: WalkResult,
): string[] {
  const hints = new Set<string>();

  // Manifest-driven hints (cheap, exact).
  for (const m of manifests) {
    if (m === "package.json") hints.add("web");
    if (m === "Cargo.toml") hints.add("rust");
    if (m === "go.mod") hints.add("go");
    if (m === "pyproject.toml" || m === "Pipfile" || m === "setup.py") {
      hints.add("python");
    }
    if (m === "Gemfile" || m === "Gemfile.lock" || m.endsWith(".gemspec")) {
      hints.add("ruby");
    }
    if (m === "mix.exs") hints.add("elixir");
    if (m === "composer.json") hints.add("php");
    if (
      m === "Package.swift" ||
      m === "Package.resolved" ||
      m.endsWith(".podspec")
    ) {
      hints.add("ios");
    }
    if (m === "pom.xml") hints.add("jvm");
    if (m === "pubspec.yaml") hints.add("flutter");
    if (
      m === "settings.gradle" ||
      m === "settings.gradle.kts" ||
      m === "build.gradle" ||
      m === "build.gradle.kts"
    ) {
      hints.add("android");
    }
    // Bazel manifests don't disambiguate platform on their own — they
    // just say "this is a Bazel build." Pair with the language histogram.
    if (
      m === "WORKSPACE" ||
      m === "WORKSPACE.bazel" ||
      m === "MODULE.bazel" ||
      m === "BUILD.bazel" ||
      m === ".bazelversion"
    ) {
      hints.add("bazel");
    }
  }

  // Language-histogram-driven hints — only kick in when manifests aren't
  // already conclusive. Threshold: language must hold >40% of tracked
  // files for its platform to register.
  const totalFiles = languageHistogram.reduce((acc, l) => acc + l.files, 0);
  if (totalFiles > 0) {
    const share = (langName: string): number => {
      const entry = languageHistogram.find((l) => l.name === langName);
      return entry ? entry.files / totalFiles : 0;
    };

    const swiftShare = share("swift");
    const kotlinShare = share("kotlin") + share("java"); // Android stack
    const dartShare = share("dart");

    // Swift dominant + iOS-build evidence (SPM, Xcode, Bazel) → ios.
    const hasSpm = manifests.includes("Package.swift");
    if (
      swiftShare > 0.4 &&
      (hasSpm || walk.hasXcodeProject || hints.has("bazel"))
    ) {
      hints.add("ios");
    }

    // Kotlin/Java dominant + Gradle + AndroidManifest → android.
    const hasGradle =
      manifests.includes("build.gradle") ||
      manifests.includes("build.gradle.kts") ||
      manifests.includes("settings.gradle") ||
      manifests.includes("settings.gradle.kts");
    if (
      kotlinShare > 0.4 &&
      walk.hasAndroidManifest &&
      (hasGradle || hints.has("bazel"))
    ) {
      hints.add("android");
    }

    // Dart dominant + pubspec → flutter (covers cases where manifest set
    // alone wasn't conclusive — e.g. a workspace with multiple manifests).
    if (dartShare > 0.4 && manifests.includes("pubspec.yaml")) {
      hints.add("flutter");
    }
  }

  // Multiple distinct platform signals → also tag `mixed` so the recipe
  // can pick `platform: mixed` without relitigating the histogram.
  const platformish = new Set<string>(["web", "ios", "android", "flutter"]);
  const platformHits = [...hints].filter((h) => platformish.has(h));
  if (platformHits.length >= 2) hints.add("mixed");

  return [...hints].sort();
}

function readTopLevel(root: string): TopLevelEntry[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: TopLevelEntry[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      // Skip universal build/cache directories so the tree summary stays
      // signal-rich. Hidden dirs (starting with `.`) are also excluded
      // unless they're the canonical Bazel marker (`.bazelversion` is a
      // file, not a dir, so this is just consistency with the walker).
      if (shouldSkipDir(entry.name)) continue;
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      const childPath = join(root, entry.name);
      let childCount = 0;
      try {
        childCount = readdirSync(childPath).length;
      } catch {
        childCount = 0;
      }
      out.push({
        path: `${entry.name}/`,
        kind: "dir",
        child_count: childCount,
      });
      continue;
    }
    if (entry.isFile()) {
      out.push({ path: entry.name, kind: "file", child_count: 0 });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

function readGit(root: string): GitInfo {
  if (!isGitRepo(root)) return { remote: null, default_branch: null };
  const remote = tryGit(["config", "--get", "remote.origin.url"], root);
  const defaultBranch =
    parseDefaultBranch(
      tryGit(["symbolic-ref", "refs/remotes/origin/HEAD"], root),
    ) ?? tryGit(["rev-parse", "--abbrev-ref", "HEAD"], root);
  return {
    remote: remote && remote.length > 0 ? remote : null,
    default_branch:
      defaultBranch && defaultBranch.length > 0 ? defaultBranch : null,
  };
}

function isGitRepo(root: string): boolean {
  try {
    return (
      statSync(join(root, ".git")).isDirectory() ||
      statSync(join(root, ".git")).isFile()
    );
  } catch {
    return false;
  }
}

function tryGit(args: string[], cwd: string): string | null {
  try {
    const out = execFileSync("git", args, {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return out.trim();
  } catch {
    return null;
  }
}

function parseDefaultBranch(symbolic: string | null): string | null {
  if (!symbolic) return null;
  // Expect "refs/remotes/origin/<branch>"
  const prefix = "refs/remotes/origin/";
  if (symbolic.startsWith(prefix)) return symbolic.slice(prefix.length);
  return null;
}

function sortRelative(absPaths: string[], root: string): string[] {
  return absPaths
    .map((p) => relative(root, p).split(sep).join("/"))
    .sort()
    .filter((v, i, arr) => arr.indexOf(v) === i);
}

/**
 * Order candidate config files so design-system-anchored matches surface
 * before incidental hits in feature folders. Within the same tier, paths
 * sort lexicographically so output stays deterministic.
 *
 * A path's tier is the depth of its first DS-ancestor segment counted
 * from the root (lower is better). Files with no DS ancestor land in the
 * "no-ancestor" tier last.
 */
function orderConfigCandidates(absPaths: string[], root: string): string[] {
  const rels = absPaths
    .map((p) => relative(root, p).split(sep).join("/"))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return rels.sort((a, b) => {
    const da = dsAncestorDepth(a);
    const db = dsAncestorDepth(b);
    if (da !== db) {
      // Both have an ancestor → shallower wins. One has none → that side
      // sorts last (depth = +Infinity).
      return da - db;
    }
    return a.localeCompare(b);
  });
}

/**
 * Return the 1-based depth of the first design-system ancestor segment in
 * a relative path, or +Infinity if no segment matches.
 *
 *   `tokens/colors.json`         → 1
 *   `src/styles/tokens.css`      → 2 (matches `styles`)
 *   `Code/DesignSystem/Theme.kt` → 2 (matches `designsystem`)
 *   `app/Color+Brand.swift`      → +Infinity
 */
function dsAncestorDepth(relPath: string): number {
  const segments = relPath.split("/");
  // Walk parent segments only — the basename is the file itself.
  for (let i = 0; i < segments.length - 1; i++) {
    const norm = segments[i].toLowerCase();
    if (DS_ANCESTOR_SEGMENTS.has(norm)) return i + 1;
  }
  return Number.POSITIVE_INFINITY;
}
