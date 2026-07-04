import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  assembleCatalog,
  type GhostFingerprintPackageManifest,
  GhostFingerprintPackageManifestSchema,
  parseGlossary,
  UsageError,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import type {
  FingerprintPackagePaths,
  LoadedFingerprintPackage,
} from "./fingerprint-package.js";
import { loadHauntFiles } from "./haunt-files.js";
import type { LintIssue } from "./lint.js";
import { loadNodeFiles } from "./node-files.js";

export async function loadFingerprintPackage(
  paths: FingerprintPackagePaths,
): Promise<LoadedFingerprintPackage> {
  let manifestRaw: string;
  try {
    manifestRaw = await readFile(paths.manifest, "utf-8");
  } catch (err) {
    // A missing package is a usage error (run `ghost init`), not a crash.
    if (isMissingPathError(err)) {
      throw new UsageError(
        `No Ghost fingerprint package found at ${paths.packageDir} (expected manifest.yml). Run \`ghost init\` or pass --package <dir>.`,
      );
    }
    throw err;
  }
  const manifest = parseManifest(manifestRaw, "manifest.yml");

  // The catalog is flat and valid by construction — no edges to resolve.
  // Per-node schema failures are collected as `invalid`.
  const { nodes: placedNodes, invalid } = await loadNodeFiles(paths.packageDir);
  const haunts = await loadHauntFiles(paths.packageDir);
  const catalog = assembleCatalog({
    placedNodes,
    wildKinds: await readWildGlossaryKinds(paths.glossary),
  });

  return {
    manifest,
    manifestRaw,
    catalog,
    haunts: haunts.installed,
    checks: haunts.checks,
    invalid,
    invalidHaunts: haunts.invalid,
  };
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
    return;
  }
}

async function readWildGlossaryKinds(glossaryPath: string): Promise<string[]> {
  let raw: string;
  try {
    raw = await readFile(glossaryPath, "utf-8");
  } catch (err) {
    if (isMissingPathError(err)) return [];
    throw err;
  }

  const result = parseGlossary(raw);
  if (result.glossary === null) return [];
  return result.glossary.kinds
    .filter((kind) => kind.posture === "wild")
    .map((kind) => kind.name);
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
