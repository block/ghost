import type { ZodIssue } from "zod";
import { classifyContractReference } from "./contract-ref.js";
import { GhostBindingSchema } from "./schema.js";
import type {
  GhostBindingDocument,
  GhostBindingLintIssue,
  GhostBindingLintReport,
} from "./types.js";

/**
 * Lint a `ghost.binding/v1` document. Schema-level validity (shape, slug ids,
 * non-empty paths) is enforced by Zod; this adds document-level checks the
 * schema cannot express: the contract reference is `.` (in-repo) or an npm
 * package name, and a surface should not be bound twice in one file.
 *
 * Cross-referencing surface ids against the contract's surfaces happens at
 * resolution/verify, not here — the binding file cannot see the contract.
 */
export function lintGhostBinding(input: unknown): GhostBindingLintReport {
  const result = GhostBindingSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));

  const doc = result.data as GhostBindingDocument;
  const issues: GhostBindingLintIssue[] = [];

  if (classifyContractReference(doc.contract) === "unsupported") {
    issues.push({
      severity: "error",
      rule: "binding-contract-unsupported",
      message: `contract '${doc.contract}' is not supported; use '.' (in-repo) or an npm package name.`,
      path: "contract",
    });
  }

  const seen = new Map<string, number>();
  doc.bindings.forEach((entry, index) => {
    const previous = seen.get(entry.surface);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "binding-duplicate-surface",
        message: `surface '${entry.surface}' is bound more than once (also at bindings[${previous}])`,
        path: `bindings[${index}].surface`,
      });
    } else {
      seen.set(entry.surface, index);
    }
  });

  return finalize(issues);
}

function zodIssues(issues: ZodIssue[]): GhostBindingLintIssue[] {
  return issues.map((issue) => ({
    severity: "error" as const,
    rule: `schema/${issue.code}`,
    message: issue.message,
    path: formatZodPath(issue.path) ?? "<root>",
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

function finalize(issues: GhostBindingLintIssue[]): GhostBindingLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
