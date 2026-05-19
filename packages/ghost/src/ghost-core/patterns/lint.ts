import type { ZodIssue } from "zod";
import { GhostPatternsSchema } from "./schema.js";
import type {
  GhostPatternsDocument,
  GhostPatternsLintIssue,
  GhostPatternsLintReport,
} from "./types.js";

export function lintGhostPatterns(input: unknown): GhostPatternsLintReport {
  const issues: GhostPatternsLintIssue[] = [];
  const result = GhostPatternsSchema.safeParse(input);
  if (!result.success) {
    issues.push(...zodIssues(result.error.issues));
    return finalize(issues);
  }

  const doc = result.data as GhostPatternsDocument;
  checkDuplicateIds(doc, issues);
  checkReferences(doc, issues);
  doc.composition_patterns.forEach((pattern, index) => {
    if (!pattern.evidence?.length) {
      issues.push({
        severity: "warning",
        rule: "pattern-evidence-missing",
        message:
          "composition patterns should cite survey-backed evidence before they guide review.",
        path: `composition_patterns[${index}].evidence`,
      });
    }
  });

  return finalize(issues);
}

function checkDuplicateIds(
  doc: GhostPatternsDocument,
  issues: GhostPatternsLintIssue[],
): void {
  const seenSurfaceTypes = new Map<string, number>();
  doc.surface_types.forEach((surfaceType, index) => {
    const previous = seenSurfaceTypes.get(surfaceType.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "surface-type-id-duplicate",
        message: `surface type id '${surfaceType.id}' is duplicated (also at surface_types[${previous}])`,
        path: `surface_types[${index}].id`,
      });
    } else {
      seenSurfaceTypes.set(surfaceType.id, index);
    }
  });

  const seenPatterns = new Map<string, number>();
  doc.composition_patterns.forEach((pattern, index) => {
    const previous = seenPatterns.get(pattern.id);
    if (previous !== undefined) {
      issues.push({
        severity: "error",
        rule: "composition-pattern-id-duplicate",
        message: `composition pattern id '${pattern.id}' is duplicated (also at composition_patterns[${previous}])`,
        path: `composition_patterns[${index}].id`,
      });
    } else {
      seenPatterns.set(pattern.id, index);
    }
  });
}

function checkReferences(
  doc: GhostPatternsDocument,
  issues: GhostPatternsLintIssue[],
): void {
  const surfaceTypeIds = new Set(
    doc.surface_types.map((surfaceType) => surfaceType.id),
  );
  const patternIds = new Set(
    doc.composition_patterns.map((pattern) => pattern.id),
  );

  doc.surface_types.forEach((surfaceType, index) => {
    surfaceType.preferred_patterns?.forEach((patternId, patternIndex) => {
      if (patternIds.has(patternId)) return;
      issues.push({
        severity: "error",
        rule: "surface-type-pattern-unknown",
        message: `surface type '${surfaceType.id}' references unknown preferred pattern '${patternId}'.`,
        path: `surface_types[${index}].preferred_patterns[${patternIndex}]`,
      });
    });
    surfaceType.discouraged_patterns?.forEach((patternId, patternIndex) => {
      if (patternIds.has(patternId)) return;
      issues.push({
        severity: "error",
        rule: "surface-type-pattern-unknown",
        message: `surface type '${surfaceType.id}' references unknown discouraged pattern '${patternId}'.`,
        path: `surface_types[${index}].discouraged_patterns[${patternIndex}]`,
      });
    });
  });

  doc.composition_patterns.forEach((pattern, index) => {
    pattern.surface_types?.forEach((surfaceTypeId, surfaceTypeIndex) => {
      if (surfaceTypeIds.has(surfaceTypeId)) return;
      issues.push({
        severity: "error",
        rule: "composition-pattern-surface-type-unknown",
        message: `composition pattern '${pattern.id}' references unknown surface type '${surfaceTypeId}'.`,
        path: `composition_patterns[${index}].surface_types[${surfaceTypeIndex}]`,
      });
    });
  });
}

function zodIssues(issues: ZodIssue[]): GhostPatternsLintIssue[] {
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

function finalize(issues: GhostPatternsLintIssue[]): GhostPatternsLintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
