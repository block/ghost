import { parse as parseYaml } from "yaml";
import type { GhostFingerprintDocument } from "#ghost-core";
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
}

export async function loadPackageContext(
  paths: FingerprintPackagePaths,
  nameOverride?: string,
): Promise<PackageContext> {
  const loaded = await loadFingerprintPackage(paths);

  const fingerprint = loaded.fingerprint;
  return {
    name: sanitizeName(nameOverride ?? inferPackageName(fingerprint)),
    packageDir: paths.dir,
    fingerprint,
    fingerprintRaw: JSON.stringify(fingerprint, null, 2),
    fingerprintLayers: {
      manifest: loaded.manifestRaw,
      ...loaded.layerRaw,
    },
  };
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
