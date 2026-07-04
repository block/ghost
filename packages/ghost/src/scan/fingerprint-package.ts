import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  closestIds,
  type GhostCatalog,
  type GhostFingerprintPackageManifest,
  parseGlossary,
  parseSourceRef,
  sliceNodeSection,
  UsageError,
} from "#ghost-core";
import { isExistingPathError, isMissingPathError } from "../internal/fs.js";
import {
  FINGERPRINT_COMPOSITION_FILENAME,
  FINGERPRINT_INTENT_FILENAME,
  FINGERPRINT_INVENTORY_FILENAME,
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
  GHOST_GLOSSARY_FILENAME,
} from "./constants.js";
import {
  lintFingerprintPackageManifest,
  loadFingerprintPackage,
} from "./fingerprint-package-layers.js";
import type { LoadedCheck } from "./haunt-tree.js";
import type { LintIssue, LintReport } from "./lint.js";
import {
  DEFAULT_TEMPLATE_NAME,
  getInitTemplate,
  listInitTemplates,
} from "./templates.js";

export { loadFingerprintPackage };

export interface FingerprintPackagePaths {
  dir: string;
  packageDir: string;
  manifest: string;
  glossary: string;
  /** Legacy facet paths — used only to detect pre-flat-corpus packages. */
  intent: string;
  inventory: string;
  composition: string;
}

export interface LoadedFingerprintPackage {
  manifest: GhostFingerprintPackageManifest;
  manifestRaw: string;
  /** The in-memory flat node catalog — the only fingerprint model. */
  catalog: GhostCatalog;
  /** Ids of haunts installed under `.ghost/haunts/`. */
  haunts: string[];
  /** Checks from the `checks` haunt; never part of gather/pull. */
  checks: Map<string, LoadedCheck>;
  /**
   * Nodes that failed per-node lint and were skipped while folding the catalog,
   * each with its package-relative file path and first error message. Carried
   * so `validate` can surface a malformed node instead of silently dropping it.
   */
  invalid: Array<{ file: string; message: string }>;
  /** Haunt artifacts (manifests, checks) that failed lint/loading. */
  invalidHaunts: Array<{ file: string; message: string }>;
}

export interface InitFingerprintPackageOptions {
  /** Init template name (default: "steering"). */
  template?: string;
  force?: boolean;
}

export interface InitFingerprintPackageResult {
  paths: FingerprintPackagePaths;
  /** Package-relative paths of the files the template wrote. */
  written: string[];
}

export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? FINGERPRINT_PACKAGE_DIR);
  const packageDir = dir;
  return {
    dir,
    packageDir,
    manifest: join(packageDir, FINGERPRINT_MANIFEST_FILENAME),
    glossary: join(packageDir, GHOST_GLOSSARY_FILENAME),
    intent: join(packageDir, FINGERPRINT_INTENT_FILENAME),
    inventory: join(packageDir, FINGERPRINT_INVENTORY_FILENAME),
    composition: join(packageDir, FINGERPRINT_COMPOSITION_FILENAME),
  };
}

export async function initFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: InitFingerprintPackageOptions = {},
): Promise<InitFingerprintPackageResult> {
  const templateName = options.template ?? DEFAULT_TEMPLATE_NAME;
  const template = getInitTemplate(templateName);
  if (!template) {
    throw new UsageError(
      `Unknown init template '${templateName}'. Available: ${listInitTemplates().join(", ")}.`,
    );
  }

  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.packageDir, { recursive: true });

  const files = template.files().map((file) => ({
    relativePath: file.relativePath,
    path: join(paths.packageDir, file.relativePath),
    content: file.content,
  }));

  if (!options.force) {
    await assertInitDoesNotOverwrite(files.map((file) => file.path));
  }

  // Create any nested directories the template needs (e.g. nodes/).
  const dirs = new Set(files.map((file) => dirname(file.path)));
  await Promise.all([...dirs].map((dir) => mkdir(dir, { recursive: true })));

  await Promise.all(
    files.map((file) => writeInitFile(file.path, file.content, options.force)),
  );

  return { paths, written: files.map((file) => file.relativePath) };
}

async function writeInitFile(
  path: string,
  content: string,
  force = false,
): Promise<void> {
  try {
    await writeFile(path, content, {
      encoding: "utf-8",
      flag: force ? "w" : "wx",
    });
  } catch (err) {
    if (!force && isExistingPathError(err)) {
      throw new UsageError(
        `Refusing to overwrite existing Ghost fingerprint file:\n  ${path}\nPass --force to overwrite.`,
      );
    }
    throw err;
  }
}

async function assertInitDoesNotOverwrite(paths: string[]): Promise<void> {
  const existing = [];
  for (const path of paths) {
    try {
      await access(path);
      existing.push(path);
    } catch (err) {
      if (isMissingPathError(err)) continue;
      throw err;
    }
  }
  if (existing.length > 0) {
    const formatted = existing.map((path) => `  ${path}`).join("\n");
    throw new UsageError(
      `Refusing to overwrite existing Ghost fingerprint file(s):\n${formatted}\nPass --force to overwrite.`,
    );
  }
}

