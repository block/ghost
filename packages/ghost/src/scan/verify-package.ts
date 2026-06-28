import { access } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import type {
  GhostFingerprintDocument,
  GhostFingerprintEvidence,
} from "#ghost-core";
import {
  type LoadedFingerprintPackage,
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";

export type VerifyFingerprintSeverity = "error" | "warning" | "info";

export interface VerifyFingerprintIssue {
  severity: VerifyFingerprintSeverity;
  rule: string;
  message: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}

export interface VerifyFingerprintReport {
  issues: VerifyFingerprintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface VerifyFingerprintPackageOptions {
  root?: string;
}

export async function verifyFingerprintPackage(
  dirArg: string | undefined,
  cwd = process.cwd(),
  options: VerifyFingerprintPackageOptions = {},
): Promise<VerifyFingerprintReport> {
  const paths = resolveFingerprintPackage(dirArg, cwd);
  const root = resolve(cwd, options.root ?? ".");
  const issues: VerifyFingerprintIssue[] = [];

  const packageLint = await lintFingerprintPackage(dirArg, cwd);
  issues.push(
    ...packageLint.issues.map((issue) => ({
      severity: issue.severity,
      rule: `package/${issue.rule}`,
      message: issue.message,
      path: issue.path,
    })),
  );
  if (packageLint.errors > 0) return finalize(issues);

  const loaded = await readFingerprintPackage(paths, issues);
  const fingerprint = loaded?.fingerprint;
  if (fingerprint) {
    await verifyFingerprintEvidence(fingerprint, root, issues);
    await verifyFingerprintExemplars(fingerprint, root, issues);
  }

  return finalize(issues);
}

async function verifyFingerprintExemplars(
  fingerprint: GhostFingerprintDocument,
  root: string,
  issues: VerifyFingerprintIssue[],
): Promise<void> {
  await Promise.all(
    fingerprint.inventory.exemplars.map(async (entry, index) => {
      const exemplarPath = isAbsolute(entry.path)
        ? entry.path
        : resolve(root, entry.path);
      if (await pathExists(exemplarPath)) return;
      issues.push({
        severity: "warning",
        rule: "fingerprint-exemplar-unreachable",
        message: `fingerprint exemplar path '${entry.path}' could not be resolved from ${root}.`,
        path: `inventory.yml.exemplars[${index}].path`,
      });
    }),
  );
}

async function readFingerprintPackage(
  paths: ReturnType<typeof resolveFingerprintPackage>,
  issues: VerifyFingerprintIssue[],
): Promise<LoadedFingerprintPackage | undefined> {
  try {
    return await loadFingerprintPackage(paths);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "verify-fingerprint-read-failed",
      message: `fingerprint package could not be read: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: "fingerprint",
    });
    return undefined;
  }
}

async function verifyFingerprintEvidence(
  fingerprint: GhostFingerprintDocument,
  root: string,
  issues: VerifyFingerprintIssue[],
): Promise<void> {
  const evidenceLists: Array<[string, GhostFingerprintEvidence[] | undefined]> =
    [
      ...fingerprint.intent.situations.map(
        (entry, index) =>
          [`intent.yml.situations[${index}].evidence`, entry.evidence] as [
            string,
            GhostFingerprintEvidence[] | undefined,
          ],
      ),
      ...fingerprint.intent.principles.map(
        (entry, index) =>
          [`intent.yml.principles[${index}].evidence`, entry.evidence] as [
            string,
            GhostFingerprintEvidence[] | undefined,
          ],
      ),
      ...fingerprint.intent.experience_contracts.map(
        (entry, index) =>
          [
            `intent.yml.experience_contracts[${index}].evidence`,
            entry.evidence,
          ] as [string, GhostFingerprintEvidence[] | undefined],
      ),
      ...fingerprint.composition.patterns.map(
        (entry, index) =>
          [`composition.yml.patterns[${index}].evidence`, entry.evidence] as [
            string,
            GhostFingerprintEvidence[] | undefined,
          ],
      ),
    ];

  for (const [path, evidence] of evidenceLists) {
    if (!evidence) continue;
    await Promise.all(
      evidence.map(async (entry, index) => {
        if (!entry.path) return;
        const evidencePath = isAbsolute(entry.path)
          ? entry.path
          : resolve(root, entry.path);
        if (await pathExists(evidencePath)) return;
        issues.push({
          severity: "warning",
          rule: "fingerprint-evidence-unreachable",
          message: `fingerprint evidence path '${entry.path}' could not be resolved from ${root}.`,
          path: `${path}[${index}].path`,
        });
      }),
    );
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function _isMissingFileError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}

function finalize(issues: VerifyFingerprintIssue[]): VerifyFingerprintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}

export function formatVerifyFingerprintReport(
  report: VerifyFingerprintReport,
): string {
  const lines: string[] = [];
  for (const issue of report.issues) {
    const prefix =
      issue.severity === "error"
        ? "ERROR"
        : issue.severity === "warning"
          ? "WARN "
          : "INFO ";
    const pathSuffix = issue.path ? ` @ ${issue.path}` : "";
    const countSuffix =
      issue.expected !== undefined || issue.actual !== undefined
        ? ` (expected ${String(issue.expected)}, actual ${String(issue.actual)})`
        : "";
    lines.push(
      `${prefix} [${issue.rule}] ${issue.message}${pathSuffix}${countSuffix}`,
    );
  }
  lines.push(
    "",
    `${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info`,
  );
  return `${lines.join("\n")}\n`;
}
