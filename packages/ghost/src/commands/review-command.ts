import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CAC } from "cac";
import { resolveGhostPackage } from "../package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../review/review-packet.js";
import { lintCheckReferences } from "../scan/check-reference-lint.js";
import { loadGhostPackage } from "../scan/fingerprint-package.js";
import { exitCli, failFromError } from "./errors.js";

const execFileAsync = promisify(execFile);

export function registerReviewCommand(cli: CAC): void {
  cli
    .command(
      "review [...checkIds]",
      "Emit a one-shot grounded review packet for a diff using checks and cited guidance.",
    )
    .option(
      "--package <dir>",
      "Use this ghost package directory (default: ./.ghost)",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option("--diff <path>", "Read diff from a file, or '-' for stdin")
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option(
      "--no-materials",
      "Emit material locators only; do not inline files",
    )
    .action(async (checkIds: string[], opts) => {
      try {
        const format = opts.format;
        if (format !== "markdown" && format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          await exitCli(2);
          return;
        }

        const paths = resolveGhostPackage(opts.package, process.cwd());
        const ghostPackage = await loadGhostPackage(paths);
        if (!ghostPackage.hasChecksDir) {
          console.error(
            "No checks directory. Run `ghost checks init` to add grounded review assertions.",
          );
          await exitCli(2);
          return;
        }
        if (ghostPackage.invalidChecks.length > 0) {
          for (const invalid of ghostPackage.invalidChecks) {
            console.error(`${invalid.file}: ${invalid.message}`);
          }
          console.error("Run `ghost validate` to see every check issue.");
          await exitCli(1);
          return;
        }
        const referenceIssues = lintCheckReferences(
          ghostPackage.catalog,
          ghostPackage.checks,
        );
        if (referenceIssues.length > 0) {
          for (const issue of referenceIssues) {
            console.error(
              `${issue.file}: ${issue.reference}: ${issue.message}`,
            );
          }
          console.error("Run `ghost validate` to see every check issue.");
          await exitCli(1);
          return;
        }

        const diffText = await resolveDiff({
          base: opts.base,
          diff: opts.diff,
        });
        const packet = await buildReviewPacket(ghostPackage, diffText, {
          packageDir: paths.packageDir,
          cwd: process.cwd(),
          ids: checkIds,
          inlineMaterials: opts.materials !== false,
        });

        for (const miss of packet.missed ?? []) {
          const hint =
            miss.suggested.length > 0
              ? ` (did you mean ${miss.suggested.map((s) => `\`${s}\``).join(", ")}?)`
              : "";
          console.error(`Warning: unknown check \`${miss.requested}\`${hint}`);
        }
        if ((packet.missed?.length ?? 0) > 0) {
          console.error(
            "Run `ghost review` without ids to include every check.",
          );
        }
        if (checkIds.length > 0 && packet.checks.length === 0) {
          await exitCli(2);
          return;
        }
        if (ghostPackage.checks.size === 0) {
          console.error(
            "No checks found in .ghost/checks/; emitting a packet with zero checks.",
          );
        }

        process.stdout.write(
          format === "json"
            ? `${JSON.stringify(packet, null, 2)}\n`
            : formatReviewPacket(packet),
        );
        await exitCli(0);
      } catch (err) {
        await failFromError(err);
      }
    });
}

async function resolveDiff(options: {
  base?: string;
  diff?: string;
}): Promise<string> {
  if (options.diff === "-") return readStdin();
  if (options.diff !== undefined) {
    return readFile(resolve(process.cwd(), options.diff), "utf8");
  }
  const base = options.base ?? "HEAD";
  const { stdout } = await execFileAsync("git", ["diff", base], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

function readStdin(): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolvePromise(data));
    process.stdin.on("error", reject);
  });
}