/**
 * `validate` for a package: artifact shape, per-node validity, and the
 * deterministic kind-prefix lint enabled by glossary.md. The catalog is flat;
 * loading collects malformed nodes so they can be surfaced as structured issues.
 */
export async function lintFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): Promise<LintReport> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  const issues: LintIssue[] = [];

  const manifestRaw = await readRequired(
    paths.manifest,
    "manifest.yml",
    issues,
  );

  if (manifestRaw !== undefined) {
    // shape pass: manifest well-formed.
    const beforeManifestErrors = issues.filter(
      (issue) => issue.severity === "error",
    ).length;
    lintFingerprintPackageManifest(manifestRaw, issues);
    const manifestHasErrors =
      issues.filter((issue) => issue.severity === "error").length >
      beforeManifestErrors;
    if (manifestHasErrors) return finalize(issues);
    // graph pass: fold + validate the node network.
    try {
      const { catalog, checks, invalid, invalidHaunts } =
        await loadFingerprintPackage(paths);
      // node pass: a node that failed its own schema was skipped while folding
      // the catalog; surface it here so a malformed node is loud, not silent.
      issues.push(
        ...invalid.map((entry) => ({
          severity: "error" as const,
          rule: "node-invalid",
          message: entry.message,
          path: entry.file,
        })),
      );
      issues.push(
        ...invalidHaunts.map((entry) => ({
          severity: "error" as const,
          rule: "haunt-invalid",
          message: entry.message,
          path: entry.file,
        })),
      );
      await lintKindPrefixes(paths, catalog, issues);
      lintCheckReferences(catalog, checks, issues);
    } catch (err) {
      issues.push({
        severity: "error",
        rule: "package-graph-invalid",
        message: err instanceof Error ? err.message : String(err),
        path: ".ghost",
      });
    }
  }

  return finalize(issues);
}

async function lintKindPrefixes(
  paths: FingerprintPackagePaths,
  catalog: GhostCatalog,
  issues: LintIssue[],
): Promise<void> {
  const declaredKinds = await readDeclaredGlossaryKinds(paths.glossary);
  if (declaredKinds === undefined) return;

  const declared = new Set(declaredKinds);
  for (const node of catalog.nodes.values()) {
    if (node.kind === undefined || declared.has(node.kind)) continue;

    const suggestions = closestIds(node.kind, declaredKinds, 1);
    const suggestion = suggestions[0];
    issues.push({
      severity: "warning",
      rule: "kind-undeclared",
      message:
        `Kind prefix \`${node.kind}\` is not declared in ${GHOST_GLOSSARY_FILENAME}.` +
        (suggestion === undefined
          ? " Drop the prefix if this node is uncategorized."
          : ` Did you mean \`${suggestion}\`? Drop the prefix if this node is uncategorized.`),
      path: `${node.id}.md`,
    });
  }
}

function lintCheckReferences(
  catalog: GhostCatalog,
  checks: Map<string, LoadedCheck>,
  issues: LintIssue[],
): void {
  for (const check of checks.values()) {
    for (const raw of check.references) {
      const parsed = parseSourceRef(raw);
      if (parsed === null) {
        issues.push({
          severity: "error",
          rule: "check-reference-malformed",
          message: `check reference '${raw}' is not a node id with optional '> Heading' anchor`,
          path: `haunts/checks/${check.id}.md.references`,
        });
        continue;
      }
      const node = catalog.nodes.get(parsed.nodeId);
      if (node === undefined) {
        issues.push({
          severity: "warning",
          rule: "check-reference-unresolved",
          message: `check reference '${raw}' does not resolve to a fingerprint node`,
          path: `haunts/checks/${check.id}.md.references`,
        });
        continue;
      }
      if (
        parsed.heading !== undefined &&
        sliceNodeSection(node.body, parsed.heading) === null
      ) {
        issues.push({
          severity: "warning",
          rule: "check-reference-heading-missing",
          message: `check reference '${raw}' names a heading that was not found`,
          path: `haunts/checks/${check.id}.md.references`,
        });
      }
    }
  }
}

async function readDeclaredGlossaryKinds(
  glossaryPath: string,
): Promise<string[] | undefined> {
  let raw: string;
  try {
    raw = await readFile(glossaryPath, "utf-8");
  } catch (err) {
    if (isMissingPathError(err)) return undefined;
    throw err;
  }

  const result = parseGlossary(raw);
  if (result.glossary === null) return [];
  return result.glossary.frontmatter.categories.map(
    (category) => category.name,
  );
}

async function readRequired(
  path: string,
  label: string,
  issues: LintIssue[],
): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    issues.push({
      severity: "error",
      rule: "package-artifact-missing",
      message: `Fingerprint package is missing ${label}.`,
      path: label,
    });
    return undefined;
  }
}

function finalize(issues: LintIssue[]): LintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
