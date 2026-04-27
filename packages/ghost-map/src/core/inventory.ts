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
 */
const PACKAGE_MANIFEST_NAMES = [
  "package.json",
  "Cargo.toml",
  "pyproject.toml",
  "go.mod",
  "Package.swift",
  "Pipfile",
  "pubspec.yaml",
  "pom.xml",
  // Gradle manifests
  "settings.gradle",
  "settings.gradle.kts",
  "build.gradle",
  "build.gradle.kts",
] as const;

/**
 * Regex matchers for less-stable manifest names. Files matching at the root
 * are added to `package_manifests`.
 */
const PACKAGE_MANIFEST_PATTERNS: RegExp[] = [/\.podspec$/];

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

/** Directories we don't walk into when computing histograms / configs. */
const SKIP_DIRS = new Set<string>([
  ".git",
  "node_modules",
  ".gradle",
  ".idea",
  ".vscode",
  "build",
  "dist",
  "target",
  "out",
  ".next",
  ".turbo",
  ".pnpm",
  ".yarn",
  "coverage",
  "Pods",
  "DerivedData",
  ".cxx",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  "vendor",
  "bin",
  "obj",
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
  const platformHints = derivePlatformHints(packageManifests);

  const walkResult = walkTree(root);
  const languageHistogram = topLanguages(walkResult.languageCounts);
  const candidateConfigFiles = sortRelative(walkResult.configFiles, root);
  const registryFiles = sortRelative(walkResult.registryFiles, root);
  const topLevelTree = readTopLevel(root);
  const git = readGit(root);

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
}

function walkTree(root: string): WalkResult {
  const languageCounts = new Map<string, number>();
  const configFiles: string[] = [];
  const registryFiles: string[] = [];

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
        if (SKIP_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith(".") && entry.name !== ".") continue;
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
    }
  }

  return { languageCounts, configFiles, registryFiles };
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

function derivePlatformHints(manifests: string[]): string[] {
  const hints = new Set<string>();
  for (const m of manifests) {
    if (m === "package.json") hints.add("web");
    if (m === "Cargo.toml") hints.add("rust");
    if (m === "go.mod") hints.add("go");
    if (m === "pyproject.toml" || m === "Pipfile") hints.add("python");
    if (m === "Package.swift" || m.endsWith(".podspec")) hints.add("ios");
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
  }
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
