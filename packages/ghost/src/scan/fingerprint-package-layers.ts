import { readFile } from "node:fs/promises";
import { parse as parseYaml } from "yaml";
import type { ZodIssue, ZodType } from "zod";
import {
  GHOST_FINGERPRINT_PACKAGE_SCHEMA,
  GHOST_FINGERPRINT_SCHEMA,
  GhostFingerprintCompositionSchema,
  type GhostFingerprintDocument,
  GhostFingerprintIntentSchema,
  GhostFingerprintInventorySchema,
  type GhostFingerprintPackageManifest,
  GhostFingerprintPackageManifestSchema,
  GhostFingerprintSchema,
  type GhostSurfacesDocument,
  GhostSurfacesSchema,
  lintGhostFingerprint,
} from "#ghost-core";
import { readOptionalUtf8 } from "../internal/fs.js";
import type {
  FingerprintPackagePaths,
  LoadedFingerprintPackage,
} from "./fingerprint-package.js";
import type { LintIssue } from "./lint.js";
import { normalizeReferenceInput } from "./package-config.js";

export async function loadFingerprintPackage(
  paths: FingerprintPackagePaths,
): Promise<LoadedFingerprintPackage> {
  const [manifestRaw, intentRaw, inventoryRaw, compositionRaw, surfacesRaw] =
    await Promise.all([
      readFile(paths.manifest, "utf-8"),
      readOptional(paths.intent),
      readOptional(paths.inventory),
      readOptional(paths.composition),
      readOptional(paths.surfaces),
    ]);
  const manifest = parseManifest(manifestRaw, "manifest.yml");
  const surfaces = parseSurfaces(surfacesRaw);
  const fingerprint = assembleFingerprint({
    intent: parseLayer(
      intentRaw,
      "intent.yml",
      GhostFingerprintIntentSchema,
      emptyIntent(),
    ),
    inventory: parseLayer(
      inventoryRaw,
      "inventory.yml",
      GhostFingerprintInventorySchema,
      emptyInventory(),
    ),
    composition: parseLayer(
      compositionRaw,
      "composition.yml",
      GhostFingerprintCompositionSchema,
      emptyComposition(),
    ),
  });
  const report = lintGhostFingerprint(fingerprint);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${splitFingerprintPath(first.path)}` : "";
    throw new Error(
      `fingerprint package failed lint: ${first?.message ?? "invalid fingerprint"}${suffix}`,
    );
  }
  return {
    manifest,
    manifestRaw,
    fingerprint,
    ...(surfaces ? { surfaces } : {}),
    layerRaw: {
      ...(intentRaw !== undefined ? { intent: intentRaw } : {}),
      ...(inventoryRaw !== undefined ? { inventory: inventoryRaw } : {}),
      ...(compositionRaw !== undefined ? { composition: compositionRaw } : {}),
    },
  };
}

function parseSurfaces(
  raw: string | undefined,
): GhostSurfacesDocument | undefined {
  if (raw === undefined) return undefined;
  const result = GhostSurfacesSchema.safeParse(parseYaml(raw));
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(
      `surfaces.yml failed schema validation: ${first?.message ?? "invalid surfaces"}`,
    );
  }
  return result.data as GhostSurfacesDocument;
}

export function lintFingerprintPackageManifest(
  raw: string,
  issues: LintIssue[],
): void {
  const manifest = parseYamlSafe(raw, "manifest.yml", issues);
  if (manifest === undefined) return;
  const manifestResult =
    GhostFingerprintPackageManifestSchema.safeParse(manifest);
  if (!manifestResult.success) {
    issues.push(
      ...prefixIssues(
        "manifest.yml",
        zodLikeIssues(manifestResult.error.issues),
      ),
    );
  }
}

export function parseSplitFingerprintForLint(
  input: {
    intentRaw?: string;
    inventoryRaw?: string;
    compositionRaw?: string;
  },
  issues: LintIssue[],
): GhostFingerprintDocument | undefined {
  const intent = parseLayerForLint(
    input.intentRaw,
    "intent.yml",
    GhostFingerprintIntentSchema,
    emptyIntent(),
    issues,
  );
  const inventory = parseLayerForLint(
    input.inventoryRaw,
    "inventory.yml",
    GhostFingerprintInventorySchema,
    emptyInventory(),
    issues,
  );
  const composition = parseLayerForLint(
    input.compositionRaw,
    "composition.yml",
    GhostFingerprintCompositionSchema,
    emptyComposition(),
    issues,
  );
  if (!intent || !inventory || !composition) return undefined;

  const fingerprint = assembleFingerprint({ intent, inventory, composition });
  const fingerprintReport = lintGhostFingerprint(fingerprint);
  issues.push(
    ...fingerprintReport.issues.map((issue) => ({
      ...issue,
      path: issue.path ? splitFingerprintPath(issue.path) : "fingerprint",
    })),
  );
  return fingerprintReport.errors === 0 ? fingerprint : undefined;
}

export function templateManifest(): string {
  return `schema: ${GHOST_FINGERPRINT_PACKAGE_SCHEMA}
id: local
`;
}

export function templateIntent(): string {
  return `summary: {}
situations: []
principles: []
experience_contracts: []
`;
}

export function templateInventory(reference?: string): string {
  const referenceInput = reference
    ? normalizeReferenceInput(reference)
    : undefined;
  if (referenceInput) {
    return `building_blocks:
  libraries:
    - ${referenceInput.id}
exemplars: []
sources:
  - id: ${referenceInput.id}
    kind: ${sourceKindForReference(referenceInput.source)}
    ref: ${referenceInput.source}
`;
  }

  return `building_blocks: {}
exemplars: []
sources: []
`;
}

export function templateComposition(): string {
  return `patterns: []
`;
}

const readOptional = readOptionalUtf8;

function parseManifest(
  raw: string,
  label: string,
): GhostFingerprintPackageManifest {
  const parsed = parseYamlStrict(raw, label);
  return GhostFingerprintPackageManifestSchema.parse(
    parsed,
  ) as GhostFingerprintPackageManifest;
}

function parseLayer<T>(
  raw: string | undefined,
  label: string,
  schema: ZodType<unknown>,
  empty: T,
): T {
  if (raw === undefined || raw.trim().length === 0) return empty;
  const parsed = parseYamlStrict(raw, label);
  return schema.parse(parsed) as T;
}

function parseLayerForLint<T>(
  raw: string | undefined,
  label: string,
  schema: ZodType<unknown>,
  empty: T,
  issues: LintIssue[],
): T | undefined {
  if (raw === undefined || raw.trim().length === 0) return empty;
  const parsed = parseYamlSafe(raw, label, issues);
  if (parsed === undefined) return undefined;
  const result = schema.safeParse(parsed);
  if (!result.success) {
    issues.push(...prefixIssues(label, zodLikeIssues(result.error.issues)));
    return undefined;
  }
  return result.data as T;
}

function assembleFingerprint(input: {
  intent: GhostFingerprintDocument["intent"];
  inventory: GhostFingerprintDocument["inventory"];
  composition: GhostFingerprintDocument["composition"];
}): GhostFingerprintDocument {
  return GhostFingerprintSchema.parse({
    schema: GHOST_FINGERPRINT_SCHEMA,
    intent: input.intent,
    inventory: input.inventory,
    composition: input.composition,
  }) as GhostFingerprintDocument;
}

function emptyIntent(): GhostFingerprintDocument["intent"] {
  return {
    summary: {},
    situations: [],
    principles: [],
    experience_contracts: [],
  };
}

function emptyInventory(): GhostFingerprintDocument["inventory"] {
  return {
    building_blocks: {},
    exemplars: [],
    sources: [],
  };
}

function emptyComposition(): GhostFingerprintDocument["composition"] {
  return {
    patterns: [],
  };
}

function parseYamlStrict(raw: string, label: string): unknown {
  try {
    return parseYaml(raw);
  } catch (err) {
    throw new Error(
      `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

function parseYamlSafe(
  raw: string,
  label: string,
  issues: LintIssue[],
): unknown | undefined {
  try {
    return parseYaml(raw);
  } catch (err) {
    issues.push({
      severity: "error",
      rule: "package-yaml-invalid",
      message: `${label} is not valid YAML: ${
        err instanceof Error ? err.message : String(err)
      }`,
      path: label,
    });
    return undefined;
  }
}

function splitFingerprintPath(path: string): string {
  if (path === "intent") return "intent.yml";
  if (path.startsWith("intent.")) {
    return `intent.yml.${path.slice("intent.".length)}`;
  }
  if (path === "inventory") return "inventory.yml";
  if (path.startsWith("inventory.")) {
    return `inventory.yml.${path.slice("inventory.".length)}`;
  }
  if (path === "composition") return "composition.yml";
  if (path.startsWith("composition.")) {
    return `composition.yml.${path.slice("composition.".length)}`;
  }
  return `fingerprint/${path}`;
}

function zodLikeIssues(issues: ZodIssue[]): Array<{
  severity: "error";
  rule: string;
  message: string;
  path?: string;
}> {
  return issues.map((issue) => ({
    severity: "error",
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

function prefixIssues(
  label: string,
  input: Array<{
    severity: "error" | "warning" | "info";
    rule: string;
    message: string;
    path?: string;
  }>,
): LintIssue[] {
  return input.map((issue) => ({
    severity: issue.severity,
    rule: issue.rule,
    message: issue.message,
    path: issue.path ? `${label}.${issue.path}` : label,
  }));
}

function sourceKindForReference(
  source: string,
): "cache" | "registry" | "file" | "url" | "package" {
  if (source.startsWith("registry:")) return "registry";
  if (/^https?:\/\//i.test(source)) return "url";
  if (source.startsWith("npm:")) return "package";
  return "file";
}
