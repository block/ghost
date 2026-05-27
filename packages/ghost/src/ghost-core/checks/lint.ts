import { getEffectiveMapScopes } from "../map/index.js";
import { GhostChecksSchema } from "./schema.js";
import type {
  GhostCheck,
  GhostChecksDocument,
  GhostChecksLintIssue,
  GhostChecksLintOptions,
  GhostChecksLintReport,
} from "./types.js";

const SUPPORT_FLOOR = 0.85;
const GROUNDING_PREFIXES = [
  "principle",
  "situation",
  "experience_contract",
  "pattern",
] as const;
type GroundingPrefix = (typeof GROUNDING_PREFIXES)[number];

export function lintGhostChecks(
  input: unknown,
  options: GhostChecksLintOptions = {},
): GhostChecksLintReport {
  const issues: GhostChecksLintIssue[] = [];
  const result = GhostChecksSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        severity: "error",
        rule: `schema/${issue.code}`,
        message: issue.message,
        path: issue.path.length ? issue.path.join(".") : undefined,
      });
    }
    return finalize(issues);
  }

  const doc = result.data as GhostChecksDocument;
  checkDuplicateIds(doc.checks, issues);
  doc.checks.forEach((check, index) => {
    checkOne(check, index, options, issues);
  });

  return finalize(issues);
}

function checkDuplicateIds(
  checks: GhostCheck[],
  issues: GhostChecksLintIssue[],
): void {
  const seen = new Map<string, number>();
  checks.forEach((check, index) => {
    const previous = seen.get(check.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "duplicate-check-id",
        message: `check id '${check.id}' is duplicated (also at checks[${previous}])`,
        path: `checks[${index}].id`,
      });
    } else {
      seen.set(check.id, index);
    }
  });
}

function checkOne(
  check: GhostCheck,
  index: number,
  options: GhostChecksLintOptions,
  issues: GhostChecksLintIssue[],
): void {
  const path = `checks[${index}]`;
  checkDetector(check, path, issues);
  checkGrounding(check, path, options, issues);
  checkAppliesToTargets(check, path, options, issues);

  if (check.status === "disabled") return;

  if (!check.applies_to?.paths?.length && !check.applies_to?.scopes?.length) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-scope-missing",
      message:
        "Checks must declare applies_to.paths or applies_to.scopes so routing is deterministic.",
      path: `${path}.applies_to`,
    });
  }

  if (options.map && check.applies_to?.scopes?.length) {
    const scopeIds = new Set(
      getEffectiveMapScopes(options.map).map((scope) => scope.id),
    );
    check.applies_to.scopes.forEach((scope, scopeIndex) => {
      if (scopeIds.has(scope)) return;
      issues.push({
        severity: "error",
        rule: "check-scope-unknown",
        message: `Check references unknown map scope '${scope}'.`,
        path: `${path}.applies_to.scopes[${scopeIndex}]`,
      });
    });
  }

  if (!check.evidence) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-evidence-missing",
      message:
        "Checks must include evidence with support, observed_count, and examples before they can be trusted.",
      path: `${path}.evidence`,
    });
    return;
  }

  if (typeof check.evidence.support !== "number") {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-support-missing",
      message: "Check evidence must include support.",
      path: `${path}.evidence.support`,
    });
  } else if (check.evidence.support < SUPPORT_FLOOR) {
    issues.push({
      severity: "warning",
      rule: "check-support-low",
      message: `Check support ${check.evidence.support.toFixed(2)} is below ${SUPPORT_FLOOR}; promote only if the curator intentionally accepts noise.`,
      path: `${path}.evidence.support`,
    });
  }

  if (typeof check.evidence.observed_count !== "number") {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-observed-count-missing",
      message: "Check evidence must include observed_count.",
      path: `${path}.evidence.observed_count`,
    });
  }

  if (!check.evidence.examples?.length) {
    issues.push({
      severity: check.status === "active" ? "error" : "warning",
      rule: "check-examples-missing",
      message: "Check evidence must cite at least one precedent example.",
      path: `${path}.evidence.examples`,
    });
  }
}

