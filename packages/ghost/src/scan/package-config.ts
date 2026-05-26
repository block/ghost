import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { z } from "zod";
import type { LintIssue, LintReport } from "./lint.js";

export const GHOST_PACKAGE_CONFIG_SCHEMA = "ghost.config/v1" as const;

const SlugIdSchema = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, {
    message:
      "id must be a slug (lowercase alphanumeric plus . _ -, leading alphanumeric)",
  });

const GhostPackageConfigTargetSchema = z
  .object({
    id: SlugIdSchema,
    platform: z.string().min(1).optional(),
    roots: z.array(z.string()).default([]),
    components: z.array(z.string().min(1)).optional(),
    tokens: z.array(z.string().min(1)).optional(),
    exclude: z.array(z.string().min(1)).optional(),
  })
  .strict();

const GhostPackageConfigLibrarySchema = z
  .object({
    id: SlugIdSchema,
    role: z.string().min(1),
    source: z.string().min(1),
    fingerprint: z.string().min(1).optional(),
  })
  .strict();

export const GhostPackageConfigSchema = z
  .object({
    schema: z.literal(GHOST_PACKAGE_CONFIG_SCHEMA),
    targets: z.array(GhostPackageConfigTargetSchema).default([]),
    libraries: z.array(GhostPackageConfigLibrarySchema).default([]),
  })
  .strict();

export type GhostPackageConfig = z.infer<typeof GhostPackageConfigSchema>;
export type GhostPackageConfigTarget = GhostPackageConfig["targets"][number];
export type GhostPackageConfigLibrary = GhostPackageConfig["libraries"][number];

export interface ReferenceConfigInput {
  id: string;
  source: string;
  fingerprint?: string;
}

export function normalizeReferenceInput(
  reference: string,
): ReferenceConfigInput {
  const normalized = reference.replace(/\\/g, "/").replace(/\/+$/, "");
  const explicitRegistry = normalized.startsWith("registry:");
  const isFingerprint = /(^|\/)fingerprint\.ya?ml$/i.test(normalized);
  const baseReference = isFingerprint
    ? normalized.replace(/\/fingerprint\.ya?ml$/i, "")
    : normalized;
  const ghostIndex = baseReference.lastIndexOf("/.ghost");
  const sourcePath =
    ghostIndex >= 0
      ? baseReference.slice(0, ghostIndex)
      : isFingerprint
        ? baseReference
        : normalized;
  const registrySource = inferRegistrySource(normalized, sourcePath);
  const source = registrySource
    ? registrySource
    : normalized.startsWith("npm:")
      ? normalized
      : normalized.startsWith("workspace:")
        ? `workspace:${sourcePath.replace(/^workspace:/, "")}`
        : normalized.startsWith("@")
          ? `npm:${normalized}`
          : `workspace:${sourcePath}`;
  const fingerprintBase = normalized.replace(/^workspace:/, "");
  const fingerprint = isFingerprint
    ? fingerprintBase
    : ghostIndex >= 0
      ? `${fingerprintBase}/fingerprint.yml`
      : undefined;
  const referenceIdSource =
    source.startsWith("registry:") &&
    (explicitRegistry || /(^|\/)registry\.json$/i.test(normalized))
      ? source
          .slice("registry:".length)
          .replace(/\/public\/r\/registry\.json$/i, "")
          .replace(/\/r\/registry\.json$/i, "")
          .replace(/\/registry\.json$/i, "")
      : sourcePath;
  return {
    id: inferReferenceId(referenceIdSource),
    source,
    ...(fingerprint ? { fingerprint } : {}),
  };
}

export function templatePackageConfig(reference?: string): string {
  const libraries = reference
    ? [referenceLibraryConfig(normalizeReferenceInput(reference))]
    : [];
  const config: GhostPackageConfig = {
    schema: GHOST_PACKAGE_CONFIG_SCHEMA,
    targets: [{ id: "product", platform: "web", roots: [] }],
    libraries,
  };
  return stringifyYaml(config, { lineWidth: 0 });
}

