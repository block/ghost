import { getEffectiveMapScopes } from "../map/index.js";
import { GhostValidateSchema } from "./schema.js";
import type {
  GhostCheck,
  GhostValidateDocument,
  GhostValidateLintIssue,
  GhostValidateLintOptions,
  GhostValidateLintReport,
} from "./types.js";

const SUPPORT_FLOOR = 0.85;
const GROUNDING_PREFIXES = [
  "intent.principle",
  "intent.situation",
  "intent.experience_contract",
  "inventory.exemplar",
  "composition.pattern",
] as const;
type GroundingPrefix = (typeof GROUNDING_PREFIXES)[number];
type DerivationGroup = "intent" | "inventory" | "composition";

export function lintGhostValidate(
  input: unknown,
  options: GhostValidateLintOptions = {},
): GhostValidateLintReport {
  const issues: GhostValidateLintIssue[] = [];
  const result = GhostValidateSchema.safeParse(input);
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

  const doc = result.data as GhostValidateDocument;
  checkDuplicateIds(doc.checks, issues);
  doc.checks.forEach((check, index) => {
    checkOne(check, index, options, issues);
  });

  return finalize(issues);
}

function checkDuplicateIds(
  checks: GhostCheck[],
  issues: GhostValidateLintIssue[],
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
  options: GhostValidateLintOptions,
  issues: GhostValidateLintIssue[],
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
  options: GhostValidateLintOptions,
  issues: GhostValidateLintIssue[],
): void {
  if (!check.applies_to || !options.fingerprint) return;

  const severity = check.status === "active" ? "error" : "warning";
  const targets = collectFingerprintRoutingTargets(options.fingerprint);

  // Phase 3: scope/surface_type routing targets came from the removed topology.
  // Check routing against surfaces is rebuilt in Phase 4/7; until then only
  // pattern_id targets are validated.

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
  options: GhostValidateLintOptions,
  issues: GhostValidateLintIssue[],
): void {
  const derivation = check.derivation;
  const intentRefs = derivation?.intent ?? [];
  const compositionRefs = derivation?.composition ?? [];
  const inventoryRefs = derivation?.inventory ?? [];
  const hasAuthoritativeGrounding =
    intentRefs.length > 0 || compositionRefs.length > 0;
  const hasAnyDerivation =
    hasAuthoritativeGrounding || inventoryRefs.length > 0;

  if (check.status === "disabled") return;

  if (!hasAnyDerivation) {
    issues.push({
      severity: "warning",
      rule: "check-grounding-missing",
      message:
        "Checks should declare derivation refs when they enforce surface-composition rules.",
      path: `${path}.derivation`,
    });
    return;
  }

  if (!hasAuthoritativeGrounding) {
    issues.push({
      severity: "warning",
      rule: "check-grounding-inventory-only",
      message:
        "Inventory refs can support a check, but intent or composition refs are preferred for surface-composition enforcement.",
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
  checkDerivationRefs(intentRefs, "intent", path, targets, issues);
  checkDerivationRefs(compositionRefs, "composition", path, targets, issues);
  checkDerivationRefs(inventoryRefs, "inventory", path, targets, issues);
}

function checkDerivationRefs(
  refs: string[],
  group: DerivationGroup,
  path: string,
  targets: Record<GroundingPrefix, Set<string>>,
  issues: GhostValidateLintIssue[],
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
  fingerprint: NonNullable<GhostValidateLintOptions["fingerprint"]>,
): {
  patterns: Set<string>;
} {
  return {
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
  fingerprint: NonNullable<GhostValidateLintOptions["fingerprint"]>,
): Record<GroundingPrefix, Set<string>> {
  return {
    "intent.principle": new Set(
      fingerprint.intent.principles.map((entry) => entry.id),
    ),
    "intent.situation": new Set(
      fingerprint.intent.situations.map((entry) => entry.id),
    ),
    "intent.experience_contract": new Set(
      fingerprint.intent.experience_contracts.map((entry) => entry.id),
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
  issues: GhostValidateLintIssue[],
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
  issues: GhostValidateLintIssue[],
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

function finalize(issues: GhostValidateLintIssue[]): GhostValidateLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
