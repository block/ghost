import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  type GhostFingerprintPackageManifest,
  type GhostGraph,
  lintGraph,
  UsageError,
} from "#ghost-core";
import { isExistingPathError, isMissingPathError } from "../internal/fs.js";
import {
  FINGERPRINT_COMPOSITION_FILENAME,
  FINGERPRINT_INTENT_FILENAME,
  FINGERPRINT_INVENTORY_FILENAME,
  FINGERPRINT_MANIFEST_FILENAME,
  FINGERPRINT_PACKAGE_DIR,
} from "./constants.js";
import {
  lintFingerprintPackageManifest,
  loadFingerprintPackage,
} from "./fingerprint-package-layers.js";
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
  /** Legacy facet paths — used only to detect legacy packages for migration. */
  intent: string;
  inventory: string;
  composition: string;
}

export interface LoadedFingerprintPackage {
  manifest: GhostFingerprintPackageManifest;
  manifestRaw: string;
  /** The in-memory node graph — the only fingerprint model. */
  graph: GhostGraph;
  /**
   * Nodes that failed per-node lint and were skipped while folding the graph,
   * each with its package-relative file path and first error message. Carried
   * so `validate` can surface a malformed node instead of silently dropping it.
   */
  invalid: Array<{ file: string; message: string }>;
}

export interface InitFingerprintPackageOptions {
  /** Init template name (default: "default"). */
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
 * `validate` for a package: shape pass (manifest well-formed) + graph pass
 * (the node network is correct — links resolve, one root, acyclic). Loading the
 * package already runs the graph pass and throws on error; here we surface both
 * passes as a structured report.
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
    lintFingerprintPackageManifest(manifestRaw, issues);
    // graph pass: fold + validate the node network.
    try {
      const { graph, invalid } = await loadFingerprintPackage(paths);
      // node pass: a node that failed its own schema was skipped while folding
      // the graph; surface it here so a malformed node is loud, not silent.
      issues.push(
        ...invalid.map((entry) => ({
          severity: "error" as const,
          rule: "node-invalid",
          message: entry.message,
          path: entry.file,
        })),
      );
      const graphReport = lintGraph(graph);
      issues.push(
        ...graphReport.issues.map((issue) => ({
          severity: issue.severity,
          rule: issue.rule,
          message: issue.message,
          ...(issue.node ? { path: `${issue.node}.md` } : {}),
        })),
      );
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
