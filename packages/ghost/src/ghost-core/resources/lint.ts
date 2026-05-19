import type { ZodIssue } from "zod";
import { GhostResourcesSchema } from "./schema.js";
import type {
  GhostResourcesDocument,
  GhostResourcesLintIssue,
  GhostResourcesLintReport,
} from "./types.js";

export function lintGhostResources(input: unknown): GhostResourcesLintReport {
  const issues: GhostResourcesLintIssue[] = [];
  const result = GhostResourcesSchema.safeParse(input);
  if (!result.success) {
    issues.push(...zodIssues(result.error.issues));
    return finalize(issues);
  }

  const doc = result.data as GhostResourcesDocument;
  checkDuplicateIds(doc, issues);
  if (!doc.include?.length) {
    issues.push({
      severity: "info",
      rule: "resources-include-empty",
      message:
        "resources.yml has no include globs; scanners will fall back to map.md surface sources.",
      path: "include",
    });
  }

  return finalize(issues);
}

function checkDuplicateIds(
  doc: GhostResourcesDocument,
  issues: GhostResourcesLintIssue[],
): void {
  const seen = new Map<string, string>();
  const groups = [
    ["design_system", doc.design_system],
    ["surfaces", doc.surfaces],
    ["screenshots", doc.screenshots],
    ["docs", doc.docs],
    ["resolvers", doc.resolvers],
    ["upstreams", doc.upstreams],
  ] as const;

  if (doc.primary.id) seen.set(doc.primary.id, "primary.id");
  for (const [group, refs] of groups) {
    refs?.forEach((ref, index) => {
      if (!ref.id) return;
      const previous = seen.get(ref.id);
      if (previous) {
        issues.push({
          severity: "error",
          rule: "resource-id-duplicate",
          message: `resource id '${ref.id}' is duplicated (also at ${previous})`,
          path: `${group}[${index}].id`,
        });
      } else {
        seen.set(ref.id, `${group}[${index}].id`);
      }
    });
  }
}

function zodIssues(issues: ZodIssue[]): GhostResourcesLintIssue[] {
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

function finalize(issues: GhostResourcesLintIssue[]): GhostResourcesLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
