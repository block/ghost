import { access, readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import type {
  GhostCheck,
  GhostPatternsDocument,
  GhostResourcesDocument,
  Survey,
} from "#ghost-core";
import {
  lintFingerprintPackage,
  resolveFingerprintPackage,
} from "./fingerprint-package.js";
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

  const [resources, survey, patterns, checks] = await Promise.all([
    readYaml<GhostResourcesDocument>(paths.resources, "resources.yml", issues),
    readJson<Survey>(paths.survey, "survey.json", issues),
    readYaml<GhostPatternsDocument>(paths.patterns, "patterns.yml", issues),
    readOptionalYaml<{ checks?: GhostCheck[] }>(
      paths.checks,
      "checks.yml",
      issues,
    ),
  ]);

  if (resources) {
    await verifyResourcesReachable(resources, root, issues);
  }

  if (survey && patterns) {
    verifyPatternEvidence(patterns, survey, issues);
    verifyPatternSurfaceTypes(patterns, survey, issues);
  }

  if (patterns && checks?.checks) {
    verifyCheckPatternReferences(patterns, checks.checks, issues);
  }

  return finalize(issues);
}

async function readYaml<T>(
  path: string,
  label: string,
  issues: VerifyFingerprintIssue[],
): Promise<T | undefined> {
  try {
    return parseYaml(await readFile(path, "utf-8")) as T;
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "verify-yaml-read-failed",
      message: `${label} could not be read as YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

async function readOptionalYaml<T>(
  path: string,
  label: string,
  issues: VerifyFingerprintIssue[],
): Promise<T | undefined> {
  try {
    return parseYaml(await readFile(path, "utf-8")) as T;
  } catch (err) {
    if (isMissingFileError(err)) return undefined;
    issues.push({
      severity: "error",
      rule: "verify-yaml-read-failed",
      message: `${label} could not be read as YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

async function readJson<T>(
  path: string,
  label: string,
  issues: VerifyFingerprintIssue[],
): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf-8")) as T;
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "verify-json-read-failed",
      message: `${label} could not be read as JSON: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

async function verifyResourcesReachable(
  resources: GhostResourcesDocument,
  root: string,
  issues: VerifyFingerprintIssue[],
): Promise<void> {
  const refs: Array<
    readonly [
      string,
      {
        target?: string;
        paths?: string[];
      },
    ]
  > = [
    ["primary", resources.primary],
    ...(resources.design_system ?? []).map(
      (ref, index) => [`design_system[${index}]`, ref] as const,
    ),
    ...(resources.surfaces ?? []).map(
      (ref, index) => [`surfaces[${index}]`, ref] as const,
    ),
    ...(resources.screenshots ?? []).map(
      (ref, index) => [`screenshots[${index}]`, ref] as const,
    ),
    ...(resources.docs ?? []).map(
      (ref, index) => [`docs[${index}]`, ref] as const,
    ),
    ...(resources.resolvers ?? []).map(
      (ref, index) => [`resolvers[${index}]`, ref] as const,
    ),
    ...(resources.upstreams ?? []).map(
      (ref, index) => [`upstreams[${index}]`, ref] as const,
    ),
  ];

  for (const [label, ref] of refs) {
    const target =
      "target" in ref && typeof ref.target === "string" ? ref.target : "";
    const candidates = [
      ...(target && isLocalTarget(target) ? [target] : []),
      ...(ref.paths ?? []),
    ];
    for (const candidate of candidates) {
      const path = isAbsolute(candidate) ? candidate : resolve(root, candidate);
      if (await pathExists(path)) continue;
      issues.push({
        severity: "warning",
        rule: "resource-unreachable",
        message: `resource path '${candidate}' could not be resolved from ${root}.`,
        path: `resources.yml.${label}`,
      });
    }
  }
}

function verifyPatternEvidence(
  patterns: GhostPatternsDocument,
  survey: Survey,
  issues: VerifyFingerprintIssue[],
): void {
  patterns.composition_patterns.forEach((pattern, index) => {
    const evidence = pattern.evidence ?? [];
    if (evidence.length === 0) {
      issues.push({
        severity: "error",
        rule: "pattern-evidence-missing",
        message: `composition pattern '${pattern.id}' has no survey evidence.`,
        path: `patterns.yml.composition_patterns[${index}].evidence`,
      });
      return;
    }

    const supported = evidence.some((entry) =>
      survey.ui_surfaces.some((surface) => {
        if (entry.surface_id && surface.id === entry.surface_id) return true;
        if (entry.locator && surface.locator === entry.locator) return true;
        if (entry.path && surface.files.includes(entry.path)) return true;
        return false;
      }),
    );
    if (!supported) {
      issues.push({
        severity: "error",
        rule: "pattern-evidence-unbacked",
        message: `composition pattern '${pattern.id}' evidence does not match any survey surface id, locator, or file.`,
        path: `patterns.yml.composition_patterns[${index}].evidence`,
      });
    }
  });
}

function verifyPatternSurfaceTypes(
  patterns: GhostPatternsDocument,
  survey: Survey,
  issues: VerifyFingerprintIssue[],
): void {
  const surveyedTypes = new Set(
    survey.ui_surfaces
      .map((surface) => surface.classification?.surface_type)
      .filter((value): value is string => Boolean(value)),
  );
  patterns.surface_types.forEach((surfaceType, index) => {
    if (surveyedTypes.size === 0 || surveyedTypes.has(surfaceType.id)) return;
    issues.push({
      severity: "warning",
      rule: "surface-type-unobserved",
      message: `surface type '${surfaceType.id}' is not observed in survey.ui_surfaces[].classification.surface_type.`,
      path: `patterns.yml.surface_types[${index}].id`,
    });
  });
}

function verifyCheckPatternReferences(
  patterns: GhostPatternsDocument,
  checks: GhostCheck[],
  issues: VerifyFingerprintIssue[],
): void {
  const patternIds = new Set(
    patterns.composition_patterns.map((pattern) => pattern.id),
  );
  checks.forEach((check, checkIndex) => {
    check.applies_to?.pattern_ids?.forEach((patternId, patternIndex) => {
      if (patternIds.has(patternId)) return;
      issues.push({
        severity: "error",
        rule: "check-pattern-unknown",
        message: `check '${check.id}' references unknown composition pattern '${patternId}'.`,
        path: `checks.yml.checks[${checkIndex}].applies_to.pattern_ids[${patternIndex}]`,
      });
    });
  });
}

function isLocalTarget(target: string): boolean {
  return (
    target === "." ||
    target.startsWith("./") ||
    target.startsWith("../") ||
    target.startsWith("/")
  );
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

function finalize(issues: VerifyFingerprintIssue[]): VerifyFingerprintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
