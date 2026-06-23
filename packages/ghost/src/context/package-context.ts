import { parse as parseYaml } from "yaml";
import {
  type GhostChecksDocument,
  GhostChecksSchema,
  type GhostFingerprintDocument,
  lintGhostChecks,
} from "#ghost-core";
import { readOptionalUtf8 } from "../internal/fs.js";
import {
  type FingerprintPackagePaths,
  loadFingerprintPackage,
} from "../scan/fingerprint-package.js";

export interface PackageContext {
  name: string;
  fingerprintDir?: string;
  targetPaths?: string[];
  layerDirs?: string[];
  fingerprint: GhostFingerprintDocument;
  fingerprintRaw: string;
  fingerprintLayers?: {
    manifest: string;
    prose?: string;
    inventory?: string;
    composition?: string;
  };
  checks?: GhostChecksDocument;
  checksRaw?: string;
}

export async function loadPackageContext(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageContext> {
  const [loaded, checksRaw] = await Promise.all([
    loadFingerprintPackage(paths),
    readOptional(paths.checks),
  ]);

  const fingerprint = loaded.fingerprint;
  const checks = checksRaw ? parseChecks(checksRaw, fingerprint) : undefined;
  return {
    name: sanitizeName(nameOverride ?? inferPackageName(fingerprint)),
    fingerprintDir: paths.dir,
    fingerprint,
    fingerprintRaw: JSON.stringify(fingerprint, null, 2),
    fingerprintLayers: {
      manifest: loaded.manifestRaw,
      ...loaded.layerRaw,
    },
    checks,
    checksRaw,
  };
}

function parseChecks(
  raw: string,
  fingerprint: GhostFingerprintDocument,
): GhostChecksDocument {
  const parsed = parseYamlSafe(raw, "fingerprint/checks.yml");
  const report = lintGhostChecks(parsed, { fingerprint });
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `fingerprint/checks.yml failed lint with ${report.errors} error(s): ${
        first?.message ?? "invalid checks"
      }${suffix}`,
    );
  }

  const result = GhostChecksSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("fingerprint/checks.yml failed schema validation.");
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

const readOptional = readOptionalUtf8;

function inferPackageName(fingerprint: GhostFingerprintDocument): string {
  if (fingerprint.prose.summary.product)
    return fingerprint.prose.summary.product;
  const firstScope = fingerprint.inventory.topology.scopes?.[0]?.id;
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
