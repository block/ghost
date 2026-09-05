import { parse as parseYaml } from "yaml";
import {
  GhostPackageManifestSchema,
  lintGhostCheck,
  lintGhostNode,
} from "#ghost-core";
import { GHOST_MATERIALS_DIR } from "./constants.js";
import type { LintReport } from "./lint.js";

export type DetectedFileKind =
  | "package-manifest"
  | "check"
  | "material"
  | "node"
  | "unsupported";

/**
 * Decide whether a file is a bundle artifact. The manifest routes to its
 * artifact linter; files under a root `materials/` directory are material
 * files; markdown under a `checks/` directory is a check; any other markdown
 * is a node (its path is its id). Unknown files remain unsupported
 * instead of being guessed at.
 */
export function detectFileKind(path: string, raw: string): DetectedFileKind {
  const lowerPath = path.toLowerCase();
  const filename = lowerPath.split(/[\\/]/).pop() ?? lowerPath;
  if (filename === "manifest.yml") {
    return "package-manifest";
  }
  if (filename === "manifest.yaml") {
    return "package-manifest";
  }
  if (new RegExp(`(^|[\\\\/])${GHOST_MATERIALS_DIR}[\\\\/]`).test(lowerPath)) {
    return "material";
  }
  if (filename.endsWith(".md")) {
    // Package checks are identified by location. Standalone check files are
    // identified by their required frontmatter keys so `ghost validate x.md`
    // behaves like package validation without guessing from the filename.
    if (/(^|[\\/])checks[\\/]/.test(lowerPath) || hasCheckFrontmatter(raw)) {
      return "check";
    }
    return "node";
  }
  if (/^\s*schema:\s*ghost\.package\/v1\b/m.test(raw)) {
    return "package-manifest";
  }
  return "unsupported";
}

function hasCheckFrontmatter(raw: string): boolean {
  try {
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
    if (!match) return false;
    const frontmatter = parseYaml(match[1]);
    return (
      typeof frontmatter === "object" &&
      frontmatter !== null &&
      typeof frontmatter.name === "string" &&
      typeof frontmatter.description === "string" &&
      typeof frontmatter.severity === "string"
    );
  } catch {
    return false;
  }
}

export function lintDetectedFileKind(
  kind: DetectedFileKind,
  raw: string,
): LintReport {
  return kind === "package-manifest"
    ? lintPackageManifestFile(raw)
    : kind === "check"
      ? lintGhostCheck(raw)
      : kind === "material"
        ? emptyLintReport()
        : kind === "node"
          ? lintGhostNode(raw)
          : lintUnsupportedFile();
}

function emptyLintReport(): LintReport {
  return { issues: [], errors: 0, warnings: 0, info: 0 };
}

function lintPackageManifestFile(raw: string): LintReport {
  try {
    return zodLintReport(GhostPackageManifestSchema.safeParse(parseYaml(raw)));
  } catch (err) {
    return yamlErrorReport("package-manifest-not-yaml", "manifest.yml", err);
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
          "File is not a recognized ghost artifact. Use manifest.yml, a checks/*.md check, or a *.md node.",
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
