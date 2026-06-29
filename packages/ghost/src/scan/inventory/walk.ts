import { type Dirent, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { LanguageHistogramEntry } from "#ghost-core";
import {
  BUILD_TOOL_MATCHERS,
  CONFIG_FILE_EXACT,
  CONFIG_FILE_PATTERNS,
  DS_ANCESTOR_SEGMENTS,
  EXTENSION_TO_LANGUAGE,
  HISTOGRAM_TOP_N,
  STYLE_DICTIONARY_FILES,
  TOKEN_DIR_BASENAMES,
} from "./constants.js";
import { extOf, shouldSkipDir, toPosixRel } from "./paths.js";

export interface WalkResult {
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
  /** Build-tool hints inferred from config-file presence (vite, nx, …). */
  buildToolHints: Set<string>;
}

/** Single depth-unbounded tree walk collecting every cheap repo signal. */
export function walkTree(root: string): WalkResult {
  const languageCounts = new Map<string, number>();
  const configFiles: string[] = [];
  const registryFiles: string[] = [];
  const tokenDirs: string[] = [];
  const buildToolHints = new Set<string>();
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
        if (TOKEN_DIR_BASENAMES.has(entry.name.toLowerCase())) {
          tokenDirs.push(full);
        }
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

      const ext = extOf(entry.name);
      if (ext) {
        const lang = EXTENSION_TO_LANGUAGE[ext];
        if (lang) {
          languageCounts.set(lang, (languageCounts.get(lang) ?? 0) + 1);
        }
      }

      if (matchesConfig(entry.name)) configFiles.push(full);
      if (entry.name === "registry.json") registryFiles.push(full);
      if (entry.name === "AndroidManifest.xml") hasAndroidManifest = true;
      if (STYLE_DICTIONARY_FILES.has(entry.name)) hasStyleDictionary = true;
      for (const matcher of BUILD_TOOL_MATCHERS) {
        if (matcher.matches(entry.name)) buildToolHints.add(matcher.hint);
      }
    }
  }

  return {
    languageCounts,
    configFiles,
    registryFiles,
    tokenDirs,
    buildToolHints,
    hasAndroidManifest,
    hasXcodeProject,
    hasStyleDictionary,
  };
}

function matchesConfig(name: string): boolean {
  if (CONFIG_FILE_EXACT.has(name)) return true;
  for (const pattern of CONFIG_FILE_PATTERNS) {
    if (pattern.test(name)) return true;
  }
  return false;
}

/** Top-N languages by file count, ties broken by name. */
export function topLanguages(
  counts: Map<string, number>,
): LanguageHistogramEntry[] {
  return [...counts.entries()]
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => {
      if (b.files !== a.files) return b.files - a.files;
      return a.name.localeCompare(b.name);
    })
    .slice(0, HISTOGRAM_TOP_N);
}

/**
 * Order candidate config files so design-system-anchored matches surface
 * before incidental hits. Tier = depth of the first DS-ancestor segment;
 * ties sort lexicographically for determinism.
 */
export function orderConfigCandidates(
  absPaths: string[],
  root: string,
): string[] {
  const rels = absPaths
    .map((p) => toPosixRel(root, p))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  return rels.sort((a, b) => {
    const da = dsAncestorDepth(a);
    const db = dsAncestorDepth(b);
    if (da !== db) return da - db;
    return a.localeCompare(b);
  });
}

function dsAncestorDepth(relPath: string): number {
  const segments = relPath.split("/");
  for (let i = 0; i < segments.length - 1; i++) {
    if (DS_ANCESTOR_SEGMENTS.has(segments[i].toLowerCase())) return i + 1;
  }
  return Number.POSITIVE_INFINITY;
}
