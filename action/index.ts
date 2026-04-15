/**
 * Ghost Design Review — GitHub Action entrypoint.
 *
 * Runs fingerprint-informed review on PR changed files and posts
 * inline suggestions as a GitHub PR review.
 *
 * Usage in workflow:
 *
 *   - uses: block/ghost@v1
 *     with:
 *       github-token: ${{ secrets.GITHUB_TOKEN }}
 *
 * Requires .ghost-fingerprint.json in the repo (run `ghost profile . --emit`).
 */

import * as core from "@actions/core";
import * as github from "@actions/github";
import { review, formatGitHubPRComments, formatReviewSummary } from "@ghost/core";

async function run() {
  try {
    const token = core.getInput("github-token", { required: true });
    const fingerprintPath = core.getInput("fingerprint") || ".ghost-fingerprint.json";
    const deep = core.getInput("deep") === "true";
    const anthropicApiKey = core.getInput("anthropic-api-key") || undefined;
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

    // Run review
    const report = await review({
      diff: { base },
      fingerprintPath,
      config: {
        deep,
        dimensions,
        changedLinesOnly: true,
      },
      llmConfig: deep && anthropicApiKey
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
    core.setFailed(
      error instanceof Error ? error.message : String(error),
    );
  }
}

run();
