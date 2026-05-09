import { execFileSync } from "node:child_process";
import type { GhostDriftCheckFinding, GhostDriftCheckReport } from "./check.js";
import { runGhostDriftCheck } from "./check.js";
import type { GhostDriftRepairHint } from "./repair-hints.js";

const SUMMARY_MARKER = "<!-- Ghost Drift Summary -->";
const INLINE_MARKER = "<!-- Ghost Drift Inline -->";

interface GitHubIssueComment {
  id: number;
  body?: string;
  html_url?: string;
}

interface GitHubPullRequest {
  head: {
    sha: string;
  };
}

interface GitHubReviewComment {
  id: number;
  body?: string;
  html_url?: string;
}

export interface GhostDriftGitHubCommentOptions {
  repo: string;
  pr: number;
  cwd?: string;
  packageDir?: string;
  base?: string;
  diffText?: string;
  dryRun?: boolean;
}

export interface GhostDriftGroupedFinding {
  key: string;
  check_id: string;
  title: string;
  severity: GhostDriftCheckFinding["severity"];
  path: string;
  line: number;
  matches: string[];
  repair?: string;
  repair_hints: GhostDriftRepairHint[];
}

export interface GhostDriftGitHubCommentResult {
  report: GhostDriftCheckReport;
  grouped_findings: GhostDriftGroupedFinding[];
  summary_body: string;
  inline_comments: Array<{
    path: string;
    line: number;
    body: string;
    html_url?: string;
  }>;
  summary_comment_url?: string;
}

export async function runGhostDriftGitHubComment(
  options: GhostDriftGitHubCommentOptions,
): Promise<GhostDriftGitHubCommentResult> {
  const report = await runGhostDriftCheck({
    cwd: options.cwd,
    packageDir: options.packageDir,
    base: options.base,
    diffText: options.diffText,
  });
  const groupedFindings = groupGhostDriftFindings(report.findings);
  const summaryBody = buildGitHubSummaryComment(report, groupedFindings);
  const inlineComments = groupedFindings.map((group) => ({
    path: group.path,
    line: group.line,
    body: buildGitHubInlineComment(group),
  }));

  if (options.dryRun) {
    return {
      report,
      grouped_findings: groupedFindings,
      summary_body: summaryBody,
      inline_comments: inlineComments,
    };
  }

  const postedInlineComments = postInlineComments(
    options.repo,
    options.pr,
    groupedFindings,
  );
  const summaryComment = createOrUpdateSummaryComment(
    options.repo,
    options.pr,
    summaryBody,
  );

  return {
    report,
    grouped_findings: groupedFindings,
    summary_body: summaryBody,
    inline_comments: postedInlineComments,
    summary_comment_url: summaryComment.html_url,
  };
}

export function groupGhostDriftFindings(
  findings: GhostDriftCheckFinding[],
): GhostDriftGroupedFinding[] {
  const groups = new Map<string, GhostDriftGroupedFinding>();

  for (const finding of findings) {
    const repairHints = finding.repair_hints ?? [];
    const key = Buffer.from(
      [
        finding.path,
        finding.line,
        finding.check_id,
        JSON.stringify(repairHints),
        finding.repair ?? "",
      ].join("\0"),
    ).toString("base64url");
    const group =
      groups.get(key) ??
      ({
        key,
        check_id: finding.check_id,
        title: finding.title,
        severity: finding.severity,
        path: finding.path,
        line: finding.line,
        matches: [],
        repair: finding.repair,
        repair_hints: repairHints,
      } satisfies GhostDriftGroupedFinding);

    if (finding.match && !group.matches.includes(finding.match)) {
      group.matches.push(finding.match);
    }

    groups.set(key, group);
  }

  return [...groups.values()];
}

export function buildGitHubSummaryComment(
  report: GhostDriftCheckReport,
  groupedFindings = groupGhostDriftFindings(report.findings),
): string {
  const heading = [SUMMARY_MARKER, "🤖 **Ghost drift check**"];
  const base = report.base ?? "working tree";

  if (report.findings.length === 0) {
    return [
      ...heading,
      "",
      `No deterministic design drift found against \`${base}\`.`,
      "",
      `<sub>Ran \`ghost-drift check --base ${base} --format json\`.</sub>`,
    ].join("\n");
  }

  const targets = groupedFindings.map((group) => {
    const matches =
      group.matches.length > 0 ? ` — ${formatMatches(group.matches)}` : "";
    return `- \`${lineRef(group)}\`${matches}`;
  });

  return [
    ...heading,
    "",
    `Found ${report.findings.length} deterministic drift match(es) across ${groupedFindings.length} changed line(s) against \`${base}\`.`,
    "",
    "Inline review target(s):",
    ...targets,
    "",
    `<sub>Ran \`ghost-drift check --base ${base} --format json\`.</sub>`,
  ].join("\n");
}

