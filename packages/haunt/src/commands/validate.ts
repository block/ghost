import { resolve } from "node:path";
import { loadFingerprint } from "../fingerprint/load.js";
import { validateHauntGraph } from "../graph/validate.js";
import type { HauntLintReport } from "../model/types.js";
import { loadHauntPackage } from "../scan/load-package.js";

export interface ValidateOptions {
  /** The `.haunt/` package directory (default: `.haunt` under cwd). */
  package?: string;
  /** The `.ghost/` fingerprint package dir (default: .ghost / GHOST_PACKAGE_DIR). */
  ghostDir?: string;
}

/** Merge two reports (load + graph) into one. */
function merge(a: HauntLintReport, b: HauntLintReport): HauntLintReport {
  const issues = [...a.issues, ...b.issues];
  return {
    issues,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
  };
}

/**
 * Run `haunt validate`: load the package (shape) then validate references —
 * local against inventory, fingerprint-shaped against the `.ghost/` catalog
 * when one resolves (absent/broken fingerprint is tolerated here; `review` is
 * where it hard-fails). Returns the combined report and an exit code (0
 * clean/warnings, 1 on errors).
 */
export async function runValidate(
  options: ValidateOptions,
): Promise<{ report: HauntLintReport; code: number }> {
  const dir = resolve(process.cwd(), options.package ?? ".haunt");
  const { pkg, report: loadReport } = await loadHauntPackage(dir);

  if (pkg === null) {
    return { report: loadReport, code: 1 };
  }

  const fingerprint = await loadFingerprint({ ghostDir: options.ghostDir });
  const graphReport = validateHauntGraph(pkg, fingerprint);
  const report = merge(loadReport, graphReport);
  return { report, code: report.errors > 0 ? 1 : 0 };
}

/** Human-readable rendering of a report. */
export function formatReport(report: HauntLintReport): string {
  if (report.issues.length === 0) {
    return "✓ haunt package is valid — no issues.";
  }
  const lines = report.issues.map((i) => {
    const mark =
      i.severity === "error" ? "✗" : i.severity === "warning" ? "!" : "·";
    return `${mark} [${i.severity}] ${i.where}: ${i.message} (${i.rule})`;
  });
  lines.push(
    "",
    `${report.errors} error(s), ${report.warnings} warning(s), ${report.info} info.`,
  );
  return lines.join("\n");
}
