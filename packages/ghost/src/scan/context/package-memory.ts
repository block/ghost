import { readFile } from "node:fs/promises";
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

export interface PackageMemory {
  name: string;
  memoryDir?: string;
  fingerprint: GhostFingerprintDocument;
  fingerprintRaw: string;
  checks?: GhostChecksDocument;
  checksRaw?: string;
  intent?: string;
}

export async function loadPackageMemory(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageMemory> {
  const [fingerprintRaw, checksRaw, intent] = await Promise.all([
    readFile(paths.fingerprintYml, "utf-8"),
    readOptional(paths.checks),
    readOptional(paths.intent),
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
  };
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
