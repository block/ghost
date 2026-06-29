import type { ZodIssue } from "zod";
import { GhostFingerprintSchema } from "./schema.js";
import type {
  GhostFingerprintDocument,
  GhostFingerprintLintIssue,
  GhostFingerprintLintReport,
  GhostFingerprintRef,
} from "./types.js";

type RefTargetPrefix =
  | "intent.principle"
  | "intent.situation"
  | "intent.experience_contract"
  | "inventory.exemplar"
  | "composition.pattern";

const REF_TARGET_PREFIXES = [
  "intent.principle",
  "intent.situation",
  "intent.experience_contract",
  "inventory.exemplar",
  "composition.pattern",
] as const satisfies readonly RefTargetPrefix[];

export interface GhostFingerprintLintOptions {
  /**
   * Surface ids declared in the sibling `surfaces.yml`. When provided, node
   * `surface:` placements are validated against this set. When omitted (single-
   * file lint with no package context), placement existence is not checked —
   * matching how validate lint skips routing checks without a fingerprint.
   */
  surfaceIds?: Iterable<string>;
}

export function lintGhostFingerprint(
  input: unknown,
  options: GhostFingerprintLintOptions = {},
): GhostFingerprintLintReport {
  const issues: GhostFingerprintLintIssue[] = [];
  const result = GhostFingerprintSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostFingerprintDocument;
  checkDuplicateIds("intent.situations", doc.intent.situations, issues);
  checkDuplicateIds("intent.principles", doc.intent.principles, issues);
  checkDuplicateIds(
    "intent.experience_contracts",
    doc.intent.experience_contracts,
    issues,
  );
  checkDuplicateIds("composition.patterns", doc.composition.patterns, issues);
  checkDuplicateIds("inventory.exemplars", doc.inventory.exemplars, issues);
  checkDuplicateIds("inventory.sources", doc.inventory.sources, issues);
  checkPlacement(doc, options.surfaceIds, issues);
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

function checkPlacement(
  doc: GhostFingerprintDocument,
  surfaceIds: Iterable<string> | undefined,
  issues: GhostFingerprintLintIssue[],
): void {
  // `core` is always a valid placement (the implicit root) even when not
  // explicitly declared in surfaces.yml.
  const known = surfaceIds ? new Set(surfaceIds) : null;
  if (known) known.add("core");
  const candidates = known ? [...known] : [];

  const visit = (
    surface: string | undefined,
    path: string,
    nodeLabel: string,
  ) => {
    if (surface === undefined) {
      issues.push({
        severity: "warning",
        rule: "fingerprint-node-unplaced",
        message: `${nodeLabel} has no surface placement; place it on a surface so it does not implicitly reach everywhere.`,
        path,
      });
      return;
    }
    if (!known || known.has(surface)) return;
    issues.push({
      severity: "error",
      rule: "fingerprint-surface-unknown",
      message: `surface '${surface}' is not declared in surfaces.yml.`,
      path,
    });
    const near = nearest(surface, candidates);
    if (near) {
      issues.push({
        severity: "warning",
        rule: "fingerprint-surface-near-miss",
        message: `surface '${surface}' is unknown; did you mean '${near}'?`,
        path,
      });
    }
  };

  doc.intent.situations.forEach((node, index) => {
    visit(node.surface, `intent.situations[${index}].surface`, "situation");
  });
  doc.intent.principles.forEach((node, index) => {
    visit(node.surface, `intent.principles[${index}].surface`, "principle");
  });
  doc.intent.experience_contracts.forEach((node, index) => {
    visit(
      node.surface,
      `intent.experience_contracts[${index}].surface`,
      "experience contract",
    );
  });
  doc.composition.patterns.forEach((node, index) => {
    visit(node.surface, `composition.patterns[${index}].surface`, "pattern");
  });
  doc.inventory.exemplars.forEach((node, index) => {
    visit(node.surface, `inventory.exemplars[${index}].surface`, "exemplar");
  });
}

/** Nearest candidate within edit distance 2, or null. */
function nearest(value: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDistance = 3;
  for (const candidate of candidates) {
    const distance = levenshtein(value, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= 2 ? best : null;
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist: number[][] = Array.from({ length: rows }, () =>
    new Array<number>(cols).fill(0),
  );
  for (let i = 0; i < rows; i++) dist[i][0] = i;
  for (let j = 0; j < cols; j++) dist[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1,
        dist[i][j - 1] + 1,
        dist[i - 1][j - 1] + cost,
      );
    }
  }
  return dist[a.length][b.length];
}

function checkRefs(
  doc: GhostFingerprintDocument,
  issues: GhostFingerprintLintIssue[],
): void {
  const targets = collectTargets(doc);
  doc.intent.situations.forEach((situation, index) => {
    checkRefList(
      situation.principles,
      "intent.principle",
      `intent.situations[${index}].principles`,
      targets,
      issues,
    );
    checkRefList(
      situation.experience_contracts,
      "intent.experience_contract",
      `intent.situations[${index}].experience_contracts`,
      targets,
      issues,
    );
    checkRefList(
      situation.patterns,
      "composition.pattern",
      `intent.situations[${index}].patterns`,
      targets,
      issues,
    );
  });

  doc.intent.principles.forEach((principle, index) => {
    checkCheckRefs(
      principle.check_refs,
      `intent.principles[${index}].check_refs`,
      issues,
    );
  });
  doc.intent.experience_contracts.forEach((contract, index) => {
    checkCheckRefs(
      contract.check_refs,
      `intent.experience_contracts[${index}].check_refs`,
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

function collectTargets(
  doc: GhostFingerprintDocument,
): Record<RefTargetPrefix, Set<string>> {
  return {
    "intent.principle": new Set(doc.intent.principles.map((entry) => entry.id)),
    "intent.situation": new Set(doc.intent.situations.map((entry) => entry.id)),
    "intent.experience_contract": new Set(
      doc.intent.experience_contracts.map((entry) => entry.id),
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
    if (parsed?.prefix === "validate.check") return;
    issues.push({
      severity: "error",
      rule: "fingerprint-check-ref-prefix",
      message: "check_refs entries must use validate.check:* references.",
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
    if (!parsed || parsed.prefix === "validate.check") {
      issues.push({
        severity: "error",
        rule: "fingerprint-ref-prefix",
        message:
          "Expected intent.*, inventory.exemplar:*, or composition.pattern:* reference.",
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

function parseRef(ref: GhostFingerprintRef):
  | {
      prefix: (typeof REF_TARGET_PREFIXES)[number] | "validate.check";
      id: string;
    }
  | undefined {
  const [prefix, id] = ref.split(":");
  if (!prefix || !id) return undefined;
  if (prefix === "validate.check") return { prefix, id };
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
