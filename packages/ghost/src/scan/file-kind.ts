import { parse as parseYaml } from "yaml";
import {
  GhostFingerprintCompositionSchema,
  type GhostFingerprintDocument,
  GhostFingerprintIntentSchema,
  GhostFingerprintInventorySchema,
  GhostFingerprintPackageManifestSchema,
  lintGhostCheck,
  lintGhostFingerprint,
  lintGhostNode,
  lintGhostPatterns,
  lintGhostResources,
  lintGhostSurfaces,
  lintSurvey,
  type SurveyLintReport,
} from "#ghost-core";
import type { LintReport } from "./lint.js";

export type DetectedFileKind =
  | "survey"
  | "fingerprint-yml"
  | "fingerprint-manifest"
  | "fingerprint-intent"
  | "fingerprint-inventory"
  | "fingerprint-composition"
  | "resources"
  | "patterns"
  | "surfaces"
  | "check"
  | "node"
  | "unsupported";

export interface LintDetectedFileKindOptions {
  fingerprint?: GhostFingerprintDocument;
}

/**
 * Decide whether a file is a bundle artifact. JSON paths/contents route to
 * the survey linter; YAML schemas and canonical package filenames route to
 * their artifact linters. Unknown YAML remains unsupported instead of being
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
  if (filename === "resources.yml") return "resources";
  if (filename === "resources.yaml") return "resources";
  if (filename === "patterns.yml") return "patterns";
  if (filename === "patterns.yaml") return "patterns";
  if (filename === "surfaces.yml") return "surfaces";
  if (filename === "surfaces.yaml") return "surfaces";
  // A markdown check lives under a `checks/` directory. Detected by location so
  // the established agent-check format (no `schema:` field) is recognized.
  if (filename.endsWith(".md") && /(^|[\\/])checks[\\/]/.test(lowerPath)) {
    return "check";
  }
  // A markdown node lives under a `nodes/` directory (ghost.node/v1).
  if (filename.endsWith(".md") && /(^|[\\/])nodes[\\/]/.test(lowerPath)) {
    return "node";
  }
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
  return "unsupported";
}

export function lintDetectedFileKind(
  kind: DetectedFileKind,
  raw: string,
  _options: LintDetectedFileKindOptions = {},
): LintReport {
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
              : kind === "resources"
                ? lintResourcesFile(raw)
                : kind === "patterns"
                  ? lintPatternsFile(raw)
                  : kind === "surfaces"
                    ? lintSurfacesFile(raw)
                    : kind === "check"
                      ? lintGhostCheck(raw)
                      : kind === "node"
                        ? lintGhostNode(raw)
                        : lintUnsupportedFile();
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

function lintFingerprintYmlFile(raw: string): LintReport {
  try {
    return lintGhostFingerprint(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("fingerprint-yml-not-yaml", "fingerprint.yml", err);
  }
}

function lintFingerprintManifestFile(raw: string): LintReport {
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
): LintReport {
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
}): LintReport {
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

function lintResourcesFile(raw: string): LintReport {
  try {
    return lintGhostResources(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("resources-not-yaml", "resources file", err);
  }
}

function lintPatternsFile(raw: string): LintReport {
  try {
    return lintGhostPatterns(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("patterns-not-yaml", "patterns file", err);
  }
}

function lintSurfacesFile(raw: string): LintReport {
  try {
    return lintGhostSurfaces(parseYaml(raw));
  } catch (err) {
    return yamlErrorReport("surfaces-not-yaml", "surfaces file", err);
  }
}

function lintUnsupportedFile(): LintReport {
  return {
    issues: [
      {
        severity: "error",
        rule: "unsupported-artifact",
        message:
          "File is not a recognized Ghost artifact. Use manifest.yml, intent.yml, inventory.yml, composition.yml, resources.yml, patterns.yml, surfaces.yml, a checks/*.md check, or a nodes/*.md node.",
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
): LintReport {
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
