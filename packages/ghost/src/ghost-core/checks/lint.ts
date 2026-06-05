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
  "prose.principle",
  "prose.situation",
  "prose.experience_contract",
  "inventory.exemplar",
  "composition.pattern",
] as const;
type GroundingPrefix = (typeof GROUNDING_PREFIXES)[number];
type DerivationGroup = "prose" | "inventory" | "composition";

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
  const derivation = check.derivation;
  const proseRefs = derivation?.prose ?? [];
  const compositionRefs = derivation?.composition ?? [];
  const inventoryRefs = derivation?.inventory ?? [];
  const hasAuthoritativeGrounding =
    proseRefs.length > 0 || compositionRefs.length > 0;
  const hasAnyDerivation =
    hasAuthoritativeGrounding || inventoryRefs.length > 0;

  if (check.status === "disabled") return;

  if (!hasAnyDerivation) {
    issues.push({
      severity: "warning",
      rule: "check-grounding-missing",
      message:
        "Checks should declare derivation refs when they enforce product-experience memory.",
      path: `${path}.derivation`,
    });
    return;
  }

  if (!hasAuthoritativeGrounding) {
    issues.push({
      severity: "warning",
      rule: "check-grounding-inventory-only",
      message:
        "Inventory refs can support a check, but prose or composition refs are preferred for product-experience enforcement.",
      path: `${path}.derivation`,
    });
  }

  if (!options.fingerprint) {
    issues.push({
      severity: "info",
      rule: "check-grounding-unverified",
      message:
        "Check derivation refs were not verified because no fingerprint package context was provided; run ghost lint on the bundle.",
      path: `${path}.derivation`,
    });
    return;
  }

  const targets = collectFingerprintTargets(options.fingerprint);
  checkDerivationRefs(proseRefs, "prose", path, targets, issues);
  checkDerivationRefs(compositionRefs, "composition", path, targets, issues);
  checkDerivationRefs(inventoryRefs, "inventory", path, targets, issues);
}

function checkDerivationRefs(
  refs: string[],
  group: DerivationGroup,
  path: string,
  targets: Record<GroundingPrefix, Set<string>>,
  issues: GhostChecksLintIssue[],
): void {
  refs.forEach((ref, index) => {
    const parsed = parseGroundingRef(ref);
    if (!parsed) return;
    if (targets[parsed.prefix].has(parsed.id)) return;
    issues.push({
      severity: "warning",
      rule: "check-grounding-unknown",
      message: `Check derivation references unknown fingerprint ref '${ref}'.`,
      path: `${path}.derivation.${group}[${index}]`,
    });
  });
}

function collectFingerprintRoutingTargets(
  fingerprint: NonNullable<GhostChecksLintOptions["fingerprint"]>,
): {
  scopes: Set<string>;
  surfaceTypes: Set<string>;
  patterns: Set<string>;
} {
  const surfaceTypes = new Set(
    fingerprint.inventory.topology.surface_types ?? [],
  );
  for (const scope of fingerprint.inventory.topology.scopes ?? []) {
    for (const surfaceType of scope.surface_types ?? []) {
      surfaceTypes.add(surfaceType);
    }
  }
  return {
    scopes: new Set(
      fingerprint.inventory.topology.scopes?.map((entry) => entry.id) ?? [],
    ),
    surfaceTypes,
    patterns: new Set(
      fingerprint.composition.patterns.map((entry) => entry.id),
    ),
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
    "prose.principle": new Set(
      fingerprint.prose.principles.map((entry) => entry.id),
    ),
    "prose.situation": new Set(
      fingerprint.prose.situations.map((entry) => entry.id),
    ),
    "prose.experience_contract": new Set(
      fingerprint.prose.experience_contracts.map((entry) => entry.id),
    ),
    "inventory.exemplar": new Set(
      fingerprint.inventory.exemplars.map((entry) => entry.id),
    ),
    "composition.pattern": new Set(
      fingerprint.composition.patterns.map((entry) => entry.id),
    ),
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
