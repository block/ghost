import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  assembleCatalog,
  type GhostPackageManifest,
  GhostPackageManifestSchema,
  NodeIdSchema,
  UsageError,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import {
  CascadeGraphError,
  cascadeClosure,
  dependencyClosure,
  type GhostUniversalVersionWarning,
  hasAuthoredFallback,
  validateCore,
} from "./cascade.js";
import { loadCheckFiles } from "./check-files.js";
import type { GhostPackagePaths, LoadedGhostPackage } from "./ghost-package.js";
import type { LintIssue } from "./lint.js";
import { loadNodeFiles } from "./node-files.js";
import { hashGhostPackage, invalidPackageSymlinks } from "./package-hash.js";
import { compareVersions } from "./package-version-order.js";

const RETIRED_PACKAGE_SCHEMA = "ghost.fingerprint-package/v1";
const RETIRED_SCHEMA_MESSAGE =
  "manifest.yml uses the retired schema ghost.fingerprint-package/v1. Replace it with `schema: ghost.package/v1`, then run `ghost validate`.";

export async function loadGhostPackage(
  paths: GhostPackagePaths,
  universalPaths?: GhostPackagePaths,
): Promise<LoadedGhostPackage> {
  const primary = await loadOnePackage(paths);
  const { manifest } = primary;
  if (manifest.universal === undefined && universalPaths !== undefined) {
    throw new UsageError(
      "The selected package must declare universal in manifest.yml to use --universal.",
    );
  }
  if (
    manifest.universal === undefined &&
    manifest.version === undefined &&
    manifest.core === undefined
  )
    return primary;
  if (manifest.universal !== undefined && universalPaths === undefined) {
    throw new UsageError(
      `Package "${manifest.id}" requires universal ${manifest.universal}. Pass --universal <dir>.`,
    );
  }
  const universal =
    universalPaths === undefined
      ? undefined
      : await loadOnePackage(universalPaths);
  if (universal && universal.manifest.version === undefined) {
    throw new UsageError(
      "--universal must point to a universal package with version in manifest.yml.",
    );
  }
  return assembleCascade(primary, paths, universal, universalPaths);
}

async function loadOnePackage(
  paths: GhostPackagePaths,
): Promise<LoadedGhostPackage> {
  let manifestRaw: string;
  try {
    manifestRaw = await readFile(paths.manifest, "utf-8");
  } catch (err) {
    // A missing package is a usage error (run `ghost init`), not a crash.
    if (isMissingPathError(err)) {
      throw new UsageError(
        `No ghost package found at ${paths.packageDir} (expected manifest.yml). Run \`ghost init\` or pass --package <dir>.`,
      );
    }
    throw err;
  }
  const manifest = parseManifest(manifestRaw, "manifest.yml");
  const legacy =
    manifest.version === undefined &&
    manifest.universal === undefined &&
    manifest.core === undefined;
  if (!legacy) {
    const invalidLinks = await invalidPackageSymlinks(paths.packageDir);
    if (invalidLinks.length) {
      throw new UsageError(
        `Package "${manifest.id}" has invalid symlinks: ${invalidLinks.join(", ")}.`,
      );
    }
  }

  // Match prerequisites after both package catalogs are loaded.
  // Per-node schema failures are collected as `invalid`.
  const { nodes: placedNodes, invalid } = await loadNodeFiles(
    paths.packageDir,
    legacy,
  );
  const checkFiles = await loadCheckFiles(paths.packageDir);
  const catalog = assembleCatalog({ placedNodes });

  return {
    manifest,
    manifestRaw,
    catalog,
    hasChecksDir: checkFiles.hasChecksDir,
    checks: checkFiles.checks,
    invalid,
    invalidChecks: checkFiles.invalid,
  };
}

