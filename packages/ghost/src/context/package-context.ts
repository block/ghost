import { parse as parseYaml } from "yaml";
import {
  type GhostFingerprintDocument,
  type GhostValidateDocument,
  GhostValidateSchema,
  lintGhostValidate,
} from "#ghost-core";
import { readOptionalUtf8 } from "../internal/fs.js";
import {
  type FingerprintPackagePaths,
  loadFingerprintPackage,
} from "../scan/fingerprint-package.js";

export interface PackageContext {
  name: string;
  packageDir?: string;
  targetPaths?: string[];
  stackDirs?: string[];
  fingerprint: GhostFingerprintDocument;
  fingerprintRaw: string;
  fingerprintLayers?: {
    manifest: string;
    intent?: string;
    inventory?: string;
    composition?: string;
  };
  checks?: GhostValidateDocument;
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
    packageDir: paths.dir,
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
): GhostValidateDocument {
  const parsed = parseYamlSafe(raw, "validate.yml");
  const report = lintGhostValidate(parsed, { fingerprint });
  if (report.errors > 0) {
    const first = report.issues.find((issue) => issue.severity === "error");
    const suffix = first?.path ? ` @ ${first.path}` : "";
    throw new Error(
      `validate.yml failed lint with ${report.errors} error(s): ${
        first?.message ?? "invalid checks"
      }${suffix}`,
    );
  }

  const result = GhostValidateSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("validate.yml failed schema validation.");
  }
  return result.data as GhostValidateDocument;
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
  if (fingerprint.intent.summary.product)
    return fingerprint.intent.summary.product;
  return "ghost-package";
}

function sanitizeName(value: string): string {
  const name = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return name || "ghost-package";
}
