import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  type GhostChecksDocument,
  GhostChecksSchema,
  type GhostFingerprintDocument,
  GhostFingerprintSchema,
  lintGhostChecks,
  lintGhostFingerprint,
} from "#ghost-core";
import type { FingerprintPackagePaths } from "../fingerprint-package.js";

export interface PackageInventorySummary {
  root?: string;
  platform_hints: string[];
  build_system_hints: string[];
  language_histogram: Array<{ name: string; files: number }>;
  package_manifests: string[];
  candidate_config_files: string[];
  registry_files: string[];
  top_level_tree: Array<{ path: string; kind: string; child_count: number }>;
  config?: {
    targets?: Array<{ id: string; platform?: string; roots?: string[] }>;
    libraries?: Array<{ id: string; role?: string; source?: string }>;
  };
}

export type PackageInventory =
  | { state: "missing"; path: string }
  | { state: "present"; path: string; summary: PackageInventorySummary }
  | { state: "unreadable"; path: string; error: string };

export interface PackageMemory {
  name: string;
  memoryDir?: string;
  fingerprint: GhostFingerprintDocument;
  fingerprintRaw: string;
  checks?: GhostChecksDocument;
  checksRaw?: string;
  intent?: string;
  inventory: PackageInventory;
}

export async function loadPackageMemory(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageMemory> {
  const [fingerprintRaw, checksRaw, intent, inventory] = await Promise.all([
    readFile(paths.fingerprintYml, "utf-8"),
    readOptional(paths.checks),
    readOptional(paths.intent),
    loadPackageInventory(paths),
  ]);

  const fingerprint = parseFingerprint(fingerprintRaw);
  const checks = checksRaw ? parseChecks(checksRaw, fingerprint) : undefined;
  return {
    name: sanitizeName(nameOverride ?? inferPackageName(fingerprint)),
    fingerprint,
    fingerprintRaw,
    checks,
    checksRaw,
    intent,
    inventory,
  };
}

export async function loadPackageInventory(
  paths: Pick<FingerprintPackagePaths, "cache">,
): Promise<PackageInventory> {
  const path = join(paths.cache, "inventory.json");
  const raw = await readOptional(path);
  if (!raw) return { state: "missing", path };
  try {
    return { state: "present", path, summary: summarizeInventory(raw) };
  } catch (err) {
    return {
      state: "unreadable",
      path,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function parseFingerprint(raw: string): GhostFingerprintDocument {
  const parsed = parseYamlSafe(raw, "fingerprint.yml");
  const report = lintGhostFingerprint(parsed);
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `fingerprint.yml failed lint with ${report.errors} error(s): ${
        first?.message ?? "invalid fingerprint"
      }${suffix}`,
    );
  }

  const result = GhostFingerprintSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("fingerprint.yml failed schema validation.");
  }
  return result.data as GhostFingerprintDocument;
}

function parseChecks(
  raw: string,
  fingerprint: GhostFingerprintDocument,
): GhostChecksDocument {
  const parsed = parseYamlSafe(raw, "checks.yml");
  const report = lintGhostChecks(parsed, { fingerprint });
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `checks.yml failed lint with ${report.errors} error(s): ${
        first?.message ?? "invalid checks"
      }${suffix}`,
    );
  }

  const result = GhostChecksSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("checks.yml failed schema validation.");
  }
  return result.data as GhostChecksDocument;
}

function parseYamlSafe(raw: string, label: string): unknown {
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

function summarizeInventory(raw: string): PackageInventorySummary {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    root: typeof parsed.root === "string" ? parsed.root : undefined,
    platform_hints: stringArray(parsed.platform_hints).slice(0, 8),
    build_system_hints: stringArray(parsed.build_system_hints).slice(0, 8),
    language_histogram: recordArray(parsed.language_histogram)
      .map((entry) => ({
        name: typeof entry.name === "string" ? entry.name : "",
        files: typeof entry.files === "number" ? entry.files : 0,
      }))
      .filter((entry) => entry.name)
      .slice(0, 8),
    package_manifests: stringArray(parsed.package_manifests).slice(0, 12),
    candidate_config_files: stringArray(parsed.candidate_config_files).slice(
      0,
      12,
    ),
    registry_files: stringArray(parsed.registry_files).slice(0, 8),
    top_level_tree: recordArray(parsed.top_level_tree)
      .map((entry) => ({
        path: typeof entry.path === "string" ? entry.path : "",
        kind: typeof entry.kind === "string" ? entry.kind : "",
        child_count:
          typeof entry.child_count === "number" ? entry.child_count : 0,
      }))
      .filter((entry) => entry.path && entry.kind)
      .slice(0, 12),
    config: summarizeInventoryConfig(parsed.config),
  };
}

function summarizeInventoryConfig(
  value: unknown,
): PackageInventorySummary["config"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const targets = recordArray(record.targets)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      ...(typeof entry.platform === "string"
        ? { platform: entry.platform }
        : {}),
      roots: stringArray(entry.roots),
    }))
    .filter((entry) => entry.id)
    .slice(0, 8);
  const libraries = recordArray(record.libraries)
    .map((entry) => ({
      id: typeof entry.id === "string" ? entry.id : "",
      ...(typeof entry.role === "string" ? { role: entry.role } : {}),
      ...(typeof entry.source === "string" ? { source: entry.source } : {}),
    }))
    .filter((entry) => entry.id)
    .slice(0, 8);
  if (targets.length === 0 && libraries.length === 0) return undefined;
  return { targets, libraries };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((entry): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
      )
    : [];
}

async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

function inferPackageName(fingerprint: GhostFingerprintDocument): string {
  if (fingerprint.summary.product) return fingerprint.summary.product;
  const firstScope = fingerprint.topology.scopes?.[0]?.id;
  if (firstScope) return firstScope;
  return "ghost-package";
}

function sanitizeName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "ghost-package";
}