function referenceLibraryConfig(reference: ReferenceConfigInput) {
  return {
    id: reference.id,
    role: reference.source.startsWith("registry:")
      ? "primary-ui-registry"
      : "primary-ui-library",
    source: reference.source,
    ...(reference.fingerprint ? { fingerprint: reference.fingerprint } : {}),
  };
}

function inferRegistrySource(
  normalized: string,
  sourcePath: string,
): string | undefined {
  if (normalized.startsWith("registry:")) return normalized;
  if (/\/r\/registry\.json$/i.test(normalized)) {
    return `registry:${normalized}`;
  }
  if (/(^|\/)registry\.json$/i.test(normalized)) {
    return `registry:${normalized}`;
  }
  if (inferReferenceId(sourcePath) === "ghost-ui") {
    return `registry:${sourcePath}/public/r/registry.json`;
  }
  return undefined;
}

export async function readOptionalPackageConfig(
  path: string,
): Promise<GhostPackageConfig | undefined> {
  try {
    const raw = await readFile(path, "utf-8");
    return parsePackageConfig(raw, path);
  } catch (err) {
    if (isMissingFileError(err)) return undefined;
    throw err;
  }
}

export function readOptionalPackageConfigSync(
  path: string,
): GhostPackageConfig | undefined {
  if (!existsSync(path)) return undefined;
  return parsePackageConfig(readFileSync(path, "utf-8"), path);
}

export function parsePackageConfig(
  raw: string,
  label = "config.yml",
): GhostPackageConfig {
  let parsed: unknown;
  try {
    parsed = parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  const result = GhostPackageConfigSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    const suffix = first?.path.length ? ` @ ${first.path.join(".")}` : "";
    throw new Error(
      `${label} failed schema validation: ${first?.message ?? "invalid config"}${suffix}`,
    );
  }
  return result.data;
}

export function lintGhostPackageConfig(input: unknown): LintReport {
  const issues: LintIssue[] = [];
  const result = GhostPackageConfigSchema.safeParse(input);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        severity: "error",
        rule: "config-schema-invalid",
        message: issue.message,
        path: issue.path.length ? issue.path.join(".") : undefined,
      });
    }
    return finalize(issues);
  }

  collectDuplicateIds(
    result.data.targets.map((target, index) => ({
      id: target.id,
      path: `targets[${index}].id`,
      label: "target",
    })),
    issues,
  );
  collectDuplicateIds(
    result.data.libraries.map((library, index) => ({
      id: library.id,
      path: `libraries[${index}].id`,
      label: "library",
    })),
    issues,
  );

  return finalize(issues);
}

function collectDuplicateIds(
  entries: Array<{ id: string; path: string; label: string }>,
  issues: LintIssue[],
): void {
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const previous = seen.get(entry.id);
    if (previous) {
      issues.push({
        severity: "error",
        rule: `${entry.label}-id-duplicate`,
        message: `${entry.label} id '${entry.id}' is duplicated (also at ${previous}).`,
        path: entry.path,
      });
    } else {
      seen.set(entry.id, entry.path);
    }
  }
}

function inferReferenceId(sourcePath: string): string {
  const withoutProtocol = sourcePath.replace(/^[a-z]+:/, "");
  const segments = withoutProtocol.split("/").filter(Boolean);
  const raw = segments.at(-1) ?? withoutProtocol;
  const npmName = raw.startsWith("@") ? raw.split("/").at(-1) : raw;
  const id = (npmName ?? "reference")
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");
  return id || "reference";
}

function isMissingFileError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ENOENT"
  );
}

function finalize(issues: LintIssue[]): LintReport {
  return {
    issues,
    errors: issues.filter((issue) => issue.severity === "error").length,
    warnings: issues.filter((issue) => issue.severity === "warning").length,
    info: issues.filter((issue) => issue.severity === "info").length,
  };
}
