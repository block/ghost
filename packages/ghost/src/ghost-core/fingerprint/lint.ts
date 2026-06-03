import type { ZodIssue } from "zod";
import { GhostFingerprintSchema } from "./schema.js";
import type {
  GhostFingerprintDocument,
  GhostFingerprintLintIssue,
  GhostFingerprintLintReport,
  GhostFingerprintRef,
} from "./types.js";

type RefTargetPrefix =
  | "principle"
  | "situation"
  | "experience_contract"
  | "pattern";

const REF_TARGET_PREFIXES = [
  "principle",
  "situation",
  "experience_contract",
  "pattern",
] as const satisfies readonly RefTargetPrefix[];

export function lintGhostFingerprint(
  input: unknown,
): GhostFingerprintLintReport {
  const issues: GhostFingerprintLintIssue[] = [];
  const result = GhostFingerprintSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostFingerprintDocument;
  checkDuplicateIds("topology.scopes", doc.topology.scopes ?? [], issues);
  checkDuplicateStrings(
    "topology.surface_types",
    doc.topology.surface_types ?? [],
    issues,
  );
  checkDuplicateIds("situations", doc.situations, issues);
  checkDuplicateIds("principles", doc.principles, issues);
  checkDuplicateIds("experience_contracts", doc.experience_contracts, issues);
  checkDuplicateIds("patterns", doc.patterns, issues);
  checkDuplicateIds("exemplars", doc.exemplars, issues);
  checkTopologyRefs(doc, issues);
  checkRefs(doc, issues);

  return finalize(issues);
}

function checkDuplicateIds(
  collectionPath: string,
  entries: Array<{ id: string }>,
  issues: GhostFingerprintLintIssue[],
): void {
  const seen = new Map<string, number>();
  entries.forEach((entry, index) => {
    const previous = seen.get(entry.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "duplicate-id",
        message: `id '${entry.id}' is duplicated (also at ${collectionPath}[${previous}])`,
        path: `${collectionPath}[${index}].id`,
      });
    } else {
      seen.set(entry.id, index);
    }
  });
}

function checkDuplicateStrings(
  collectionPath: string,
  entries: string[],
  issues: GhostFingerprintLintIssue[],
): void {
  const seen = new Map<string, number>();
  entries.forEach((entry, index) => {
    const previous = seen.get(entry);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "duplicate-id",
        message: `'${entry}' is duplicated (also at ${collectionPath}[${previous}])`,
        path: `${collectionPath}[${index}]`,
      });
    } else {
      seen.set(entry, index);
    }
  });
}

