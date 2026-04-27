import { execFileSync } from "node:child_process";
import { type Dirent, readdirSync, readFileSync, statSync } from "node:fs";
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
  // Style Dictionary token-pipeline config — JS/TS/JSON variants seen in
  // real repos. Matched anywhere because monorepos may stash it under
  // `tokens/`, `packages/tokens/`, etc.
  /^style-dictionary\.config\.[cm]?[jt]sx?$/,
  /^style-dictionary\.config\.json$/,
];

/** Basenames that indicate a Style Dictionary token pipeline lives nearby. */
const STYLE_DICTIONARY_FILES = new Set<string>([
  "style-dictionary.config.js",
  "style-dictionary.config.cjs",
  "style-dictionary.config.mjs",
  "style-dictionary.config.ts",
  "style-dictionary.config.json",
]);

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

  const packageManifests = collectAllManifests(root);

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
  const buildSystemHints = deriveBuildSystemHints(packageManifests, walkResult);

  return {
    root,
    platform_hints: platformHints,
    build_system_hints: buildSystemHints,
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
  /** True if any `style-dictionary.config.*` was found under the root. */
  hasStyleDictionary: boolean;
}

function walkTree(root: string): WalkResult {
  const languageCounts = new Map<string, number>();
  const configFiles: string[] = [];
  const registryFiles: string[] = [];
  const tokenDirs: string[] = [];
  let hasAndroidManifest = false;
  let hasXcodeProject = false;
  let hasStyleDictionary = false;

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
      if (STYLE_DICTIONARY_FILES.has(entry.name)) {
        hasStyleDictionary = true;
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
    hasStyleDictionary,
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

/**
 * Conventional one-level workspace directories scanned in addition to the
 * root. Real monorepos place per-app / per-package manifests here; the
 * inventory surfaces them so the recipe can see the full workspace shape
 * without re-walking the tree.
 */
const CONVENTIONAL_WORKSPACE_DIRS = [
  "apps",
  "packages",
  "libs",
  "common",
] as const;

/**
 * Collect package manifests from the root plus any workspace directories
 * we can identify (via `package.json:workspaces` and the conventional
 * `apps/`, `packages/`, `libs/`, `common/` layout).
 *
 * - Root manifests are returned by basename (`package.json`).
 * - Nested manifests are returned as POSIX-style relative paths
 *   (`packages/foo/package.json`) so they're distinguishable.
 * - Results are deduped by absolute path, sorted lexicographically.
 * - The walk does NOT recurse beyond one level under each scanned
 *   workspace dir — we're surfacing the obvious shape, not crawling.
 */
function collectAllManifests(root: string): string[] {
  const seenAbs = new Set<string>();
  const out: string[] = [];

  // Root manifests first — basename-only for backcompat with existing
  // callers and tests.
  for (const name of collectManifestBasenames(root)) {
    const abs = join(root, name);
    if (seenAbs.has(abs)) continue;
    seenAbs.add(abs);
    out.push(name);
  }

  // Workspace directories — both `package.json:workspaces` and the
  // conventional `apps/`, `packages/`, `libs/`, `common/` layout.
  const workspaceDirs = expandWorkspaceDirs(root);
  for (const dir of workspaceDirs) {
    const absDir = resolve(root, dir);
    // Stay inside `root` — defensive against pathological globs.
    if (!isInsideRoot(absDir, root)) continue;
    if (shouldSkipDir(basenameOf(absDir))) continue;
    let entries: Dirent[];
    try {
      entries = readdirSync(absDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!isManifestName(entry.name)) continue;
      const abs = join(absDir, entry.name);
      if (seenAbs.has(abs)) continue;
      seenAbs.add(abs);
      out.push(toPosixRel(root, abs));
    }
  }

  return out.sort();
}

function collectManifestBasenames(dir: string): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (isManifestName(entry.name)) found.push(entry.name);
  }
  return found.sort();
}

