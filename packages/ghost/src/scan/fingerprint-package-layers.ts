import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import {
  assembleCatalog,
  type GhostFingerprintPackageManifest,
  GhostFingerprintPackageManifestSchema,
  KNOWN_FINGERPRINT_PLUGINS,
  UsageError,
} from "#ghost-core";
import { isMissingPathError } from "../internal/fs.js";
import type {
  FingerprintPackagePaths,
  LoadedFingerprintPackage,
} from "./fingerprint-package.js";
import type { LintIssue } from "./lint.js";
import { loadNodeTree } from "./node-tree.js";

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

  // The catalog is flat and valid by construction — no edges to resolve, so no
  // graph-level lint. Per-node schema failures are collected as `invalid`.
  const { nodes: placedNodes, invalid } = await loadNodeTree(paths.packageDir);
  const catalog = assembleCatalog({ placedNodes });

  return {
    manifest,
    manifestRaw,
    catalog,
    invalid,
  };
}

export interface ManifestLintContext {
  /** Whether the package has a `haunt/` subtree on disk. */
  hauntDirPresent: boolean;
}

export function lintFingerprintPackageManifest(
  raw: string,
  issues: LintIssue[],
  context?: ManifestLintContext,
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
  if (context !== undefined) {
    lintManifestPlugins(manifestResult.data.plugins, context, issues);
  }
}

/**
 * Plugin declaration hygiene. The `plugins:` key declares which reserved
 * plugin subtrees the package uses; it never gates loading — `haunt/` stays
 * reserved unconditionally. Mismatches are warnings/info, never errors.
 */
function lintManifestPlugins(
  plugins: string[] | undefined,
  context: ManifestLintContext,
  issues: LintIssue[],
): void {
  const declared = new Set(plugins ?? []);
  const known = new Set<string>(KNOWN_FINGERPRINT_PLUGINS);

  for (const plugin of declared) {
    if (!known.has(plugin)) {
      issues.push({
        severity: "warning",
        rule: "plugin-unknown",
        message: `unknown plugin '${plugin}'`,
        path: "manifest.yml.plugins",
      });
    }
  }

  if (context.hauntDirPresent && !declared.has("haunt")) {
    issues.push({
      severity: "warning",
      rule: "plugin-undeclared",
      message: "haunt/ subtree present but not declared in manifest plugins",
      path: "manifest.yml.plugins",
    });
  }

  if (!context.hauntDirPresent && declared.has("haunt")) {
    issues.push({
      severity: "info",
      rule: "plugin-subtree-absent",
      message:
        "manifest declares the 'haunt' plugin but no haunt/ subtree exists yet — harmless",
      path: "manifest.yml.plugins",
    });
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
