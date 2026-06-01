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
  | "pattern"
  | "substrate";

const REF_TARGET_PREFIXES = [
  "principle",
  "situation",
  "experience_contract",
  "pattern",
  "substrate",
] as const satisfies readonly RefTargetPrefix[];

export function lintGhostFingerprint(
  input: unknown,
): GhostFingerprintLintReport {
  const issues: GhostFingerprintLintIssue[] = [];
  const result = GhostFingerprintSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostFingerprintDocument;
  checkDuplicateIds("topology.scopes", doc.topology.scopes ?? [], issues);
  checkDuplicateIds("situations", doc.situations, issues);
  checkDuplicateIds("principles", doc.principles, issues);
  checkDuplicateIds("experience_contracts", doc.experience_contracts, issues);
  checkDuplicateIds("patterns", doc.patterns, issues);
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
    substrate: new Set(Object.keys(doc.substrate)),
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
