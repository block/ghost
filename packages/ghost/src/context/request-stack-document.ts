import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { glob } from "tinyglobby";
import { parse as parseYaml } from "yaml";
import type { GhostRelayStackResolverDeclaration } from "./relay-config.js";

export interface RelayRequestStackDocument {
  schema?: string;
  id: string;
  title?: string;
  purpose?: string;
  task_context?: Record<string, unknown>;
  units: string[];
}

export async function discoverRelayRequestStackPaths(
  root: string,
  resolver: GhostRelayStackResolverDeclaration,
): Promise<string[]> {
  const paths = new Set<string>();
  if (resolver.path) paths.add(normalizePath(root, resolver.path));
  if (resolver.files?.length) {
    const matches = await glob(resolver.files, {
      absolute: false,
      cwd: root,
      dot: false,
      onlyFiles: true,
    });
    for (const match of matches) paths.add(match);
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

export async function loadRelayRequestStackDocument(
  root: string,
  stackPath: string,
  resolver: GhostRelayStackResolverDeclaration,
): Promise<
  { ok: true; value: RelayRequestStackDocument } | { ok: false; reason: string }
> {
  let data: unknown;
  try {
    data = parseYaml(await readFile(resolve(root, stackPath), "utf-8"));
  } catch (err) {
    return {
      ok: false,
      reason: `stack file could not be parsed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, reason: "stack file must contain an object" };
  }
  const stack = data as Record<string, unknown>;
  if (resolver.schema && stack.schema !== resolver.schema) {
    return {
      ok: false,
      reason: `stack schema is not ${resolver.schema}`,
    };
  }
  if (!isNonEmptyString(stack.id)) {
    return { ok: false, reason: "stack id is required" };
  }
  if (!Array.isArray(stack.units) || stack.units.length === 0) {
    return { ok: false, reason: "stack units must be a non-empty array" };
  }
  const units = stack.units.filter(isNonEmptyString);
  if (units.length !== stack.units.length) {
    return { ok: false, reason: "stack units must be strings" };
  }
  return {
    ok: true,
    value: {
      schema: isNonEmptyString(stack.schema) ? stack.schema : undefined,
      id: stack.id,
      title: isNonEmptyString(stack.title) ? stack.title : undefined,
      purpose: isNonEmptyString(stack.purpose) ? stack.purpose : undefined,
      task_context: isPlainRecord(stack.task_context)
        ? stack.task_context
        : undefined,
      units,
    },
  };
}

function normalizePath(root: string, path: string): string {
  const absolute = isAbsolute(path) ? path : resolve(root, path);
  return relative(root, absolute).replaceAll(sep, "/") || ".";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
