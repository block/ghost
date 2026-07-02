import type { GhostCheckFrontmatter } from "@anarchitecture/ghost-fingerprint/core";
import type { z } from "zod";
import type { HauntInventoryFrontmatterSchema } from "./schema.js";

export type HauntInventoryFrontmatter = z.infer<
  typeof HauntInventoryFrontmatterSchema
>;

/** A parsed inventory entry: flat id + validated frontmatter + prose. */
export interface HauntInventory {
  id: string;
  frontmatter: HauntInventoryFrontmatter;
  body: string;
}

/**
 * A haunt check is a `ghost.check/v1` document (parsed and linted by
 * ghost-core) plus the haunt-side `references` edge: the local inventory ids
 * and fingerprint node targets the check enforces.
 */
export interface HauntCheck {
  id: string;
  frontmatter: GhostCheckFrontmatter;
  /** Raw reference strings, classified lazily (see `classifyReference`). */
  references: string[];
  body: string;
}

/**
 * The whole `.ghost/haunt/` package, loaded and validated per-document. Haunt
 * has no manifest of its own — the fingerprint's `manifest.yml` is the only
 * anchor; a haunt package is just the `haunt/` dir with inventory + checks.
 */
export interface HauntPackage {
  inventory: Map<string, HauntInventory>;
  checks: Map<string, HauntCheck>;
}

export type HauntLintSeverity = "error" | "warning" | "info";

export interface HauntLintIssue {
  severity: HauntLintSeverity;
  rule: string;
  /** Where the issue lives, e.g. `inventory/modals` or `checks/foo.references`. */
  where: string;
  message: string;
}

export interface HauntLintReport {
  issues: HauntLintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export function finalizeReport(issues: HauntLintIssue[]): HauntLintReport {
  return {
    issues,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}
