import {
	formatGitHubPRComments,
	formatReviewCLI,
	formatReviewJSON,
	formatReviewSummary,
	review,
} from "@ghost/core";
import { defineCommand } from "citty";

export const reviewCommand = defineCommand({
	meta: {
		name: "review",
		description:
			"Review files for visual language drift against a design fingerprint",
	},
	args: {
		files: {
			type: "positional",
			description: "Files to review (omit to review git diff)",
			required: false,
		},
		fingerprint: {
			type: "string",
			description:
				"Path to fingerprint JSON (default: .ghost-fingerprint.json)",
			alias: "f",
		},
		staged: {
			type: "boolean",
			description: "Review staged changes only",
			default: false,
		},
		base: {
			type: "string",
			description: "Base ref for git diff (default: HEAD)",
			alias: "b",
		},
		format: {
			type: "string",
			description: "Output format: cli, json, github (default: cli)",
			default: "cli",
		},
		dimensions: {
			type: "string",
			description:
				"Comma-separated dimensions to check: palette,spacing,typography,surfaces",
		},
		all: {
			type: "boolean",
			description: "Report issues on all lines, not just changed lines",
			default: false,
		},
	},
	async run({ args }) {
		try {
			// Parse dimensions flag
			let dimensions: Record<string, boolean> | undefined;
			if (args.dimensions) {
				dimensions = {};
				for (const d of (args.dimensions as string).split(",")) {
					const dim = d.trim();
					if (
						dim === "palette" ||
						dim === "spacing" ||
						dim === "typography" ||
						dim === "surfaces"
					) {
						dimensions[dim] = true;
					}
				}
				// Explicitly disable unchecked dimensions
				for (const d of ["palette", "spacing", "typography", "surfaces"]) {
					if (!dimensions[d]) dimensions[d] = false;
				}
			}

			// Build file list from positional arg
			const files =
				args.files && typeof args.files === "string"
					? (args.files as string).split(",").map((f: string) => f.trim())
					: undefined;

			const report = await review({
				files: files && files.length > 0 ? files : undefined,
				diff:
					!files || files.length === 0
						? {
								base: args.base as string | undefined,
								staged: args.staged as boolean,
							}
						: undefined,
				fingerprintPath: args.fingerprint as string | undefined,
				config: {
					dimensions,
					changedLinesOnly: !(args.all as boolean),
				},
			});

			let output: string;
			switch (args.format) {
				case "json":
					output = formatReviewJSON(report);
					break;
				case "github": {
					const comments = formatGitHubPRComments(report);
					const summary = formatReviewSummary(report);
					output = JSON.stringify({ summary, comments }, null, 2);
					break;
				}
				default:
					output = formatReviewCLI(report);
			}

			process.stdout.write(`${output}\n`);
			process.exit(report.summary.errors > 0 ? 1 : 0);
		} catch (err) {
			console.error(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
			process.exit(2);
		}
	},
});
