import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  assembleCatalog,
  type GhostPackageManifest,
  GhostPackageManifestSchema,
  inspectLayeredContext,
  isBaselinePackage,
  isLayeredPackage,
  parseCheckReference,
  parseGlossary,
  UsageError,
} from "#ghost-core";
import { isMissingPathError, readOptionalUtf8 } from "../internal/fs.js";
import { loadCheckFiles } from "./check-files.js";
import type { GhostPackagePaths, LoadedGhostPackage } from "./ghost-package.js";
import type { LintIssue } from "./lint.js";
import { loadNodeFiles } from "./node-files.js";
import { resolveGitRoot } from "./package-paths.js";

const RETIRED_PACKAGE_SCHEMA = "ghost.fingerprint-package/v1";
const RETIRED_SCHEMA_MESSAGE =
  "manifest.yml uses the retired schema ghost.fingerprint-package/v1. Replace it with `schema: ghost.package/v1`, then run `ghost validate`.";

export async function loadGhostPackage(
  paths: GhostPackagePaths,
): Promise<LoadedGhostPackage> {
  const loaded = await loadSinglePackage(paths);
  if (loaded.manifest.baseline === undefined) {
    if (paths.baseline && !isLayeredPackage(loaded.manifest))
      loaded.notices?.push({
        severity: "info",
        rule: "legacy-baseline-ignored",
        path: "manifest.yml",
        message:
          "--baseline is ignored for a legacy package; declare manifest baseline to enable layering",
      });
    return loaded;
  }
  if (!paths.baseline) return loaded;
  const baseline = await loadSinglePackage(paths.baseline);
  const baselineDir = paths.baseline.packageDir;
  if (!isBaselinePackage(baseline.manifest)) {
    throw new UsageError(
      `Baseline ${baselineDir} must declare manifest core or version`,
    );
  }
  const baselineGlossaryRaw = await readOptionalUtf8(paths.baseline.glossary);
  const glossary = parseGlossary(baselineGlossaryRaw ?? "");
  if (baselineGlossaryRaw !== undefined && glossary.glossary === null) {
    throw new UsageError(
      `Baseline ${baselineDir} has an invalid glossary: ${glossary.errors.join("; ")}`,
    );
  }
  const brandGlossary = parseGlossary(
    (await readOptionalUtf8(paths.glossary)) ?? "",
  );
  const baselineKinds = new Set(
    (glossary.glossary?.kinds ?? []).map((kind) => kind.name),
  );
  for (const kind of brandGlossary.glossary?.kinds ?? []) {
    if (
      baselineKinds.has(kind.name) &&
      !["framing", "identity", "interface", "fundamentals"].includes(kind.name)
    ) {
      throw new UsageError(
        `Duplicate glossary kind "${kind.name}" in package ${paths.packageDir} and baseline ${baselineDir}; overlapping declared kinds are not allowed`,
      );
    }
  }
  for (const node of baseline.catalog.nodes.values()) {
    if (node.scope !== "baseline") {
      throw new UsageError(
        `Baseline node "${node.id}" must have baseline scope`,
      );
    }
  }
  // Baselines are independent: their prerequisites and core resolve locally,
  // never by borrowing a brand node from the consuming package.
  const context = inspectLayeredContext(
    baseline.catalog.nodes,
    baseline.manifest,
  );
  if (context.issues.length) {
    throw new UsageError(
      `Baseline ${baselineDir}: ${context.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")}`,
    );
  }
  for (const [label, own, other, invalid, otherInvalid] of [
    [
      "node",
      loaded.catalog.nodes,
      baseline.catalog.nodes,
      loaded.invalid,
      baseline.invalid,
    ],
    [
      "check",
      loaded.checks,
      baseline.checks,
      loaded.invalidChecks,
      baseline.invalidChecks,
    ],
  ] as const) {
    const ids = new Set([
      ...own.keys(),
      ...invalid.map((entry) =>
        entry.file.replace(/^checks\//, "").replace(/\.md$/, ""),
      ),
    ]);
    for (const id of [
      ...other.keys(),
      ...otherInvalid.map((entry) =>
        entry.file.replace(/^checks\//, "").replace(/\.md$/, ""),
      ),
    ]) {
      if (ids.has(id))
        throw new UsageError(
          `Duplicate ${label} ID "${id}" in package and baseline; no precedence overwrites are allowed`,
        );
    }
  }
  for (const check of baseline.checks.values()) {
    for (const reference of check.references) {
      const id = parseCheckReference(reference)?.nodeId;
      if (
        id &&
        !baseline.catalog.nodes.has(id) &&
        loaded.catalog.nodes.has(id)
      ) {
        throw new UsageError(
          `Baseline check "${check.id}" cannot reference brand node "${id}"`,
        );
      }
    }
  }
  const brandRepoRoot = await resolveGitRoot(paths.packageDir);
  for (const node of loaded.catalog.nodes.values())
    node.repoRoot = brandRepoRoot;
  const repoRoot = await resolveGitRoot(baselineDir);
  for (const node of baseline.catalog.nodes.values()) node.repoRoot = repoRoot;
  return {
    ...loaded,
    core: [...new Set([...(baseline.core ?? []), ...(loaded.core ?? [])])],
    baseline: { ...baseline, paths: paths.baseline, repoRoot },
    catalog: {
      nodes: new Map([...loaded.catalog.nodes, ...baseline.catalog.nodes]),
    },
    checks: new Map([...loaded.checks, ...baseline.checks]),
    hasChecksDir: loaded.hasChecksDir || baseline.hasChecksDir,
    invalid: [
      ...loaded.invalid,
      ...baseline.invalid.map((entry) => ({
        ...entry,
        file: join(baselineDir, entry.file),
      })),
    ],
    invalidChecks: [
      ...loaded.invalidChecks,
      ...baseline.invalidChecks.map((entry) => ({
        ...entry,
        file: join(baselineDir, entry.file),
      })),
    ],
  };
}

async function loadSinglePackage(
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

  // The catalog is flat; prerequisite integrity is checked by validate and pull.
  // Per-node schema failures are collected as `invalid`.
  const layered = isLayeredPackage(manifest);
  const { nodes: placedNodes, invalid } = await loadNodeFiles(
    paths.packageDir,
    !layered,
  );
  const notices: LintIssue[] = [];
  if (
    !layered &&
    (manifest.cover !== undefined ||
      placedNodes.some((node) =>
        Object.keys(node.doc.frontmatter).some(
          (key) => !["for", "requires", "materials"].includes(key),
        ),
      ))
  ) {
    notices.push({
      severity: "warning",
      rule: "legacy-contract-deprecated",
      path: "manifest.yml",
      message:
        "Legacy package metadata is deprecated; rename the cover node to framing.md and remove `cover`, remove descriptive node keys, and declare manifest baseline when ready to migrate",
    });
  }
  const checkFiles = await loadCheckFiles(paths.packageDir);
  const catalog = assembleCatalog({ placedNodes });
  for (const node of catalog.nodes.values()) {
    node.packageDir = paths.packageDir;
    if (layered) {
      const baseline = isBaselinePackage(manifest);
      if (
        (!baseline && node.id.split("/").pop()?.startsWith("baseline.")) ||
        (!baseline && node.layer === "fundamentals") ||
        (baseline &&
          (node.scope !== "baseline" ||
            !["fundamentals", "interface"].includes(node.layer ?? "")))
      ) {
        throw new UsageError(
          `Invalid filename classification for "${node.id}": brands cannot contain baseline-prefixed or fundamentals nodes; baselines contain only baseline.fundamentals.* and baseline.interface.* nodes`,
        );
      }
    }
    if (!layered) {
      delete node.scope;
      delete node.layer;
    }
  }
  for (const check of checkFiles.checks.values())
    check.packageDir = paths.packageDir;

  return {
    manifest,
    manifestRaw,
    notices,
    ...(manifest.core ? { core: [...manifest.core] } : {}),
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