export function buildGitHubInlineComment(
  group: GhostDriftGroupedFinding,
): string {
  const hiddenKey = `<!-- Ghost Drift Key: ${group.key} -->`;
  const lines = [
    INLINE_MARKER,
    hiddenKey,
    "🤖 **Ghost drift check**",
    "",
    `**${group.title}**`,
  ];

  if (group.matches.length > 0) {
    lines.push("", `Matched: ${formatMatches(group.matches)}.`);
  }

  for (const hint of group.repair_hints) {
    lines.push(
      "",
      `Use instead: \`${hint.replacement}\``,
      `Why: ${hint.reason}`,
      formatSources(hint),
    );
  }

  if (group.repair_hints.length === 0 && group.repair) {
    lines.push("", `Repair: ${group.repair}`);
  }

  return lines.join("\n");
}

export function formatGitHubCommentDryRun(
  result: GhostDriftGitHubCommentResult,
): string {
  const lines = [result.summary_body];
  for (const inline of result.inline_comments) {
    lines.push(
      "",
      `--- Inline comment: ${inline.path}:${inline.line} ---`,
      "",
      inline.body,
    );
  }
  return `${lines.join("\n")}\n`;
}

function postInlineComments(
  repo: string,
  pr: number,
  groups: GhostDriftGroupedFinding[],
): GhostDriftGitHubCommentResult["inline_comments"] {
  if (groups.length === 0) return [];

  const pullRequest = ghApi<GitHubPullRequest>(repo, [
    `repos/${repo}/pulls/${pr}`,
  ]);
  const existingComments = ghApi<GitHubReviewComment[]>(repo, [
    `repos/${repo}/pulls/${pr}/comments?per_page=100`,
  ]);

  return groups.map((group) => {
    const body = buildGitHubInlineComment(group);
    const existing = findExistingInlineComment(existingComments, group);
    const comment = existing
      ? ghApi<GitHubReviewComment>(repo, [
          "-X",
          "PATCH",
          `repos/${repo}/pulls/comments/${existing.id}`,
          "--field",
          `body=${body}`,
        ])
      : ghApi<GitHubReviewComment>(repo, [
          "-X",
          "POST",
          `repos/${repo}/pulls/${pr}/comments`,
          "--field",
          `body=${body}`,
          "--field",
          `commit_id=${pullRequest.head.sha}`,
          "--field",
          `path=${group.path}`,
          "--field",
          "side=RIGHT",
          "--field",
          `line=${group.line}`,
        ]);

    return {
      path: group.path,
      line: group.line,
      body,
      html_url: comment.html_url,
    };
  });
}

function createOrUpdateSummaryComment(
  repo: string,
  pr: number,
  body: string,
): GitHubIssueComment {
  const existing = ghApi<GitHubIssueComment[]>(repo, [
    `repos/${repo}/issues/${pr}/comments?per_page=100`,
  ]).find((comment) => comment.body?.includes(SUMMARY_MARKER));

  if (existing) {
    return ghApi<GitHubIssueComment>(repo, [
      "-X",
      "PATCH",
      `repos/${repo}/issues/comments/${existing.id}`,
      "--field",
      `body=${body}`,
    ]);
  }

  return ghApi<GitHubIssueComment>(repo, [
    "-X",
    "POST",
    `repos/${repo}/issues/${pr}/comments`,
    "--field",
    `body=${body}`,
  ]);
}

function findExistingInlineComment(
  comments: GitHubReviewComment[],
  group: GhostDriftGroupedFinding,
): GitHubReviewComment | undefined {
  const hiddenKey = `<!-- Ghost Drift Key: ${group.key} -->`;

  return comments.find(
    (comment) =>
      comment.body?.includes(INLINE_MARKER) && comment.body.includes(hiddenKey),
  );
}

function ghApi<T>(repo: string, args: string[]): T {
  try {
    const stdout = execFileSync("gh", ["api", ...args], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
    });
    return JSON.parse(stdout) as T;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `GitHub API request failed for ${repo}. Run \`gh auth login -h github.com\`, then retry. ${message}`,
    );
  }
}

function lineRef(group: GhostDriftGroupedFinding): string {
  return `${group.path}:${group.line}`;
}

function formatMatches(matches: string[]): string {
  return matches.map((match) => `\`${truncate(match)}\``).join(", ");
}

function formatSources(hint: GhostDriftRepairHint): string {
  const sources = hint.sources?.length ? hint.sources : [hint.source];
  const label = sources.length > 1 ? "Sources" : "Source";
  return `${label}: ${sources
    .map(
      (source) => `\`${source.path}${source.line ? `:${source.line}` : ""}\``,
    )
    .join(", ")}`;
}

function truncate(value: string): string {
  return value.length > 120 ? `${value.slice(0, 117)}...` : value;
}
