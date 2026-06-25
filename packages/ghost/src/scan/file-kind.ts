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
  lintGhostSurfaces,
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
  | "patterns"
  | "surfaces"
  | "unsupported-yaml";

export interface LintDetectedFileKindOptions {
  fingerprint?: GhostFingerprintDocument;
}

/**
 * Decide whether a file is a bundle artifact. JSON paths/contents route to
 * the survey linter; markdown with `schema: ghost.map/v1` in frontmatter
 * routes to the map linter; YAML schemas and canonical package filenames route
 * to their artifact linters. Unknown YAML remains unsupported instead of being
 * guessed as `validate.yml`.
 */
export function detectFileKind(path: string, raw: string): DetectedFileKind {
  const lowerPath = path.toLowerCase();
  const filename = lowerPath.split(/[\\/]/).pop() ?? lowerPath;
  if (lowerPath.endsWith(".json")) return "survey";
  if (filename === "fingerprint.yml") {
    return "fingerprint-yml";
  }
  if (filename === "fingerprint.yaml") {
    return "fingerprint-yml";
  }
  if (filename === "manifest.yml") {
    return "fingerprint-manifest";
  }
  if (filename === "manifest.yaml") {
    return "fingerprint-manifest";
  }
  if (filename === "intent.yml") {
    return "fingerprint-intent";
  }
  if (filename === "intent.yaml") {
    return "fingerprint-intent";
  }
  if (filename === "inventory.yml") {
    return "fingerprint-inventory";
  }
  if (filename === "inventory.yaml") {
    return "fingerprint-inventory";
  }
  if (filename === "composition.yml") {
    return "fingerprint-composition";
  }
  if (filename === "composition.yaml") {
    return "fingerprint-composition";
  }
  if (filename === "validate.yml" || filename === "validate.yaml") {
    return "validate";
  }
  if (filename === "resources.yml") return "resources";
  if (filename === "resources.yaml") return "resources";
  if (filename === "patterns.yml") return "patterns";
  if (filename === "patterns.yaml") return "patterns";
  if (filename === "surfaces.yml") return "surfaces";
  if (filename === "surfaces.yaml") return "surfaces";
  if (raw.trimStart().startsWith("{")) return "survey";
  if (/^\s*schema:\s*ghost\.fingerprint\/v[12]\b/m.test(raw)) {
    return "fingerprint-yml";
  }
  if (/^\s*schema:\s*ghost\.fingerprint-package\/v1\b/m.test(raw)) {
    return "fingerprint-manifest";
  }
  if (/^\s*schema:\s*ghost\.resources\/v1\b/m.test(raw)) return "resources";
  if (/^\s*schema:\s*ghost\.patterns\/v1\b/m.test(raw)) return "patterns";
  if (/^\s*schema:\s*ghost\.surfaces\/v1\b/m.test(raw)) return "surfaces";
  if (/^\s*schema:\s*ghost\.validate\/v[12]\b/m.test(raw)) return "validate";
  if (lowerPath.endsWith(".yml") || lowerPath.endsWith(".yaml")) {
    return "unsupported-yaml";
  }
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
                    : kind === "surfaces"
                      ? lintSurfacesFile(raw)
                      : kind === "validate"
                        ? lintValidateFile(raw, options.fingerprint)
                        : kind === "unsupported-yaml"
                          ? lintUnsupportedYamlFile()
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

function lintSurfacesFile(raw: string): ReturnType<typeof lintFingerprint> {
  try {
    return lintGhostSurfaces(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("surfaces-not-yaml", "surfaces file", err);
  }
}

function lintUnsupportedYamlFile(): ReturnType<typeof lintFingerprint> {
  return {
    issues: [
      {
        severity: "error",
        rule: "unsupported-yaml",
        message:
          "YAML file is not a recognized Ghost artifact. Use manifest.yml, intent.yml, inventory.yml, composition.yml, validate.yml, resources.yml, patterns.yml, fingerprint.yml, or include a supported ghost.* schema.",
      },
    ],
    errors: 1,
    warnings: 0,
    info: 0,
  };
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
