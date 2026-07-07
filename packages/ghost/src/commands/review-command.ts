import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import type { CAC } from "cac";
import { resolveFingerprintPackage } from "../fingerprint.js";
import {
  buildReviewPacket,
  formatReviewPacket,
} from "../review/review-packet.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

const execFileAsync = promisify(execFile);

export function registerReviewCommand(cli: CAC): void {
  cli
    .command(
      "review",
      "Emit an advisory review packet for a diff using material-backed nodes and checks.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option("--diff <path>", "Read diff from a file, or '-' for stdin")
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option("--json", "Emit the raw JSON packet")
    .option("--no-probes", "Skip check probe shell commands")
    .action(async (opts) => {
      try {
        const format = opts.json ? "json" : opts.format;
        if (format !== "markdown" && format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const fingerprint = await loadFingerprintPackage(paths);
        if (!fingerprint.hasChecksDir) {
          console.error(
            "No checks directory. Run `ghost checks init` to add review assertions.",
          );
          process.exit(2);
          return;
        }
        const diffText = await resolveDiff({
          base: opts.base,
          diff: opts.diff,
        });
        const packet = await buildReviewPacket(fingerprint, diffText, {
          runProbes: opts.probes !== false,
          cwd: process.cwd(),
        });
        process.stdout.write(
          format === "json"
            ? `${JSON.stringify(packet, null, 2)}\n`
            : formatReviewPacket(packet),
        );
        process.exit(0);
      } catch (err) {
        failFromError(err);
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
