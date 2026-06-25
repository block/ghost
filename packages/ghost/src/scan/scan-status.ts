import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { type GhostValidateDocument, GhostValidateSchema } from "#ghost-core";
import {
  type ScanContributionReport,
  summarizeFingerprintContribution,
} from "./fingerprint-contribution.js";
import type { FingerprintPackagePaths } from "./fingerprint-package.js";
import {
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";

export type ScanStageState = "missing" | "present";

export interface ScanStageReport {
  state: ScanStageState;
  /** Absolute path to the artifact or directory. */
  path: string;
}

export type ScanStage = "fingerprint";

export interface ScanStatus {
  /** Absolute path to the Ghost package directory. */
  dir: string;
  fingerprint: ScanStageReport;
  validate: ScanStageReport;
  contribution: ScanContributionReport;
  recommended_next: ScanStage | null;
}

/**
 * Inspect a Ghost package directory and report what sparse facets this
 * package contributes. A package can contribute only intent, inventory,
 * composition, validate, or any combination; absent facets may be inherited
 * from broader stack context.
 */
export async function scanStatus(dirPath: string): Promise<ScanStatus> {
  const dir = resolve(dirPath);
  const paths = resolveFingerprintPackage(dir, process.cwd());
  const fingerprintPath = paths.packageDir;

  const [
    fingerprintPresent,
    intentPresent,
    inventoryPresent,
    compositionPresent,
    validatePresent,
  ] = await Promise.all([
    pathExists(paths.manifest, "file"),
    pathExists(paths.intent, "file"),
    pathExists(paths.inventory, "file"),
    pathExists(paths.composition, "file"),
    pathExists(paths.checks, "file"),
  ]);

  const fingerprint: ScanStageReport = {
    state: fingerprintPresent ? "present" : "missing",
    path: fingerprintPath,
  };
  const validate: ScanStageReport = {
    state: validatePresent ? "present" : "missing",
    path: paths.checks,
  };
  const contribution = await scanContribution(paths, {
    fingerprintPresent,
    intentPresent,
    inventoryPresent,
    compositionPresent,
    validatePresent,
  });

  const status: ScanStatus = {
    dir,
    fingerprint,
    validate,
    contribution,
    recommended_next: fingerprintPresent ? null : "fingerprint",
  };

  return status;
}

async function scanContribution(
  paths: FingerprintPackagePaths,
  present: {
    fingerprintPresent: boolean;
    intentPresent: boolean;
    inventoryPresent: boolean;
    compositionPresent: boolean;
    validatePresent: boolean;
  },
): Promise<ScanContributionReport> {
  const files = {
    intent: { path: paths.intent, present: present.intentPresent },
    inventory: { path: paths.inventory, present: present.inventoryPresent },
    composition: {
      path: paths.composition,
      present: present.compositionPresent,
    },
    validate: { path: paths.checks, present: present.validatePresent },
  } as const;

  if (!present.fingerprintPresent) {
    return summarizeFingerprintContribution({ files, missing: true });
  }

  try {
    const [loaded, validate] = await Promise.all([
      loadFingerprintPackage(paths),
      readOptionalValidate(paths.checks, present.validatePresent),
    ]);
    return summarizeFingerprintContribution({
      fingerprint: loaded.fingerprint,
      validate,
      files,
    });
  } catch (err) {
    return summarizeFingerprintContribution({
      files,
      invalidReason: err instanceof Error ? err.message : String(err),
    });
  }
}

async function readOptionalValidate(
  path: string,
  present: boolean,
): Promise<GhostValidateDocument | undefined> {
  if (!present) return undefined;
  const parsed = parseYaml(await readFile(path, "utf-8"));
  const result = GhostValidateSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `validate.yml failed schema validation: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return result.data as GhostValidateDocument;
}

async function pathExists(
  path: string,
  kind: "file" | "directory" = "file",
): Promise<boolean> {
  try {
    const s = await stat(path);
    return kind === "directory" ? s.isDirectory() : s.isFile() && s.size > 0;
  } catch {
    return false;
  }
}
