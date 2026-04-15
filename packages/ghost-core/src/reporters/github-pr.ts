import type { ReviewIssue, ReviewReport } from "../types.js";

export interface GitHubPRComment {
  path: string;
  line: number;
  side: "RIGHT";
  body: string;
}

/**
 * Format a single issue as a GitHub PR comment body.
 * Uses GitHub's ```suggestion syntax for one-click fixes.
 */
export function formatIssueComment(issue: ReviewIssue): string {
  const parts: string[] = [];

  // Header with rule and dimension
  parts.push(
    `**ghost** \`${issue.rule}\` (${issue.severity}) — ${issue.dimension}`,
  );
  parts.push("");
  parts.push(issue.message);

  if (issue.found && issue.nearest) {
    parts.push("");
    parts.push(
      `Found \`${issue.found}\` — nearest is \`${issue.nearest}\`${issue.nearestRole ? ` (${issue.nearestRole})` : ""}`,
    );
  }

  // Add suggestion block if we have a fix
  if (issue.fix) {
    parts.push("");
    parts.push("```suggestion");
    parts.push(issue.fix.replacement);
    parts.push("```");
  }

  return parts.join("\n");
}

/**
 * Format a ReviewReport as GitHub PR review comments.
 * These can be posted via the GitHub Pulls API (pulls.createReview).
 */
export function formatGitHubPRComments(
  report: ReviewReport,
): GitHubPRComment[] {
  const comments: GitHubPRComment[] = [];

  for (const file of report.files) {
    for (const issue of file.issues) {
      comments.push({
        path: issue.file,
        line: issue.line,
        side: "RIGHT",
        body: formatIssueComment(issue),
      });
    }
  }

  return comments;
}

/**
 * Format a summary comment for the PR review body.
 */
export function formatReviewSummary(report: ReviewReport): string {
  const { summary } = report;

  if (summary.totalIssues === 0) {
    return "**Ghost Design Review** — No design drift detected.";
  }

  const parts: string[] = [];
  parts.push(`**Ghost Design Review** — ${summary.totalIssues} issues found`);
  parts.push("");

  const dimEntries = Object.entries(summary.byDimension);
  if (dimEntries.length > 0) {
    parts.push("| Dimension | Issues |");
    parts.push("|-----------|--------|");
    for (const [dim, count] of dimEntries) {
      parts.push(`| ${dim} | ${count} |`);
    }
    parts.push("");
  }

  if (summary.fixesAvailable > 0) {
    parts.push(
      `${summary.fixesAvailable} fix suggestions available — click "Apply suggestion" to fix inline.`,
    );
  }

  parts.push("");
  parts.push(
    `<sub>Reviewed against fingerprint \`${report.fingerprint}\` in ${report.duration}ms</sub>`,
  );

  return parts.join("\n");
}
