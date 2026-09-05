import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CAC } from "cac";
import { loadGhostPackage, resolveGhostPackage } from "../package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../review/review-packet.js";
import { exitCli, failFromError } from "./errors.js";
import { parseEnumOption } from "./options.js";

const execFileAsync = promisify(execFile);

export function registerReviewCommand(cli: CAC): void {
  cli
    .command(
      "review",
      "Emit an advisory review packet for a diff using material-backed nodes and checks.",
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
    .action(async (opts) => {
      try {
        const format = parseEnumOption(opts.format, "--format", [
          "markdown",
          "json",
        ] as const);

        const paths = resolveGhostPackage(opts.package, process.cwd());
        const ghostPackage = await loadGhostPackage(paths);
        if (!ghostPackage.hasChecksDir) {
          console.error(
            "No checks directory. Run `ghost checks init` to add review assertions.",
          );
          await exitCli(2);
          return;
        }
        const diffText = await resolveDiff({
          base: opts.base,
          diff: opts.diff,
        });
        const packet = await buildReviewPacket(ghostPackage, diffText, {
          packageDir: paths.packageDir,
          cwd: process.cwd(),
        });
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
