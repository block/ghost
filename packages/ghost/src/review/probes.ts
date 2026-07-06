import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const DEFAULT_PROBE_TIMEOUT_MS = 30_000;
const DEFAULT_PROBE_TRUNCATE_CHARS = 4_000;

export interface ProbeEvidence {
  command: string;
  timedOut: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
}

export async function runProbe(
  command: string,
  options: {
    cwd: string;
    timeoutMs?: number;
    truncateChars?: number;
  },
): Promise<ProbeEvidence> {
  const timeout = options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS;
  const truncateChars = options.truncateChars ?? DEFAULT_PROBE_TRUNCATE_CHARS;
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      timeout,
      maxBuffer: 8 * 1024 * 1024,
    });
    return {
      command,
      timedOut: false,
      exitCode: 0,
      stdout: truncate(stdout, truncateChars),
      stderr: truncate(stderr, truncateChars),
    };
  } catch (err) {
    const error = err as {
      code?: number | string;
      signal?: string;
      killed?: boolean;
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    const timedOut = error.signal === "SIGTERM" || error.killed === true;
    return {
      command,
      timedOut,
      exitCode: typeof error.code === "number" ? error.code : null,
      stdout: truncate(streamToString(error.stdout), truncateChars),
      stderr: truncate(streamToString(error.stderr), truncateChars),
    };
  }
}

function streamToString(value: string | Buffer | undefined): string {
  if (value === undefined) return "";
  return Buffer.isBuffer(value) ? value.toString("utf8") : value;
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}\n… truncated to ${limit} characters`;
}
