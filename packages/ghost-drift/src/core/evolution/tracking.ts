import { resolve } from "node:path";
import { resolveTarget } from "../config.js";
import {
  EXPRESSION_FILENAME,
  loadExpression,
  parseExpression,
} from "../expression/index.js";
import type { Expression, Target } from "../types.js";

/**
 * Resolve a Target to an Expression.
 *
 * - "path": reads a local expression.md, or a directory containing one.
 * - "url": fetches a remote expression.md
 * - "npm": resolves node_modules/<name>/expression.md
 * - "github": not yet supported for direct resolution (use profile flow instead)
 */
export async function resolveTrackedExpression(
  target: Target,
  cwd: string = process.cwd(),
): Promise<Expression> {
  switch (target.type) {
    case "path": {
      const resolved = resolve(cwd, target.value);
      if (resolved.endsWith(".md")) {
        return readExpressionFile(resolved);
      }
      return readExpressionFromDir(resolved);
    }

    case "url":
    case "registry": {
      const response = await fetch(target.value);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch tracked expression from ${target.value}: ${response.status}`,
        );
      }
      return parseExpression(await response.text()).expression;
    }

    case "npm": {
      return readExpressionFromDir(resolve(cwd, "node_modules", target.value));
    }

    default:
      throw new Error(
        `Cannot resolve tracked expression from target type "${target.type}". Generate one first by running the profile recipe in your host agent (install with "ghost-drift emit skill").`,
      );
  }
}

async function readExpressionFile(path: string): Promise<Expression> {
  try {
    return (await loadExpression(path)).expression;
  } catch (err) {
    throw new Error(
      `Could not read expression at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function readExpressionFromDir(dir: string): Promise<Expression> {
  return readExpressionFile(resolve(dir, EXPRESSION_FILENAME));
}

/**
 * Normalize a config tracks value to a Target.
 * Accepts a Target directly, or a string shorthand resolved via resolveTarget().
 */
export function normalizeTrackedSource(
  value: Target | string | undefined,
): Target | undefined {
  if (!value) return undefined;
  if (typeof value === "string") {
    return resolveTarget(value);
  }
  return value;
}
