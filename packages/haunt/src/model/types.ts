import type { z } from "zod";
import type {
  HauntCheckFrontmatterSchema,
  HauntInventoryFrontmatterSchema,
  HauntPackageManifestSchema,
  HauntSurfaceFrontmatterSchema,
  HauntTenetFrontmatterSchema,
} from "./schema.js";

export type HauntPackageManifest = z.infer<typeof HauntPackageManifestSchema>;

export type HauntTenetFrontmatter = z.infer<typeof HauntTenetFrontmatterSchema>;
export type HauntInventoryFrontmatter = z.infer<
  typeof HauntInventoryFrontmatterSchema
>;
export type HauntSurfaceFrontmatter = z.infer<
  typeof HauntSurfaceFrontmatterSchema
>;
export type HauntCheckFrontmatter = z.infer<typeof HauntCheckFrontmatterSchema>;

/** A parsed document in any tier: flat id + validated frontmatter + prose. */
export interface HauntTenet {
  id: string;
  frontmatter: HauntTenetFrontmatter;
  body: string;
}
export interface HauntInventory {
  id: string;
  frontmatter: HauntInventoryFrontmatter;
  body: string;
}
export interface HauntSurface {
  id: string;
  frontmatter: HauntSurfaceFrontmatter;
  body: string;
}
export interface HauntCheck {
  id: string;
  frontmatter: HauntCheckFrontmatter;
  body: string;
}

/** An exemplar: a shipped decision worth repeating (prose only, for now). */
export interface HauntExemplar {
  id: string;
  body: string;
}

/** The whole `.haunt/` package, loaded and validated per-document. */
export interface HauntPackage {
  manifest: HauntPackageManifest;
  tenets: Map<string, HauntTenet>;
  inventory: Map<string, HauntInventory>;
  surfaces: Map<string, HauntSurface>;
  checks: Map<string, HauntCheck>;
  exemplars: Map<string, HauntExemplar>;
}

export type HauntLintSeverity = "error" | "warning" | "info";

export interface HauntLintIssue {
  severity: HauntLintSeverity;
  rule: string;
  /** Where the issue lives, e.g. `surfaces/checkout` or `checks/foo.grounds`. */
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
