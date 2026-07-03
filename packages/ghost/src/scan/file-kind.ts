import { parse as parseYaml } from "yaml";
import {
  GhostFingerprintPackageManifestSchema,
  lintGhostCheck,
  lintGhostNode,
} from "#ghost-core";
import type { LintReport } from "./lint.js";

export type DetectedFileKind =
  | "fingerprint-manifest"
  | "check"
  | "node"
  | "unsupported";

/**
 * Decide whether a file is a bundle artifact. The manifest routes to its
 * artifact linter; markdown under a `checks/` directory (including the checks
 * haunt at `haunts/checks/`) is a check; any other markdown is a node (its path
 * is its id — containment is the directory tree). Unknown files remain
 * unsupported instead of being guessed at.
 */
export function detectFileKind(path: string, raw: string): DetectedFileKind {
  const lowerPath = path.toLowerCase();
  const filename = lowerPath.split(/[\\/]/).pop() ?? lowerPath;
  if (filename === "manifest.yml") {
    return "fingerprint-manifest";
  }
  if (filename === "manifest.yaml") {
    return "fingerprint-manifest";
  }
  // A markdown check lives under a `checks/` directory (e.g. the checks haunt
  // at `haunts/checks/`). Detected by location so the established agent-check
  // format (no `schema:` field) is recognized.
  if (filename.endsWith(".md") && /(^|[\\/])checks[\\/]/.test(lowerPath)) {
    return "check";
  }
  // Any other markdown file is a node (ghost.node/v1). Its id is its path; the
  // containing directory is its parent.
  if (filename.endsWith(".md")) {
    return "node";
  }
  if (/^\s*schema:\s*ghost\.fingerprint-package\/v1\b/m.test(raw)) {
    return "fingerprint-manifest";
  }
  return "unsupported";
}

export function lintDetectedFileKind(
  kind: DetectedFileKind,
  raw: string,
): LintReport {
  return kind === "fingerprint-manifest"
    ? lintFingerprintManifestFile(raw)
    : kind === "check"
      ? lintGhostCheck(raw)
      : kind === "node"
        ? lintGhostNode(raw)
        : lintUnsupportedFile();
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

function lintUnsupportedFile(): LintReport {
  return {
    issues: [
      {
        severity: "error",
        rule: "unsupported-artifact",
        message:
          "File is not a recognized Ghost artifact. Use manifest.yml, a haunts/checks/*.md check, or a *.md node.",
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
