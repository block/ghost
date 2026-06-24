import { parse as parseYaml } from "yaml";
import {
  GhostFingerprintCompositionSchema,
  type GhostFingerprintDocument,
  GhostFingerprintIntentSchema,
  GhostFingerprintInventorySchema,
  GhostFingerprintPackageManifestSchema,
  lintGhostFingerprint,
  lintGhostPatterns,
  lintGhostResources,
  lintGhostValidate,
  lintSurvey,
  type SurveyLintReport,
} from "#ghost-core";
import { lintFingerprint } from "./lint.js";
import { lintMap } from "./lint-map.js";

export type DetectedFileKind =
  | "survey"
  | "map"
  | "fingerprint"
  | "fingerprint-yml"
  | "fingerprint-manifest"
  | "fingerprint-intent"
  | "fingerprint-inventory"
  | "fingerprint-composition"
  | "validate"
  | "resources"
  | "patterns";

export interface LintDetectedFileKindOptions {
  fingerprint?: GhostFingerprintDocument;
}

/**
 * Decide whether a file is a bundle artifact. JSON paths/contents route to
 * the survey linter; markdown with `schema: ghost.map/v1` in frontmatter
 * routes to the map linter; YAML schemas route to fingerprint.yml,
 * config/resources/patterns/validate; everything else stays on the direct
 * fingerprint markdown path.
 */
export function detectFileKind(path: string, raw: string): DetectedFileKind {
  if (path.toLowerCase().endsWith(".json")) return "survey";
  if (path.toLowerCase().endsWith("fingerprint.yml")) {
    return "fingerprint-yml";
  }
  if (path.toLowerCase().endsWith("fingerprint.yaml")) {
    return "fingerprint-yml";
  }
  if (
    path.toLowerCase().endsWith("/manifest.yml") ||
    path.toLowerCase().endsWith("manifest.yml")
  ) {
    return "fingerprint-manifest";
  }
  if (
    path.toLowerCase().endsWith("/manifest.yaml") ||
    path.toLowerCase().endsWith("manifest.yaml")
  ) {
    return "fingerprint-manifest";
  }
  if (
    path.toLowerCase().endsWith("/intent.yml") ||
    path.toLowerCase().endsWith("intent.yml")
  ) {
    return "fingerprint-intent";
  }
  if (
    path.toLowerCase().endsWith("/intent.yaml") ||
    path.toLowerCase().endsWith("intent.yaml")
  ) {
    return "fingerprint-intent";
  }
  if (
    path.toLowerCase().endsWith("/inventory.yml") ||
    path.toLowerCase().endsWith("inventory.yml")
  ) {
    return "fingerprint-inventory";
  }
  if (
    path.toLowerCase().endsWith("/inventory.yaml") ||
    path.toLowerCase().endsWith("inventory.yaml")
  ) {
    return "fingerprint-inventory";
  }
  if (
    path.toLowerCase().endsWith("/composition.yml") ||
    path.toLowerCase().endsWith("composition.yml")
  ) {
    return "fingerprint-composition";
  }
  if (
    path.toLowerCase().endsWith("/composition.yaml") ||
    path.toLowerCase().endsWith("composition.yaml")
  ) {
    return "fingerprint-composition";
  }
  if (path.toLowerCase().endsWith("resources.yml")) return "resources";
  if (path.toLowerCase().endsWith("resources.yaml")) return "resources";
  if (path.toLowerCase().endsWith("patterns.yml")) return "patterns";
  if (path.toLowerCase().endsWith("patterns.yaml")) return "patterns";
  if (raw.trimStart().startsWith("{")) return "survey";
  if (/^\s*schema:\s*ghost\.fingerprint\/v[12]\b/m.test(raw)) {
    return "fingerprint-yml";
  }
  if (/^\s*schema:\s*ghost\.resources\/v1\b/m.test(raw)) return "resources";
  if (/^\s*schema:\s*ghost\.patterns\/v1\b/m.test(raw)) return "patterns";
  if (/^\s*schema:\s*ghost\.validate\/v[12]\b/m.test(raw)) return "validate";
  if (path.toLowerCase().endsWith(".yml")) return "validate";
  if (path.toLowerCase().endsWith(".yaml")) return "validate";
  const fmEnd = raw.indexOf("\n---", 3);
  if (raw.startsWith("---") && fmEnd > 0) {
    const fm = raw.slice(0, fmEnd);
    if (/\bschema:\s*ghost\.map\/v1\b/.test(fm)) return "map";
  }
  if (path.toLowerCase().endsWith("map.md")) return "map";
  return "fingerprint";
}

