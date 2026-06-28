import { access, readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  assembleGraph,
  type GhostFingerprintPackageManifest,
  GhostFingerprintPackageManifestSchema,
  type GhostSurfacesDocument,
  GhostSurfacesSchema,
  lintGraph,
} from "#ghost-core";
import { isMissingPathError, readOptionalUtf8 } from "../internal/fs.js";
import type {
  FingerprintPackagePaths,
  LoadedFingerprintPackage,
} from "./fingerprint-package.js";
import type { LintIssue } from "./lint.js";
import { loadNodesDir } from "./nodes-dir.js";

const LEGACY_FACET_FILES = ["intent.yml", "inventory.yml", "composition.yml"];

export async function loadFingerprintPackage(
  paths: FingerprintPackagePaths,
): Promise<LoadedFingerprintPackage> {
  const [manifestRaw, surfacesRaw] = await Promise.all([
    readFile(paths.manifest, "utf-8"),
    readOptional(paths.surfaces),
  ]);
  const manifest = parseManifest(manifestRaw, "manifest.yml");
  const surfaces = parseSurfaces(surfacesRaw);

  // Legacy facet packages no longer load directly — guide to `ghost migrate`.
  await assertNotLegacyFacetPackage(paths);

  const { nodes: nodeFiles } = await loadNodesDir(paths.dir);
  const graph = assembleGraph({ nodeFiles, surfaces });

  const report = lintGraph(graph);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.node ? ` (node '${first.node}')` : "";
    throw new Error(
      `fingerprint package graph is invalid: ${first?.message ?? "invalid graph"}${suffix}`,
    );
  }

  return {
    manifest,
    manifestRaw,
    graph,
    ...(surfaces ? { surfaces } : {}),
  };
}

/**
 * If a package still ships the legacy facet files and has no `nodes/`, fail
 * with migrate guidance rather than a confusing graph error.
 */
async function assertNotLegacyFacetPackage(
  paths: FingerprintPackagePaths,
): Promise<void> {
  const hasNodes = await pathExists(paths.nodes);
  if (hasNodes) return;
  for (const facet of LEGACY_FACET_FILES) {
    if (await pathExists(`${paths.packageDir}/${facet}`)) {
      throw new Error(
        `This is a legacy facet package (found ${facet}, no nodes/). Run \`ghost migrate\` to convert it to the node model.`,
      );
    }
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (err) {
    if (isMissingPathError(err)) return false;
    throw err;
  }
}

function parseSurfaces(
  raw: string | undefined,
): GhostSurfacesDocument | undefined {
  if (raw === undefined) return undefined;
  const result = GhostSurfacesSchema.safeParse(parseYaml(raw));
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      `surfaces.yml failed schema validation: ${first?.message ?? "invalid surfaces"}`,
    );
  }
  return result.data as GhostSurfacesDocument;
}

export function lintFingerprintPackageManifest(
  raw: string,
  issues: LintIssue[],
): void {
  const manifest = parseYamlSafe(raw, "manifest.yml", issues);
  if (manifest === undefined) return;
  const manifestResult =
    GhostFingerprintPackageManifestSchema.safeParse(manifest);
  if (!manifestResult.success) {
    issues.push(
      ...manifestResult.error.issues.map((issue) => ({
        severity: "error" as const,
        rule: `schema/${issue.code}`,
        message: issue.message,
        path: issue.path.length
          ? `manifest.yml.${issue.path.join(".")}`
          : "manifest.yml",
      })),
    );
  }
}

function parseManifest(
  raw: string,
  label: string,
): GhostFingerprintPackageManifest {
  const parsed = parseYamlStrict(raw, label);
  return GhostFingerprintPackageManifestSchema.parse(
    parsed,
  ) as GhostFingerprintPackageManifest;
}

function parseYamlStrict(raw: string, label: string): unknown {
  try {
    return parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function parseYamlSafe(
  raw: string,
  label: string,
  issues: LintIssue[],
): unknown | undefined {
  try {
    return parseYaml(raw);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "package-yaml-invalid",
      message: `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

const readOptional = readOptionalUtf8;
