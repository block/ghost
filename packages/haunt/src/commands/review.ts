import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { loadHauntPackage } from "../scan/load-package.js";
import {
  buildReviewPacket,
  formatReviewPacket,
  type ReviewPacket,
} from "./review-packet.js";

const execFileAsync = promisify(execFile);

export interface ReviewOptions {
  package?: string;
  /** Git ref to diff against (default: HEAD). */
  base?: string;
  /** A diff file to embed instead of running git; "-" reads stdin. */
  diff?: string;
  /** Emit the raw JSON packet instead of the markdown prompt. */
  json?: boolean;
}

export interface ReviewResult {
  packet: ReviewPacket | null;
  output: string;
  code: number;
}

/** Read the diff from --diff (file or "-" for stdin) or `git diff <base>`. */
async function resolveDiff(options: ReviewOptions): Promise<string> {
  if (options.diff === "-") {
    return readStdin();
  }
  if (options.diff) {
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

/**
 * Run `haunt review`: load + (implicitly) trust the package, resolve the diff,
 * build the advisory packet. Returns the rendered output and an exit code. The
 * packet is advisory — findings are the agent's job.
 */
export async function runReview(options: ReviewOptions): Promise<ReviewResult> {
  const dir = resolve(process.cwd(), options.package ?? ".haunt");
  const { pkg, report } = await loadHauntPackage(dir);
  if (pkg === null) {
    const lines = report.issues.map(
      (i) => `${i.severity} ${i.where}: ${i.message}`,
    );
    return {
      packet: null,
      output: `Cannot review: package failed to load.\n${lines.join("\n")}`,
      code: 1,
    };
  }

  const diffText = await resolveDiff(options);
  const packet = buildReviewPacket(pkg, diffText);
  const output = options.json
    ? JSON.stringify(packet, null, 2)
    : formatReviewPacket(packet);
  return { packet, output, code: 0 };
}