export function lintDetectedFileKind(
  kind: DetectedFileKind,
  raw: string,
  options: LintDetectedFileKindOptions = {},
): ReturnType<typeof lintFingerprint> {
  return kind === "survey"
    ? lintSurveyFile(raw)
    : kind === "fingerprint-yml"
      ? lintFingerprintYmlFile(raw)
      : kind === "fingerprint-manifest"
        ? lintFingerprintManifestFile(raw)
        : kind === "fingerprint-intent"
          ? lintFingerprintLayerFile(raw, "intent")
          : kind === "fingerprint-inventory"
            ? lintFingerprintLayerFile(raw, "inventory")
            : kind === "fingerprint-composition"
              ? lintFingerprintLayerFile(raw, "composition")
              : kind === "map"
                ? lintMap(raw)
                : kind === "resources"
                  ? lintResourcesFile(raw)
                  : kind === "patterns"
                    ? lintPatternsFile(raw)
                    : kind === "validate"
                      ? lintValidateFile(raw, options.fingerprint)
                      : lintFingerprint(raw);
}

function lintSurveyFile(raw: string): SurveyLintReport {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    return {
      issues: [
        {
          severity: "error",
          rule: "survey-not-json",
          message: `survey file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      errors: 1,
      warnings: 0,
      info: 0,
    };
  }
  return lintSurvey(json);
}

function lintValidateFile(
  raw: string,
  fingerprint?: GhostFingerprintDocument,
): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostValidate(
      parseYaml(raw),
      fingerprint ? { fingerprint } : {},
    );
  } catch (err) {
    return yamlErrorReport("validate-not-yaml", "validate file", err);
  }
}

function lintFingerprintYmlFile(
  raw: string,
): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostFingerprint(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("fingerprint-yml-not-yaml", "fingerprint.yml", err);
  }
}

function lintFingerprintManifestFile(
  raw: string,
): ReturnType<typeof lintFingerprint> {
  try {
    return zodLintReport(
      GhostFingerprintPackageManifestSchema.safeParse(parseYaml(raw)),
    );
  } catch (err) {
    return yamlErrorReport(
      "fingerprint-manifest-not-yaml",
      "manifest.yml",
      err,
    );
  }
}

function lintFingerprintLayerFile(
  raw: string,
  facet: "intent" | "inventory" | "composition",
): ReturnType<typeof lintFingerprint> {
  try {
    const parsed = parseYaml(raw);
    const result =
      facet === "intent"
        ? GhostFingerprintIntentSchema.safeParse(parsed)
        : facet === "inventory"
          ? GhostFingerprintInventorySchema.safeParse(parsed)
          : GhostFingerprintCompositionSchema.safeParse(parsed);
    return zodLintReport(result);
  } catch (err) {
    return yamlErrorReport(
      `fingerprint-${facet}-not-yaml`,
      `${facet}.yml`,
      err,
    );
  }
}

function zodLintReport(result: {
  success: boolean;
  error?: { issues: Array<{ code: string; message: string; path: unknown[] }> };
}): ReturnType<typeof lintFingerprint> {
  if (result.success) {
    return { issues: [], errors: 0, warnings: 0, info: 0 };
  }
  const issues =
    result.error?.issues.map((issue) => ({
      severity: "error" as const,
      rule: `schema/${issue.code}`,
      message: issue.message,
      path: formatZodPath(issue.path),
    })) ?? [];
  return {
    issues,
    errors: issues.length,
    warnings: 0,
    info: 0,
  };
}

function lintResourcesFile(raw: string): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostResources(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("resources-not-yaml", "resources file", err);
  }
}

function lintPatternsFile(raw: string): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostPatterns(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("patterns-not-yaml", "patterns file", err);
  }
}

function yamlErrorReport(
  rule: string,
  label: string,
  err: unknown,
): ReturnType<typeof lintFingerprint> {
  return {
    issues: [
      {
        severity: "error",
        rule,
        message: `${label} is not valid YAML: ${
          err instanceof Error ? err.message : String(err)
        }`,
      },
    ],
    errors: 1,
    warnings: 0,
    info: 0,
  };
}

function formatZodPath(path: unknown[]): string | undefined {
  if (path.length === 0) return undefined;
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") return `${formatted}[${segment}]`;
    const key = String(segment);
    return formatted ? `${formatted}.${key}` : key;
  }, "");
}
