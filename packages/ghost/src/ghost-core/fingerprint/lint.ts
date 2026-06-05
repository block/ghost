import type { ZodIssue } from "zod";
import { GhostFingerprintSchema } from "./schema.js";
import type {
  GhostFingerprintDocument,
  GhostFingerprintLintIssue,
  GhostFingerprintLintReport,
  GhostFingerprintRef,
} from "./types.js";

type RefTargetPrefix =
  | "prose.principle"
  | "prose.situation"
  | "prose.experience_contract"
  | "inventory.exemplar"
  | "composition.pattern";

const REF_TARGET_PREFIXES = [
  "prose.principle",
  "prose.situation",
  "prose.experience_contract",
  "inventory.exemplar",
  "composition.pattern",
] as const satisfies readonly RefTargetPrefix[];

export function lintGhostFingerprint(
  input: unknown,
): GhostFingerprintLintReport {
  const issues: GhostFingerprintLintIssue[] = [];
  const result = GhostFingerprintSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostFingerprintDocument;
  checkDuplicateIds(
    "inventory.topology.scopes",
    doc.inventory.topology.scopes ?? [],
    issues,
  );
  checkDuplicateStrings(
    "inventory.topology.surface_types",
    doc.inventory.topology.surface_types ?? [],
    issues,
  );
  checkDuplicateIds("prose.situations", doc.prose.situations, issues);
  checkDuplicateIds("prose.principles", doc.prose.principles, issues);
  checkDuplicateIds(
    "prose.experience_contracts",
    doc.prose.experience_contracts,
    issues,
  );
  checkDuplicateIds("composition.patterns", doc.composition.patterns, issues);
  checkDuplicateIds("inventory.exemplars", doc.inventory.exemplars, issues);
  checkDuplicateIds("inventory.sources", doc.inventory.sources, issues);
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

  doc.inventory.topology.scopes?.forEach((scope, scopeIndex) => {
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
        message: `Surface type '${surfaceType}' is not declared in inventory.topology.surface_types.`,
        path: `inventory.topology.scopes[${scopeIndex}].surface_types[${surfaceIndex}]`,
      });
    });
  });

  doc.prose.situations.forEach((situation, situationIndex) => {
    checkSurfaceTypeRef(
      situation.surface_type,
      `prose.situations[${situationIndex}].surface_type`,
      topology,
      issues,
    );
  });

  doc.prose.principles.forEach((principle, index) => {
    checkScopeRefs(
      principle.applies_to,
      `prose.principles[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.prose.experience_contracts.forEach((contract, index) => {
    checkScopeRefs(
      contract.applies_to,
      `prose.experience_contracts[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.composition.patterns.forEach((pattern, index) => {
    checkScopeRefs(
      pattern.applies_to,
      `composition.patterns[${index}].applies_to`,
      topology,
      issues,
    );
  });
  doc.inventory.exemplars.forEach((exemplar, index) => {
    checkScopeIdRef(
      exemplar.scope,
      `inventory.exemplars[${index}].scope`,
      topology,
      issues,
    );
    checkSurfaceTypeRef(
      exemplar.surface_type,
      `inventory.exemplars[${index}].surface_type`,
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
  doc.prose.situations.forEach((situation, index) => {
    checkRefList(
      situation.principles,
      "prose.principle",
      `prose.situations[${index}].principles`,
      targets,
      issues,
    );
    checkRefList(
      situation.experience_contracts,
      "prose.experience_contract",
      `prose.situations[${index}].experience_contracts`,
      targets,
      issues,
    );
    checkRefList(
      situation.patterns,
      "composition.pattern",
      `prose.situations[${index}].patterns`,
      targets,
      issues,
    );
  });

  doc.prose.principles.forEach((principle, index) => {
    checkCheckRefs(
      principle.check_refs,
      `prose.principles[${index}].check_refs`,
      issues,
    );
  });
  doc.prose.experience_contracts.forEach((contract, index) => {
    checkCheckRefs(
      contract.check_refs,
      `prose.experience_contracts[${index}].check_refs`,
      issues,
    );
  });
  doc.composition.patterns.forEach((pattern, index) => {
    checkCheckRefs(
      pattern.check_refs,
      `composition.patterns[${index}].check_refs`,
      issues,
    );
  });
  doc.inventory.exemplars.forEach((exemplar, index) => {
    checkLayerRefs(
      exemplar.refs,
      `inventory.exemplars[${index}].refs`,
      targets,
      issues,
    );
  });
}

function collectTopology(doc: GhostFingerprintDocument): {
  scopes: Set<string>;
  explicitSurfaceTypes: Set<string>;
  surfaceTypes: Set<string>;
  situations: Set<string>;
} {
  const explicitSurfaceTypes = new Set(
    doc.inventory.topology.surface_types ?? [],
  );
  const surfaceTypes = new Set(explicitSurfaceTypes);
  for (const scope of doc.inventory.topology.scopes ?? []) {
    for (const surfaceType of scope.surface_types ?? []) {
      surfaceTypes.add(surfaceType);
    }
  }
  return {
    scopes: new Set(
      doc.inventory.topology.scopes?.map((entry) => entry.id) ?? [],
    ),
    explicitSurfaceTypes,
    surfaceTypes,
    situations: new Set(doc.prose.situations.map((entry) => entry.id)),
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
    message: `Surface type '${surfaceType}' is not declared in inventory.topology.surface_types.`,
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
    "prose.principle": new Set(doc.prose.principles.map((entry) => entry.id)),
    "prose.situation": new Set(doc.prose.situations.map((entry) => entry.id)),
    "prose.experience_contract": new Set(
      doc.prose.experience_contracts.map((entry) => entry.id),
    ),
    "inventory.exemplar": new Set(
      doc.inventory.exemplars.map((entry) => entry.id),
    ),
    "composition.pattern": new Set(
      doc.composition.patterns.map((entry) => entry.id),
    ),
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
        message: `Reference '${ref}' does not exist in the fingerprint package.`,
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

function checkLayerRefs(
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
          "Expected prose.*, inventory.exemplar:*, or composition.pattern:* reference.",
        path: `${path}[${index}]`,
      });
      return;
    }
    if (!targets[parsed.prefix].has(parsed.id)) {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-unknown",
        message: `Reference '${ref}' does not exist in the fingerprint package.`,
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
