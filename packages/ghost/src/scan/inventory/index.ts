import { resolve } from "node:path";
import type { InventoryOutput } from "#ghost-core";
import { readGit, readTopLevel } from "./git.js";
import { deriveBuildSystemHints, derivePlatformHints } from "./hints.js";
import { collectAllManifests } from "./manifests.js";
import { sortRelative } from "./paths.js";
import { orderConfigCandidates, topLanguages, walkTree } from "./walk.js";

/**
 * Run a deterministic inventory pass over the given path.
 *
 * No LLM calls, no network, no filesystem mutations — pure reads plus a
 * best-effort git invocation. The pass fans out into focused collectors
 * (walk, manifests, hints, git) and assembles their results here.
 */
export function signals(path: string): InventoryOutput {
  const root = resolve(path);

  const packageManifests = collectAllManifests(root);
  const walkResult = walkTree(root);
  const languageHistogram = topLanguages(walkResult.languageCounts);

  const candidateConfigFiles = orderConfigCandidates(
    walkResult.configFiles,
    root,
  );
  // Token directories surface as additional config candidates so the recipe
  // can find directory-shaped token graphs without a separate scan.
  for (const tokenDir of orderConfigCandidates(walkResult.tokenDirs, root)) {
    const withSlash = tokenDir.endsWith("/") ? tokenDir : `${tokenDir}/`;
    if (!candidateConfigFiles.includes(withSlash)) {
      candidateConfigFiles.push(withSlash);
    }
  }

  const registryFiles = sortRelative(walkResult.registryFiles, root);
  const git = readGit(root);

  return {
    root,
    platform_hints: derivePlatformHints(
      packageManifests,
      languageHistogram,
      walkResult,
    ),
    build_system_hints: deriveBuildSystemHints(packageManifests, walkResult),
    language_histogram: languageHistogram,
    package_manifests: packageManifests,
    candidate_config_files: candidateConfigFiles,
    registry_files: registryFiles,
    top_level_tree: readTopLevel(root),
    git_remote: git.remote,
    git_default_branch: git.default_branch,
  };
}