function checkAppliesToTargets(
  check: GhostCheck,
  path: string,
  options: GhostChecksLintOptions,
  issues: GhostChecksLintIssue[],
): void {
  if (!check.applies_to || !options.fingerprint) return;

  const severity = check.status === "active" ? "error" : "warning";
  const targets = collectFingerprintRoutingTargets(options.fingerprint);

  check.applies_to.scopes?.forEach((scope, scopeIndex) => {
    if (targets.scopes.has(scope)) return;
    issues.push({
      severity,
      rule: "check-scope-unknown",
      message: `Check references unknown fingerprint scope '${scope}'.`,
      path: `${path}.applies_to.scopes[${scopeIndex}]`,
    });
  });

  check.applies_to.surface_types?.forEach((surfaceType, surfaceIndex) => {
    if (targets.surfaceTypes.has(surfaceType)) return;
    issues.push({
      severity,
      rule: "check-surface-type-unknown",
      message: `Check references unknown fingerprint surface type '${surfaceType}'.`,
      path: `${path}.applies_to.surface_types[${surfaceIndex}]`,
    });
  });

  check.applies_to.pattern_ids?.forEach((patternId, patternIndex) => {
    if (targets.patterns.has(patternId)) return;
    issues.push({
      severity,
      rule: "check-pattern-unknown",
      message: `Check references unknown fingerprint pattern '${patternId}'.`,
      path: `${path}.applies_to.pattern_ids[${patternIndex}]`,
    });
  });
}

function checkGrounding(
  check: GhostCheck,
  path: string,
  options: GhostChecksLintOptions,
  issues: GhostChecksLintIssue[],
): void {
  if (check.status === "active" && !check.derives_from) {
    issues.push({
      severity: "error",
      rule: "check-grounding-missing",
      message:
        "Active checks must declare derives_from with a typed fingerprint.yml reference.",
      path: `${path}.derives_from`,
    });
    return;
  }

  if (!check.derives_from || !options.fingerprint) return;

  const parsed = parseGroundingRef(check.derives_from);
  if (!parsed) return;

  const targets = collectFingerprintTargets(options.fingerprint);
  if (targets[parsed.prefix].has(parsed.id)) return;

  issues.push({
    severity: check.status === "active" ? "error" : "warning",
    rule: "check-grounding-unknown",
    message: `Check derives_from references unknown fingerprint memory '${check.derives_from}'.`,
    path: `${path}.derives_from`,
  });
}

function collectFingerprintRoutingTargets(
  fingerprint: NonNullable<GhostChecksLintOptions["fingerprint"]>,
): {
  scopes: Set<string>;
  surfaceTypes: Set<string>;
  patterns: Set<string>;
} {
  const surfaceTypes = new Set(fingerprint.topology.surface_types ?? []);
  for (const scope of fingerprint.topology.scopes ?? []) {
    for (const surfaceType of scope.surface_types ?? []) {
      surfaceTypes.add(surfaceType);
    }
  }
  return {
    scopes: new Set(
      fingerprint.topology.scopes?.map((entry) => entry.id) ?? [],
    ),
    surfaceTypes,
    patterns: new Set(fingerprint.patterns.map((entry) => entry.id)),
  };
}

function parseGroundingRef(
  ref: string,
): { prefix: GroundingPrefix; id: string } | undefined {
  const [prefix, id] = ref.split(":");
  if (!prefix || !id) return undefined;
  if (!GROUNDING_PREFIXES.includes(prefix as GroundingPrefix)) return undefined;
  return { prefix: prefix as GroundingPrefix, id };
}

function collectFingerprintTargets(
  fingerprint: NonNullable<GhostChecksLintOptions["fingerprint"]>,
): Record<GroundingPrefix, Set<string>> {
  return {
    principle: new Set(fingerprint.principles.map((entry) => entry.id)),
    situation: new Set(fingerprint.situations.map((entry) => entry.id)),
    experience_contract: new Set(
      fingerprint.experience_contracts.map((entry) => entry.id),
    ),
    pattern: new Set(fingerprint.patterns.map((entry) => entry.id)),
  };
}

function checkDetector(
  check: GhostCheck,
  path: string,
  issues: GhostChecksLintIssue[],
): void {
  const { detector } = check;
  if (
    detector.type === "forbidden-regex" ||
    detector.type === "required-regex"
  ) {
    if (!detector.pattern) {
      issues.push({
        severity: "error",
        rule: "check-detector-pattern-missing",
        message: `${detector.type} detectors must include pattern.`,
        path: `${path}.detector.pattern`,
      });
      return;
    }
    compileRegex(detector.pattern, `${path}.detector.pattern`, issues);
    return;
  }

  if (!detector.pattern && !detector.value) {
    issues.push({
      severity: "error",
      rule: "check-detector-value-missing",
      message: `${detector.type} detectors must include pattern or value.`,
      path: `${path}.detector`,
    });
    return;
  }
  if (detector.pattern) {
    compileRegex(detector.pattern, `${path}.detector.pattern`, issues);
  }
}

function compileRegex(
  pattern: string,
  path: string,
  issues: GhostChecksLintIssue[],
): void {
  try {
    new RegExp(pattern);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "check-detector-pattern-invalid",
      message: `Detector pattern is not a valid JavaScript regular expression: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path,
    });
  }
}

function finalize(issues: GhostChecksLintIssue[]): GhostChecksLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