function isManifestName(name: string): boolean {
  if ((PACKAGE_MANIFEST_NAMES as readonly string[]).includes(name)) return true;
  for (const pattern of PACKAGE_MANIFEST_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/**
 * Resolve workspace directories to scan (one level only). Returns POSIX
 * relative paths to the inventory root; never the root itself.
 *
 * Two sources, both honored, results deduped:
 *   - `package.json:workspaces` (array form OR `{ packages: [] }` form)
 *   - Conventional `apps/`, `packages/`, `libs/`, `common/` — each
 *     immediate child of those dirs is a candidate workspace.
 *
 * Globs in `workspaces` are expanded with a tiny matcher that supports
 * the patterns real repos actually use (`packages/*`, `apps/*`, plain
 * dir paths). Anything more elaborate (`**`, brace expansion) is
 * intentionally not supported — a recipe-level workspace crawl is out
 * of scope for inventory.
 */
function expandWorkspaceDirs(root: string): string[] {
  const dirs = new Set<string>();

  // 1. package.json workspaces, if any.
  for (const dir of readPackageJsonWorkspaces(root)) {
    dirs.add(dir);
  }

  // 2. Conventional dirs — apps/*, packages/*, libs/*, common/*.
  for (const parent of CONVENTIONAL_WORKSPACE_DIRS) {
    const parentAbs = join(root, parent);
    let entries: Dirent[];
    try {
      entries = readdirSync(parentAbs, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (shouldSkipDir(entry.name)) continue;
      if (entry.name.startsWith(".")) continue;
      dirs.add(`${parent}/${entry.name}`);
    }
  }

  return [...dirs].sort();
}

function readPackageJsonWorkspaces(root: string): string[] {
  const pkgPath = join(root, "package.json");
  let raw: string;
  try {
    raw = readFileSync(pkgPath, "utf-8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== "object") return [];
  const workspaces = (parsed as { workspaces?: unknown }).workspaces;
  const patterns = normalizeWorkspacePatterns(workspaces);
  if (patterns.length === 0) return [];

  const out = new Set<string>();
  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(root, pattern)) {
      out.add(dir);
    }
  }
  return [...out];
}

function normalizeWorkspacePatterns(value: unknown): string[] {
  // Accept array form (`["packages/*"]`) and object form
  // (`{ packages: ["packages/*"] }`).
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (value && typeof value === "object") {
    const obj = value as { packages?: unknown };
    if (Array.isArray(obj.packages)) {
      return obj.packages.filter((v): v is string => typeof v === "string");
    }
  }
  return [];
}

/**
 * Tiny single-segment glob matcher for workspace patterns. Supports:
 *   - `packages/*`  → every immediate child of `packages/`
 *   - `apps/*`      → ditto
 *   - `tools/foo`   → exact path (no wildcard)
 *
 * Multi-segment globs (`**`, `*\/*\/...`) are deliberately unsupported —
 * the recipe escalates to a real workspace crawler when needed.
 */
function expandWorkspacePattern(root: string, pattern: string): string[] {
  const cleaned = pattern.replace(/\\/g, "/").replace(/\/+$/, "");
  if (cleaned.length === 0) return [];
  if (!cleaned.includes("*")) {
    // Plain path — accept only if it resolves to an existing directory.
    const abs = join(root, cleaned);
    try {
      if (statSync(abs).isDirectory()) return [cleaned];
    } catch {
      // missing dir — skip silently
    }
    return [];
  }

  // Single trailing wildcard: `<parent>/*` is the only supported shape.
  const lastSlash = cleaned.lastIndexOf("/");
  if (lastSlash === -1) return [];
  const parent = cleaned.slice(0, lastSlash);
  const tail = cleaned.slice(lastSlash + 1);
  if (tail !== "*") return [];

  const parentAbs = join(root, parent);
  let entries: Dirent[];
  try {
    entries = readdirSync(parentAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipDir(entry.name)) continue;
    if (entry.name.startsWith(".")) continue;
    out.push(`${parent}/${entry.name}`);
  }
  return out;
}

function basenameOf(absPath: string): string {
  const idx = absPath.lastIndexOf(sep);
  return idx === -1 ? absPath : absPath.slice(idx + 1);
}

function isInsideRoot(absPath: string, root: string): boolean {
  const rel = relative(root, absPath);
  return (
    rel.length > 0 &&
    !rel.startsWith("..") &&
    !rel.startsWith(`..${sep}`) &&
    rel !== ".."
  );
}

function toPosixRel(root: string, abs: string): string {
  return relative(root, abs).split(sep).join("/");
}

/**
 * The closed set of values `platform_hints` may emit. Keeps the field
 * tied to `MapFrontmatterSchema`'s `platform` enum so a recipe can pass
 * the hint through verbatim. Build-system / language / runtime signals
 * (bazel, ruby, python, jvm, …) belong in `build_system_hints` (when
 * they're build systems) or are deliberately not surfaced here.
 */
const PLATFORM_ENUM_VALUES: ReadonlySet<string> = new Set([
  "web",
  "ios",
  "android",
  "desktop",
  "flutter",
  "mixed",
  "other",
]);

/**
 * Derive coarse platform hints from manifest presence + the language
 * histogram + walk signals.
 *
 * Manifests give cheap, exact signal (`Package.swift` → ios,
 * `pubspec.yaml` → flutter). Histograms cover repos where the manifest
 * doesn't exist or doesn't disambiguate (a Bazel monorepo of Swift
 * targets is "ios"; a Bazel monorepo of Kotlin targets is "android"
 * — the manifest alone can't tell us which, so we lean on a Bazel
 * build-system signal plus the language share).
 *
 * The output is constrained to values in `PLATFORM_ENUM_VALUES` so it
 * mirrors `map.md`'s `platform:` enum. Build-system-derived signals
 * (`bazel`, `cargo`, …) and language/runtime signals (`ruby`, `python`,
 * `rust`, `go`, `jvm`, `php`, `elixir`) are NOT emitted here — bazel
 * lives in `build_system_hints` instead, and the rest don't disambiguate
 * a UI platform on their own.
 *
 * Cases this deliberately does not try to disambiguate:
 *   - Kotlin Multiplatform (Swift + Kotlin balanced) — both `ios` and
 *     `android` will fire; the recipe is expected to pick `mixed`.
 *   - React Native (TS dominant + native shells) — surfaces as `web`
 *     today; future: detect `ios/`, `android/` shell directories.
 *   - .NET MAUI (C# + XAML) — no special handling.
 *   - Tauri / Electron (web stack with Rust/native shell) — surfaces
 *     as `web`; the rust signal is in language_histogram, not here.
 *
 * The output is a deduped sorted list of *hints*, not a single
 * platform — `map.md`'s `platform:` enum is the recipe's call.
 */
function derivePlatformHints(
  manifests: string[],
  languageHistogram: LanguageHistogramEntry[],
  walk: WalkResult,
): string[] {
  const hints = new Set<string>();

  // Manifest-driven hints (cheap, exact). Compare basenames so workspace-
  // expanded entries (`packages/foo/package.json`) still match the same
  // signal as a root `package.json`.
  const basenames = manifests.map((m) => {
    const idx = m.lastIndexOf("/");
    return idx === -1 ? m : m.slice(idx + 1);
  });
  for (const m of basenames) {
    if (m === "package.json") hints.add("web");
    if (
      m === "Package.swift" ||
      m === "Package.resolved" ||
      m.endsWith(".podspec")
    ) {
      hints.add("ios");
    }
    if (m === "pubspec.yaml") hints.add("flutter");
    if (
      m === "settings.gradle" ||
      m === "settings.gradle.kts" ||
      m === "build.gradle" ||
      m === "build.gradle.kts"
    ) {
      hints.add("android");
    }
  }

  // Bazel doesn't disambiguate platform on its own — it lives in
  // `build_system_hints`. Track its presence locally so the histogram
  // pass below can use it as a tiebreaker for swift-on-bazel /
  // kotlin-on-bazel monorepos.
  const hasBazelBuild = basenames.some(
    (m) =>
      m === "WORKSPACE" ||
      m === "WORKSPACE.bazel" ||
      m === "MODULE.bazel" ||
      m === "BUILD.bazel" ||
      m === ".bazelversion",
  );

  // Language-histogram-driven hints — only kick in when manifests aren't
  // already conclusive. Threshold: language must hold >40% of tracked
  // files for its platform to register.
  const basenameSet = new Set(basenames);
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
    const hasSpm = basenameSet.has("Package.swift");
    if (swiftShare > 0.4 && (hasSpm || walk.hasXcodeProject || hasBazelBuild)) {
      hints.add("ios");
    }

    // Kotlin/Java dominant + Gradle + AndroidManifest → android.
    const hasGradle =
      basenameSet.has("build.gradle") ||
      basenameSet.has("build.gradle.kts") ||
      basenameSet.has("settings.gradle") ||
      basenameSet.has("settings.gradle.kts");
    if (
      kotlinShare > 0.4 &&
      walk.hasAndroidManifest &&
      (hasGradle || hasBazelBuild)
    ) {
      hints.add("android");
    }

    // Dart dominant + pubspec → flutter (covers cases where manifest set
    // alone wasn't conclusive — e.g. a workspace with multiple manifests).
    if (dartShare > 0.4 && basenameSet.has("pubspec.yaml")) {
      hints.add("flutter");
    }
  }

  // Multiple distinct platform signals → also tag `mixed` so the recipe
  // can pick `platform: mixed` without relitigating the histogram.
  const platformish = new Set<string>(["web", "ios", "android", "flutter"]);
  const platformHits = [...hints].filter((h) => platformish.has(h));
  if (platformHits.length >= 2) hints.add("mixed");

  // Defensive: drop anything outside the platform enum. Earlier passes
  // only add enum values, but this guards against future regressions —
  // build-system / language signals must NOT leak into platform_hints.
  for (const hint of [...hints]) {
    if (!PLATFORM_ENUM_VALUES.has(hint)) hints.delete(hint);
  }

  return [...hints].sort();
}

/**
 * Derive coarse build-system hints from manifest presence + walk signals.
 *
 * Informational only — the recipe authors the authoritative
 * `build_system` value in `map.md`. The hints exist so the recipe doesn't
 * need to re-scan manifests to know what build systems coexist.
 *
 * Hint values are drawn from the `build_system` enum so the recipe can
 * pass them through verbatim when appropriate.
 */
function deriveBuildSystemHints(
  manifests: string[],
  walk: WalkResult,
): string[] {
  const hints = new Set<string>();
  const basenames = manifests.map((m) => {
    const idx = m.lastIndexOf("/");
    return idx === -1 ? m : m.slice(idx + 1);
  });

  for (const m of basenames) {
    if (m === "package.json") {
      // package.json alone can't disambiguate npm/pnpm/yarn — the recipe
      // resolves that via lockfile presence. Skip a hint here.
    }
    if (
      m === "settings.gradle" ||
      m === "settings.gradle.kts" ||
      m === "build.gradle" ||
      m === "build.gradle.kts"
    ) {
      hints.add("gradle");
    }
    if (
      m === "WORKSPACE" ||
      m === "WORKSPACE.bazel" ||
      m === "MODULE.bazel" ||
      m === "BUILD.bazel" ||
      m === ".bazelversion"
    ) {
      hints.add("bazel");
    }
    if (
      m === "Package.swift" ||
      m === "Package.resolved" ||
      m.endsWith(".podspec")
    ) {
      // SPM is the canonical Swift manifest — `xcode` is the IDE/build
      // system, surfaced separately when an .xcodeproj is present.
      hints.add("xcode");
    }
    if (m === "Cargo.toml") hints.add("cargo");
    if (m === "go.mod") hints.add("go");
    if (m === "pom.xml") hints.add("maven");
  }

  if (walk.hasXcodeProject) hints.add("xcode");
  if (walk.hasStyleDictionary) hints.add("style-dictionary");

  // Lockfile presence to disambiguate npm/pnpm/yarn at the root.
  // (We only check these at the root — workspace child lockfiles are
  // unusual and the root is authoritative when present.)
  // Detected via the manifest list (lockfiles aren't in `manifests` so
  // these explicit checks happen against the file system separately —
  // but pnpm-workspace.yaml *is* often shipped alongside `package.json`,
  // and yarn projects ship `yarn.lock`. We scan top-level filenames
  // through `manifests` only, so to keep this side-effect-free we don't
  // add lockfile inference here. The recipe is expected to disambiguate.)

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