async function assembleCascade(
  primary: LoadedGhostPackage,
  paths: GhostPackagePaths,
  universal?: LoadedGhostPackage,
  universalPaths?: GhostPackagePaths,
): Promise<LoadedGhostPackage> {
  const issues = new Set<string>();
  const report = (message: string) => issues.add(message);
  if (universal?.manifest.id === primary.manifest.id) {
    report(
      `The universal package and fingerprint must have distinct package IDs, got "${primary.manifest.id}".`,
    );
  }
  const localCore = validateCore(primary, report);
  const universalCore = universal ? validateCore(universal, report) : [];
  const core = [...universalCore, ...localCore];
  const universalNodes = universal?.catalog.nodes ?? new Map();
  const nodes = new Map(universalNodes);
  for (const [id, node] of primary.catalog.nodes) {
    if (nodes.has(id)) {
      report(
        `Duplicate node ID "${id}" across the universal package and fingerprint.`,
      );
    } else nodes.set(id, node);
  }
  const checks = new Map(universal?.checks);
  for (const [id, check] of primary.checks) {
    if (checks.has(id)) {
      report(
        `Duplicate check ID "${id}" across the universal package and fingerprint.`,
      );
    } else checks.set(id, check);
  }

  for (const id of nodes.keys()) {
    if (!NodeIdSchema.safeParse(id).success)
      report(
        `Invalid node ID "${id}". Use a package-relative path of lowercase slug segments.`,
      );
  }

  // Validate every edge once, including those outside the delivered closure.
  const localInvalid = new Map(
    primary.invalid.map(({ file, message }) => [file, message]),
  );
  const universalInvalid = new Map(
    universal?.invalid.map(({ file, message }) => [file, message]),
  );
  dependencyClosure(nodes, [...nodes.keys()], {
    report,
    allows: (from, id) =>
      universalNodes.has(from) ? universalNodes.has(id) : nodes.has(id),
    missing: (from, id) => {
      const file = `${id}.md`;
      const invalid = universalNodes.has(from)
        ? universalInvalid.get(file)
        : (localInvalid.get(file) ?? universalInvalid.get(file));
      return invalid
        ? `Node "${from}" requires invalid node "${id}": ${invalid}`
        : `Node "${from}" requires missing node "${id}".`;
    },
  });
  if (issues.size) throw new CascadeGraphError([...issues]);
  const automatic = cascadeClosure(nodes, core, universalNodes.keys());
  let versionWarning: GhostUniversalVersionWarning | undefined;
  const version = primary.manifest.universal ?? primary.manifest.version;
  if (
    version !== undefined &&
    compareVersions(version, version) === undefined
  ) {
    throw new UsageError(
      `Invalid package compatibility version "${version}"; use SemVer.`,
    );
  }
  if (universal?.manifest.version !== undefined && version !== undefined) {
    const actual = universal.manifest.version;
    const comparison = compareVersions(actual, version);
    if (comparison === undefined)
      throw new UsageError(
        `Invalid universal version "${actual}"; use SemVer.`,
      );
    if (comparison !== 0) {
      versionWarning = {
        code: "universal-version-mismatch",
        severity: "warning",
        file: "manifest.yml",
        expectedVersion: version,
        actualVersion: actual,
        message: `Fingerprint expects universal ${version}; supplied universal is ${actual}.`,
      };
    }
  }
  const provenance = {
    package: await identifyPackage(primary, paths),
    universal:
      universal && universalPaths
        ? await identifyPackage(universal, universalPaths)
        : null,
  };
  return {
    ...primary,
    catalog: { nodes },
    checks,
    hasChecksDir: primary.hasChecksDir || Boolean(universal?.hasChecksDir),
    invalid: [...(universal?.invalid ?? []), ...primary.invalid],
    invalidChecks: [
      ...(universal?.invalidChecks ?? []),
      ...primary.invalidChecks,
    ],
    cascade: {
      core,
      automatic: automatic.map(({ id }) => id),
      universalDir: universalPaths?.packageDir,
      universalNodeIds: [...universalNodes.keys()],
      hasAuthoredFallback: hasAuthoredFallback(automatic, (id) =>
        universal && universalNodes.has(id)
          ? universal.manifest.id
          : primary.manifest.id,
      ),
      provenance,
      ...(versionWarning ? { versionWarning } : {}),
    },
  };
}

async function identifyPackage(
  pkg: LoadedGhostPackage,
  paths: GhostPackagePaths,
) {
  return {
    id: pkg.manifest.id,
    version: pkg.manifest.version ?? null,
    hash: await hashGhostPackage(paths.packageDir),
  };
}

export function lintGhostPackageManifest(
  raw: string,
  issues: LintIssue[],
): void {
  const manifest = parseYamlSafe(raw, "manifest.yml", issues);
  if (manifest === undefined) return;
  const manifestResult = GhostPackageManifestSchema.safeParse(manifest);
  if (!manifestResult.success) {
    if (hasRetiredSchema(manifest)) {
      issues.push({
        severity: "error",
        rule: "schema/retired",
        message: RETIRED_SCHEMA_MESSAGE,
        path: "manifest.yml.schema",
      });
      return;
    }
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
    return;
  }
}

function parseManifest(raw: string, label: string): GhostPackageManifest {
  const parsed = parseYamlStrict(raw, label);
  if (hasRetiredSchema(parsed)) throw new UsageError(RETIRED_SCHEMA_MESSAGE);
  return GhostPackageManifestSchema.parse(parsed) as GhostPackageManifest;
}

function hasRetiredSchema(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "schema" in value &&
    value.schema === RETIRED_PACKAGE_SCHEMA
  );
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
