import { parse as parseYaml } from "yaml";
import {
  GhostFingerprintCompositionSchema,
  type GhostFingerprintDocument,
  GhostFingerprintInventorySchema,
  GhostFingerprintPackageManifestSchema,
  GhostFingerprintProseSchema,
  lintGhostChecks,
  lintGhostFingerprint,
  lintGhostPatterns,
  lintGhostResources,
  lintSurvey,
  type SurveyLintReport,
} from "#ghost-core";
import { lintFingerprint } from "./lint.js";
import { lintMap } from "./lint-map.js";
import { lintGhostPackageConfig } from "./package-config.js";

export type DetectedFileKind =
  | "survey"
  | "map"
  | "fingerprint"
  | "fingerprint-yml"
  | "fingerprint-manifest"
  | "fingerprint-prose"
  | "fingerprint-inventory"
  | "fingerprint-composition"
  | "checks"
  | "config"
  | "resources"
  | "patterns";

export interface LintDetectedFileKindOptions {
  fingerprint?: GhostFingerprintDocument;
}

/**
 * Decide whether a file is a bundle artifact. JSON paths/contents route to
 * the survey linter; markdown with `schema: ghost.map/v1` in frontmatter
 * routes to the map linter; YAML schemas route to fingerprint.yml,
 * config/resources/patterns/checks; everything else stays on the direct
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
  if (path.toLowerCase().endsWith("fingerprint/manifest.yml")) {
    return "fingerprint-manifest";
  }
  if (path.toLowerCase().endsWith("fingerprint/manifest.yaml")) {
    return "fingerprint-manifest";
  }
  if (path.toLowerCase().endsWith("fingerprint/prose.yml")) {
    return "fingerprint-prose";
  }
  if (path.toLowerCase().endsWith("fingerprint/prose.yaml")) {
    return "fingerprint-prose";
  }
  if (path.toLowerCase().endsWith("fingerprint/inventory.yml")) {
    return "fingerprint-inventory";
  }
  if (path.toLowerCase().endsWith("fingerprint/inventory.yaml")) {
    return "fingerprint-inventory";
  }
  if (path.toLowerCase().endsWith("fingerprint/composition.yml")) {
    return "fingerprint-composition";
  }
  if (path.toLowerCase().endsWith("fingerprint/composition.yaml")) {
    return "fingerprint-composition";
  }
  if (path.toLowerCase().endsWith("resources.yml")) return "resources";
  if (path.toLowerCase().endsWith("resources.yaml")) return "resources";
  if (path.toLowerCase().endsWith("patterns.yml")) return "patterns";
  if (path.toLowerCase().endsWith("patterns.yaml")) return "patterns";
  if (path.toLowerCase().endsWith("config.yml")) return "config";
  if (path.toLowerCase().endsWith("config.yaml")) return "config";
  if (raw.trimStart().startsWith("{")) return "survey";
  if (/^\s*schema:\s*ghost\.fingerprint\/v[12]\b/m.test(raw)) {
    return "fingerprint-yml";
  }
  if (/^\s*schema:\s*ghost\.resources\/v1\b/m.test(raw)) return "resources";
  if (/^\s*schema:\s*ghost\.patterns\/v1\b/m.test(raw)) return "patterns";
  if (/^\s*schema:\s*ghost\.config\/v1\b/m.test(raw)) return "config";
  if (/^\s*schema:\s*ghost\.checks\/v[12]\b/m.test(raw)) return "checks";
  if (path.toLowerCase().endsWith(".yml")) return "checks";
  if (path.toLowerCase().endsWith(".yaml")) return "checks";
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
        : kind === "fingerprint-prose"
          ? lintFingerprintLayerFile(raw, "prose")
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
                    : kind === "config"
                      ? lintConfigFile(raw)
                      : kind === "checks"
                        ? lintChecksFile(raw, options.fingerprint)
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

function lintChecksFile(
  raw: string,
  fingerprint?: GhostFingerprintDocument,
): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostChecks(parseYaml(raw), fingerprint ? { fingerprint } : {});
  } catch (err) {
    return yamlErrorReport("checks-not-yaml", "checks file", err);
  }
}

function lintConfigFile(raw: string): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostPackageConfig(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("config-not-yaml", "config.yml", err);
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
      "fingerprint/manifest.yml",
      err,
    );
  }
}

function lintFingerprintLayerFile(
  raw: string,
  layer: "prose" | "inventory" | "composition",
): ReturnType<typeof lintFingerprint> {
  try {
    const parsed = parseYaml(raw);
    const result =
      layer === "prose"
        ? GhostFingerprintProseSchema.safeParse(parsed)
        : layer === "inventory"
          ? GhostFingerprintInventorySchema.safeParse(parsed)
          : GhostFingerprintCompositionSchema.safeParse(parsed);
    return zodLintReport(result);
  } catch (err) {
    return yamlErrorReport(
      `fingerprint-${layer}-not-yaml`,
      `fingerprint/${layer}.yml`,
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
