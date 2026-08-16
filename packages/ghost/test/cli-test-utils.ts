import { Readable } from "node:stream";
import { vi } from "vitest";
import { buildCli } from "../src/cli.js";

export async function runCli(
  argv: string[],
  cwd: string,
  options: {
    allowNoExit?: boolean;
    env?: Record<string, string | undefined>;
    stdin?: string;
  } = {},
) {
  const cli = buildCli();
  const previousCwd = process.cwd();
  const previousEnv = new Map<string, string | undefined>();
  let stdout = "";
  let stderr = "";
  let exitCode: number | undefined;
  let finish: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    finish = resolve;
  });

  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stdout += chunk.toString();
      if (typeof callback === "function") callback();
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array, callback?: unknown) => {
      stderr += chunk.toString();
      if (typeof callback === "function") callback();
      return true;
    });
  const logSpy = vi.spyOn(console, "log").mockImplementation((...args) => {
    stdout += `${args.join(" ")}\n`;
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => {
    stderr += `${args.join(" ")}\n`;
  });
  const exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
    exitCode = typeof code === "number" ? code : 0;
    finish();
    return undefined as never;
  });
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process, "stdin");

  try {
    process.chdir(cwd);
    if (options.stdin !== undefined) {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: Readable.from([options.stdin]),
      });
    }
    if (options.env) {
      for (const [key, value] of Object.entries(options.env)) {
        previousEnv.set(key, process.env[key]);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
    cli.parse(["node", "ghost", ...argv]);
    if (options.allowNoExit) setTimeout(finish, 500);
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command did not exit")), 2000),
      ),
    ]);
  } finally {
    process.chdir(previousCwd);
    for (const [key, value] of previousEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    if (options.stdin !== undefined && stdinDescriptor) {
      Object.defineProperty(process, "stdin", stdinDescriptor);
    }
  }

  return { stdout, stderr, code: exitCode ?? 0 };
}
