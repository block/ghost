import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  assembleCatalog,
  type GhostPackageManifest,
  GhostPackageManifestSchema,
  UsageError,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import { loadCheckFiles } from "./check-files.js";
import type { GhostPackagePaths, LoadedGhostPackage } from "./ghost-package.js";
import type { LintIssue } from "./lint.js";
import { loadNodeFiles } from "./node-files.js";

const RETIRED_PACKAGE_SCHEMA = "ghost.fingerprint-package/v1";
const RETIRED_SCHEMA_MESSAGE =
  "manifest.yml uses the retired schema ghost.fingerprint-package/v1. Replace it with `schema: ghost.package/v1`, then run `ghost validate`.";

export async function loadGhostPackage(
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

  // The catalog is flat and valid by construction — no edges to resolve.
  // Per-node schema failures are collected as `invalid`.
  const { nodes: placedNodes, invalid } = await loadNodeFiles(paths.packageDir);
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
