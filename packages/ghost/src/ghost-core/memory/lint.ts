import type { ZodIssue } from "zod";
import { GhostDecisionSchema } from "./schema.js";
import type { GhostMemoryLintIssue, GhostMemoryLintReport } from "./types.js";

export function lintGhostDecision(input: unknown): GhostMemoryLintReport {
  const result = GhostDecisionSchema.safeParse(input);
  if (!result.success) return finalize(zodIssues(result.error.issues));
  return finalize([]);
}

function zodIssues(issues: ZodIssue[]): GhostMemoryLintIssue[] {
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

function finalize(issues: GhostMemoryLintIssue[]): GhostMemoryLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
