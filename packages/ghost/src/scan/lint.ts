export type LintSeverity = "error" | "warning" | "info";

export interface LintIssue {
  severity: LintSeverity;
  rule: string;
  message: string;
  /** Dotted path in the file (e.g. "intent.principles[0].evidence"). */
  path?: string;
}

export interface LintReport {
  issues: LintIssue[];
  errors: number;
  warnings: number;
  info: number;
}

export interface LintOptions {
  /** Treat this set of rules as errors instead of their default severity. */
  strict?: string[];
  /** Silence these rules entirely. */
  off?: string[];
}
