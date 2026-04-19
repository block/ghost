/**
 * Ghost Design Review — GitHub Action entrypoint.
 *
 * Runs expression-informed review on PR changed files and posts
 * inline suggestions as a GitHub PR review.
 *
 * Usage in workflow:
 *
 *   - uses: block/ghost@v1
 *     with:
 *       github-token: ${{ secrets.GITHUB_TOKEN }}
 *
 * Requires expression.md in the repo. Run `ghost profile . --emit` to generate one.
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  EXPRESSION_FILENAME,
  formatGitHubPRComments,
  formatReviewSummary,
  review,
} from "@ghost/core";

function resolveExpressionInput(): string {
  return core.getInput("fingerprint") || EXPRESSION_FILENAME;
}

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const expressionPath = resolveExpressionInput();
    const anthropicApiKey =
      core.getInput("anthropic-api-key") || process.env.ANTHROPIC_API_KEY;
    const dimensionsInput = core.getInput("dimensions") || undefined;
    const base = core.getInput("base") || undefined;

    // Parse dimensions
    let dimensions: Record<string, boolean> | undefined;
    if (dimensionsInput) {
      dimensions = {};
      for (const d of dimensionsInput.split(",")) {
        const dim = d.trim();
        if (["palette", "spacing", "typography", "surfaces"].includes(dim)) {
          dimensions[dim] = true;
        }
      }
      for (const d of ["palette", "spacing", "typography", "surfaces"]) {
        if (!dimensions[d]) dimensions[d] = false;
      }
    }

    const report = await review({
      diff: { base },
      expressionPath,
      config: {
        dimensions,
        changedLinesOnly: true,
      },
      llmConfig: anthropicApiKey
        ? { provider: "anthropic", apiKey: anthropicApiKey }
        : undefined,
    });

    // Set outputs
    core.setOutput("issues-found", report.summary.totalIssues.toString());
    core.setOutput("has-errors", (report.summary.errors > 0).toString());

    // Post PR review if we have issues and a PR context
    const context = github.context;
    if (context.payload.pull_request && report.summary.totalIssues > 0) {
      const octokit = github.getOctokit(token);
      const comments = formatGitHubPRComments(report);
      const summaryBody = formatReviewSummary(report);

      await octokit.rest.pulls.createReview({
        owner: context.repo.owner,
        repo: context.repo.repo,
        pull_number: context.payload.pull_request.number,
        event: "COMMENT",
        body: summaryBody,
        comments: comments.map((c) => ({
          path: c.path,
          line: c.line,
          side: c.side,
          body: c.body,
        })),
      });

      core.info(`Posted review with ${comments.length} inline comments.`);
    } else if (report.summary.totalIssues === 0) {
      core.info("No design drift detected.");
    }

    // Fail the action if errors found
    if (report.summary.errors > 0) {
      core.setFailed(
        `Ghost found ${report.summary.errors} design drift errors.`,
      );
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
