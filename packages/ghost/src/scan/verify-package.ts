import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  classifyContractReference,
  GHOST_BINDING_FILENAME,
  GhostBindingSchema,
  type GhostFingerprintDocument,
  type GhostFingerprintEvidence,
  GhostSurfacesSchema,
} from "#ghost-core";
import { resolveContractDir } from "./contract-resolver.js";
import {
  type LoadedFingerprintPackage,
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";
import { resolveGitRoot } from "./fingerprint-stack.js";
import type {
  VerifyFingerprintIssue,
  VerifyFingerprintReport,
} from "./verify-fingerprint.js";

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

  // Verify an adjacent .ghost.bind.yml: an external contract must resolve and
  // the bound surfaces must exist in it.
  await verifyBindingContract(dirname(paths.dir), cwd, issues);

  return finalize(issues);
}

async function verifyBindingContract(
  bindingDir: string,
  cwd: string,
  issues: VerifyFingerprintIssue[],
): Promise<void> {
  const bindingPath = join(bindingDir, GHOST_BINDING_FILENAME);
  let raw: string;
  try {
    raw = await readFile(bindingPath, "utf-8");
  } catch {
    return; // no binding to verify
  }

  const parsed = GhostBindingSchema.safeParse(parseYaml(raw));
  if (!parsed.success) return; // lint reports schema problems separately

  const { contract, bindings } = parsed.data;
  // The in-repo contract is validated by the package's own lint/verify.
  if (classifyContractReference(contract) !== "npm") return;

  const repoRoot = await resolveGitRoot(cwd);
  const contractDir = await resolveContractDir(contract, bindingDir, repoRoot);
  if (!contractDir) {
    issues.push({
      severity: "error",
      rule: "binding-contract-unresolved",
      message: `binding contract '${contract}' could not be resolved from node_modules.`,
      path: GHOST_BINDING_FILENAME,
    });
    return;
  }

  const surfaceIds = await readContractSurfaceIds(contractDir);
  if (surfaceIds === null) {
    issues.push({
      severity: "error",
      rule: "binding-contract-unresolved",
      message: `binding contract '${contract}' has no readable surfaces.yml.`,
      path: GHOST_BINDING_FILENAME,
    });
    return;
  }

  bindings.forEach((entry, index) => {
    if (entry.surface === "core") return; // implicit root
    if (!surfaceIds.has(entry.surface)) {
      issues.push({
        severity: "error",
        rule: "binding-surface-unknown",
        message: `binding references surface '${entry.surface}' not declared in contract '${contract}'.`,
        path: `bindings[${index}].surface`,
      });
    }
  });
}

async function readContractSurfaceIds(
  contractDir: string,
): Promise<Set<string> | null> {
  try {
    const raw = await readFile(join(contractDir, "surfaces.yml"), "utf-8");
    const parsed = GhostSurfacesSchema.safeParse(parseYaml(raw));
    if (!parsed.success) return null;
    return new Set(parsed.data.surfaces.map((surface) => surface.id));
  } catch {
    return null;
  }
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