function checkTopologyRefs(
  doc: GhostFingerprintDocument,
  issues: GhostFingerprintLintIssue[],
): void {
  const topology = collectTopology(doc);

  doc.topology.scopes?.forEach((scope, scopeIndex) => {
    scope.surface_types?.forEach((surfaceType, surfaceIndex) => {
      if (
        topology.explicitSurfaceTypes.size === 0 ||
        topology.explicitSurfaceTypes.has(surfaceType)
      ) {
        return;
      }
      issues.push({
        severity: "error",
        rule: "fingerprint-surface-type-unknown",
        message: `Surface type '${surfaceType}' is not declared in topology.surface_types.`,
        path: `topology.scopes[${scopeIndex}].surface_types[${surfaceIndex}]`,
      });
    });
  });

  doc.situations.forEach((situation, situationIndex) => {
    checkSurfaceTypeRef(
      situation.surface_type,
      `situations[${situationIndex}].surface_type`,
      topology,
      issues,
    );
  });

  doc.principles.forEach((principle, index) => {
    checkScopeRefs(
      principle.applies_to,
      `principles[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.experience_contracts.forEach((contract, index) => {
    checkScopeRefs(
      contract.applies_to,
      `experience_contracts[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.patterns.forEach((pattern, index) => {
    checkScopeRefs(
      pattern.applies_to,
      `patterns[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.exemplars.forEach((exemplar, index) => {
    checkScopeIdRef(
      exemplar.scope,
      `exemplars[${index}].scope`,
      topology,
      issues,
    );
    checkSurfaceTypeRef(
      exemplar.surface_type,
      `exemplars[${index}].surface_type`,
      topology,
      issues,
    );
  });
}

function checkRefs(
  doc: GhostFingerprintDocument,
  issues: GhostFingerprintLintIssue[],
): void {
  const targets = collectTargets(doc);
  doc.situations.forEach((situation, index) => {
    checkRefList(
      situation.principles,
      "principle",
      `situations[${index}].principles`,
      targets,
      issues,
    );
    checkRefList(
      situation.experience_contracts,
      "experience_contract",
      `situations[${index}].experience_contracts`,
      targets,
      issues,
    );
    checkRefList(
      situation.patterns,
      "pattern",
      `situations[${index}].patterns`,
      targets,
      issues,
    );
  });

  doc.principles.forEach((principle, index) => {
    checkCheckRefs(
      principle.check_refs,
      `principles[${index}].check_refs`,
      issues,
    );
  });
  doc.experience_contracts.forEach((contract, index) => {
    checkCheckRefs(
      contract.check_refs,
      `experience_contracts[${index}].check_refs`,
      issues,
    );
  });
  doc.patterns.forEach((pattern, index) => {
    checkCheckRefs(pattern.check_refs, `patterns[${index}].check_refs`, issues);
  });
  doc.exemplars.forEach((exemplar, index) => {
    checkMemoryRefs(exemplar.refs, `exemplars[${index}].refs`, targets, issues);
  });
}

function collectTopology(doc: GhostFingerprintDocument): {
  scopes: Set<string>;
  explicitSurfaceTypes: Set<string>;
  surfaceTypes: Set<string>;
  situations: Set<string>;
} {
  const explicitSurfaceTypes = new Set(doc.topology.surface_types ?? []);
  const surfaceTypes = new Set(explicitSurfaceTypes);
  for (const scope of doc.topology.scopes ?? []) {
    for (const surfaceType of scope.surface_types ?? []) {
      surfaceTypes.add(surfaceType);
    }
  }
  return {
    scopes: new Set(doc.topology.scopes?.map((entry) => entry.id) ?? []),
    explicitSurfaceTypes,
    surfaceTypes,
    situations: new Set(doc.situations.map((entry) => entry.id)),
  };
}

function checkSurfaceTypeRef(
  surfaceType: string | undefined,
  path: string,
  topology: ReturnType<typeof collectTopology>,
  issues: GhostFingerprintLintIssue[],
): void {
  if (!surfaceType) return;
  if (topology.surfaceTypes.has(surfaceType)) return;
  issues.push({
    severity: "error",
    rule: "fingerprint-surface-type-unknown",
    message: `Surface type '${surfaceType}' is not declared in topology.surface_types.`,
    path,
  });
}

function checkScopeRefs(
  scope:
    | {
        scopes?: string[];
        surface_types?: string[];
        situations?: string[];
      }
    | undefined,
  path: string,
  topology: ReturnType<typeof collectTopology>,
  issues: GhostFingerprintLintIssue[],
): void {
  scope?.scopes?.forEach((scopeId, index) => {
    if (topology.scopes.has(scopeId)) return;
    issues.push({
      severity: "error",
      rule: "fingerprint-scope-unknown",
      message: `Scope '${scopeId}' is not declared in topology.scopes.`,
      path: `${path}.scopes[${index}]`,
    });
  });
  scope?.surface_types?.forEach((surfaceType, index) => {
    if (topology.surfaceTypes.has(surfaceType)) return;
    issues.push({
      severity: "error",
      rule: "fingerprint-surface-type-unknown",
      message: `Surface type '${surfaceType}' is not declared in topology.surface_types.`,
      path: `${path}.surface_types[${index}]`,
    });
  });
  scope?.situations?.forEach((situation, index) => {
    if (topology.situations.has(situation)) return;
    issues.push({
      severity: "error",
      rule: "fingerprint-situation-unknown",
      message: `Situation '${situation}' is not declared in situations.`,
      path: `${path}.situations[${index}]`,
    });
  });
}

function checkScopeIdRef(
  scope: string | undefined,
  path: string,
  topology: ReturnType<typeof collectTopology>,
  issues: GhostFingerprintLintIssue[],
): void {
  if (!scope) return;
  if (topology.scopes.has(scope)) return;
  issues.push({
    severity: "error",
    rule: "fingerprint-scope-unknown",
    message: `Scope '${scope}' is not declared in topology.scopes.`,
    path,
  });
}

function collectTargets(
  doc: GhostFingerprintDocument,
): Record<RefTargetPrefix, Set<string>> {
  return {
    principle: new Set(doc.principles.map((entry) => entry.id)),
    situation: new Set(doc.situations.map((entry) => entry.id)),
    experience_contract: new Set(
      doc.experience_contracts.map((entry) => entry.id),
    ),
    pattern: new Set(doc.patterns.map((entry) => entry.id)),
  };
}

function checkRefList(
  refs: GhostFingerprintRef[] | undefined,
  expectedPrefix: RefTargetPrefix,
  path: string,
  targets: Record<RefTargetPrefix, Set<string>>,
  issues: GhostFingerprintLintIssue[],
): void {
  refs?.forEach((ref, index) => {
    const parsed = parseRef(ref);
    if (!parsed || parsed.prefix !== expectedPrefix) {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-prefix",
        message: `Expected ${expectedPrefix}:* reference.`,
        path: `${path}[${index}]`,
      });
      return;
    }
    if (!targets[expectedPrefix].has(parsed.id)) {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-unknown",
        message: `Reference '${ref}' does not exist in fingerprint.yml.`,
        path: `${path}[${index}]`,
      });
    }
  });
}

function checkCheckRefs(
  refs: GhostFingerprintRef[] | undefined,
  path: string,
  issues: GhostFingerprintLintIssue[],
): void {
  refs?.forEach((ref, index) => {
    const parsed = parseRef(ref);
    if (parsed?.prefix === "check") return;
    issues.push({
      severity: "error",
      rule: "fingerprint-check-ref-prefix",
      message: "check_refs entries must use check:* references.",
      path: `${path}[${index}]`,
    });
  });
}

function checkMemoryRefs(
  refs: GhostFingerprintRef[] | undefined,
  path: string,
  targets: Record<RefTargetPrefix, Set<string>>,
  issues: GhostFingerprintLintIssue[],
): void {
  refs?.forEach((ref, index) => {
    const parsed = parseRef(ref);
    if (!parsed || parsed.prefix === "check") {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-prefix",
        message:
          "Expected principle:*, situation:*, experience_contract:*, or pattern:* reference.",
        path: `${path}[${index}]`,
      });
      return;
    }
    if (!targets[parsed.prefix].has(parsed.id)) {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-unknown",
        message: `Reference '${ref}' does not exist in fingerprint.yml.`,
        path: `${path}[${index}]`,
      });
    }
  });
}

function parseRef(
  ref: GhostFingerprintRef,
):
  | { prefix: (typeof REF_TARGET_PREFIXES)[number] | "check"; id: string }
  | undefined {
  const [prefix, id] = ref.split(":");
  if (!prefix || !id) return undefined;
  if (prefix === "check") return { prefix, id };
  if (REF_TARGET_PREFIXES.includes(prefix as RefTargetPrefix)) {
    return { prefix: prefix as RefTargetPrefix, id };
  }
  return undefined;
}

function zodIssues(issues: ZodIssue[]): GhostFingerprintLintIssue[] {
  return issues.map((issue) => ({
    severity: "error" as const,
    rule: `schema/${issue.code}`,
    message: issue.message,
    path: formatZodPath(issue.path),
  }));
}

function formatZodPath(path: ZodIssue["path"]): string | undefined {
  if (path.length === 0) return undefined;
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") return `${formatted}[${segment}]`;
    const key = String(segment);
    return formatted ? `${formatted}.${key}` : key;
  }, "");
}

function finalize(
  issues: GhostFingerprintLintIssue[],
): GhostFingerprintLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
