import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  type GhostCatalog,
  type GhostFingerprintPackageManifest,
  UsageError,
} from "#ghost-core";
import { isExistingPathError, isMissingPathError } from "../internal/fs.js";
import type { LoadedCheck } from "./check-files.js";
import {
  FINGERPRINT_COMPOSITION_FILENAME,
  FINGERPRINT_INTENT_FILENAME,
  FINGERPRINT_INVENTORY_FILENAME,
  FINGERPRINT_MANIFEST_FILENAME,
  GHOST_GLOSSARY_FILENAME,
} from "./constants.js";
import { loadFingerprintPackage } from "./fingerprint-package-loader.js";
import { resolveGhostDirDefault } from "./package-paths.js";
import {
  DEFAULT_TEMPLATE_NAME,
  type GhostInitTemplate,
  getInitBody,
  getInitTemplate,
  listInitBodies,
  listInitTemplates,
} from "./templates.js";

// The lint pass lives beside this module; re-export it so `validate` callers
// keep a single import site for package loading and linting.
export { lintFingerprintPackage } from "./fingerprint-package-lint.js";
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
  /** Whether `.ghost/checks/` exists; `ghost review` requires it. */
  hasChecksDir: boolean;
  /** Checks from `.ghost/checks/`; never part of gather/pull. */
  checks: Map<string, LoadedCheck>;
  /**
   * Nodes that failed per-node lint and were skipped while loading the catalog,
   * each with its package-relative file path and first error message. Carried
   * so `validate` can surface a malformed node instead of silently dropping it.
   */
  invalid: Array<{ file: string; message: string }>;
  /** Check files that failed lint/loading. */
  invalidChecks: Array<{ file: string; message: string }>;
}

export interface InitFingerprintPackageOptions {
  /** Init template name (default: "skeleton"). Mutually exclusive with `body`. */
  template?: string;
  /**
   * Init body name (e.g. "vessel-light"): a full inhabited package with
   * answered dials, materials, and its own checks. Mutually exclusive with
   * `template`.
   */
  body?: string;
  force?: boolean;
}

export interface InitFingerprintPackageResult {
  paths: FingerprintPackagePaths;
  /** Package-relative paths of the files the template wrote. */
  written: string[];
}

/**
 * Resolve the fingerprint package directory. `dirArg` (an explicit
 * `--package <dir>`) always wins and is used exactly as given — it may be
 * absolute or relative, unlike `GHOST_PACKAGE_DIR`. When `dirArg` is
 * omitted, `GHOST_PACKAGE_DIR` is honored so every command — not just `init`
 * and `validate` — respects a host-configured package location. Falls back
 * to the default `.ghost` when neither is set.
 */
export function resolveFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
): FingerprintPackagePaths {
  const dir = resolve(cwd, dirArg ?? resolveGhostDirDefault());
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
  if (options.body !== undefined && options.template !== undefined) {
    throw new UsageError(
      "--body and --template are mutually exclusive. A template is a shape of emptiness; a body is a full inhabited package — pick one.",
    );
  }

  let source: Pick<GhostInitTemplate, "files">;
  if (options.body !== undefined) {
    const body = getInitBody(options.body);
    if (!body) {
      throw new UsageError(
        `Unknown init body '${options.body}'. Available: ${listInitBodies().join(", ")}.`,
      );
    }
    source = body;
  } else {
    const templateName = options.template ?? DEFAULT_TEMPLATE_NAME;
    const template = getInitTemplate(templateName);
    if (!template) {
      throw new UsageError(
        `Unknown init template '${templateName}'. Available: ${listInitTemplates().join(", ")}.`,
      );
    }
    source = template;
  }

  const paths = resolveFingerprintPackage(dirArg, cwd);
  await mkdir(paths.packageDir, { recursive: true });

  const files = (await source.files()).map((file) => ({
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
  content: string | Uint8Array,
  force = false,
): Promise<void> {
  try {
    await writeFile(
      path,
      content,
      typeof content === "string"
        ? { encoding: "utf-8", flag: force ? "w" : "wx" }
        : { flag: force ? "w" : "wx" },
    );
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
