import { access, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  GhostCheck,
  GhostFingerprintDocument,
  GhostFingerprintEvidence,
  GhostValidateDocument,
} from "#ghost-core";
import { GhostValidateSchema } from "#ghost-core";
import {
  type LoadedFingerprintPackage,
  lintFingerprintPackage,
  loadFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";
import type { GhostPackageConfig } from "./package-config.js";
import { readOptionalPackageConfig } from "./package-config.js";
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

  const [loaded, checks] = await Promise.all([
    readFingerprintPackage(paths, issues),
    readOptionalChecks(paths.checks, issues),
  ]);
  const fingerprint = loaded?.fingerprint;
  const config = await readOptionalConfig(paths.config, issues);

  if (fingerprint) {
    await verifyFingerprintEvidence(fingerprint, root, issues);
    await verifyFingerprintExemplars(fingerprint, root, issues);
  }

  if (fingerprint && checks) {
    verifyFingerprintCheckRefs(fingerprint, checks.checks, issues);
  }

  if (config) {
    await verifyPackageConfig(config, root, issues);
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
        path: `fingerprint/inventory.yml.exemplars[${index}].path`,
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

async function readOptionalChecks(
  path: string,
  issues: VerifyFingerprintIssue[],
): Promise<GhostValidateDocument | undefined> {
  try {
    const parsed = parseYaml(await readFile(path, "utf-8"));
    const result = GhostValidateSchema.safeParse(parsed);
    if (result.success) return result.data as GhostValidateDocument;
    issues.push({
      severity: "error",
      rule: "verify-checks-read-failed",
      message:
        "fingerprint/validate.yml failed schema validation after package lint.",
      path: "fingerprint/validate.yml",
    });
    return undefined;
  } catch (err) {
    if (isMissingFileError(err)) return undefined;
    issues.push({
      severity: "error",
      rule: "verify-checks-read-failed",
      message: `fingerprint/validate.yml could not be read as YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: "fingerprint/validate.yml",
    });
    return undefined;
  }
}

async function readOptionalConfig(
  path: string,
  issues: VerifyFingerprintIssue[],
): Promise<GhostPackageConfig | undefined> {
  try {
    return await readOptionalPackageConfig(path);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "verify-config-read-failed",
      message: `config.yml could not be read: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: "config.yml",
    });
    return undefined;
  }
}

async function verifyPackageConfig(
  config: GhostPackageConfig,
  root: string,
  issues: VerifyFingerprintIssue[],
): Promise<void> {
  const pathChecks: Array<{ path: string; label: string }> = [];
  config.targets.forEach((target, targetIndex) => {
    target.roots.forEach((entry, entryIndex) => {
      if (entry) {
        pathChecks.push({
          path: entry,
          label: `config.yml.targets[${targetIndex}].roots[${entryIndex}]`,
        });
      }
    });
    target.components?.forEach((entry, entryIndex) => {
      pathChecks.push({
        path: entry,
        label: `config.yml.targets[${targetIndex}].components[${entryIndex}]`,
      });
    });
    target.tokens?.forEach((entry, entryIndex) => {
      pathChecks.push({
        path: entry,
        label: `config.yml.targets[${targetIndex}].tokens[${entryIndex}]`,
      });
    });
  });

  config.libraries.forEach((library, libraryIndex) => {
    if (library.source.startsWith("workspace:")) {
      pathChecks.push({
        path: library.source.slice("workspace:".length),
        label: `config.yml.libraries[${libraryIndex}].source`,
      });
    }
    if (library.source.startsWith("registry:")) {
      const registryPath = library.source.slice("registry:".length);
      if (!isRemoteReference(registryPath)) {
        pathChecks.push({
          path: registryPath,
          label: `config.yml.libraries[${libraryIndex}].source`,
        });
      }
    }
    if (library.fingerprint) {
      pathChecks.push({
        path: library.fingerprint,
        label: `config.yml.libraries[${libraryIndex}].fingerprint`,
      });
    }
  });

  await Promise.all(
    pathChecks.map(async (entry) => {
      const resolved = isAbsolute(entry.path)
        ? entry.path
        : resolve(root, entry.path);
      if (await pathExists(resolved)) return;
      issues.push({
        severity: "error",
        rule: "config-path-unreachable",
        message: `config path '${entry.path}' could not be resolved from ${root}.`,
        path: entry.label,
      });
    }),
  );
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
          [
            `fingerprint/intent.yml.situations[${index}].evidence`,
            entry.evidence,
          ] as [string, GhostFingerprintEvidence[] | undefined],
      ),
      ...fingerprint.intent.principles.map(
        (entry, index) =>
          [
            `fingerprint/intent.yml.principles[${index}].evidence`,
            entry.evidence,
          ] as [string, GhostFingerprintEvidence[] | undefined],
      ),
      ...fingerprint.intent.experience_contracts.map(
        (entry, index) =>
          [
            `fingerprint/intent.yml.experience_contracts[${index}].evidence`,
            entry.evidence,
          ] as [string, GhostFingerprintEvidence[] | undefined],
      ),
      ...fingerprint.composition.patterns.map(
        (entry, index) =>
          [
            `fingerprint/composition.yml.patterns[${index}].evidence`,
            entry.evidence,
          ] as [string, GhostFingerprintEvidence[] | undefined],
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

function verifyFingerprintCheckRefs(
  fingerprint: GhostFingerprintDocument,
  checks: GhostCheck[],
  issues: VerifyFingerprintIssue[],
): void {
  const checkIds = new Set(checks.map((check) => check.id));
  const checkRefLists: Array<[string, string[] | undefined]> = [
    ...fingerprint.intent.principles.map(
      (entry, index) =>
        [
          `fingerprint/intent.yml.principles[${index}].check_refs`,
          entry.check_refs,
        ] as [string, string[] | undefined],
    ),
    ...fingerprint.intent.experience_contracts.map(
      (entry, index) =>
        [
          `fingerprint/intent.yml.experience_contracts[${index}].check_refs`,
          entry.check_refs,
        ] as [string, string[] | undefined],
    ),
    ...fingerprint.composition.patterns.map(
      (entry, index) =>
        [
          `fingerprint/composition.yml.patterns[${index}].check_refs`,
          entry.check_refs,
        ] as [string, string[] | undefined],
    ),
  ];

  checkRefLists.forEach(([path, refs]) => {
    refs?.forEach((ref, index) => {
      const [, id] = ref.split(":");
      if (id && checkIds.has(id)) return;
      issues.push({
        severity: "error",
        rule: "fingerprint-check-unknown",
        message: `fingerprint facet references unknown check '${ref}'.`,
        path: `${path}[${index}]`,
      });
    });
  });
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isMissingFileError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}

function isRemoteReference(reference: string): boolean {
  return /^https?:\/\//i.test(reference);
}

function finalize(issues: VerifyFingerprintIssue[]): VerifyFingerprintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
