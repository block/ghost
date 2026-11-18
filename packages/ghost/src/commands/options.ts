import { UsageError } from "#ghost-core";
import { type GhostPackagePaths, resolveGhostPackage } from "../package.js";
import type { GhostUniversalVersionWarning } from "../scan/cascade.js";

export function parseEnumOption<const T extends readonly string[]>(
  value: unknown,
  option: string,
  allowed: T,
): T[number] {
  if (typeof value === "string" && allowed.includes(value)) {
    return value as T[number];
  }
  throw new UsageError(`${option} must be one of: ${allowed.join(", ")}`);
}

export function resolveUniversalPackage(
  dir: string | undefined,
): GhostPackagePaths | undefined {
  return dir === undefined
    ? undefined
    : resolveGhostPackage(dir, process.cwd());
}

export function warnUniversalVersion(
  warning: GhostUniversalVersionWarning | undefined,
): void {
  if (warning) console.error(`Warning: ${warning.message}`);
}
