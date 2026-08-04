import { EXIT } from "#ghost-core";

function flushStream(stream: NodeJS.WriteStream): Promise<void> {
  return new Promise((resolve) => {
    stream.write("", () => resolve());
  });
}

export async function exitCli(code: number): Promise<never> {
  await flushStream(process.stdout);
  await flushStream(process.stderr);
  process.exit(code);
}

/**
 * Report a thrown error and exit. A `UsageError` (or anything carrying a numeric
 * `exitCode`) exits with that code; everything else is an unexpected crash and
 * exits `1`. Pass `stream` to match a command's existing output channel.
 */
export async function failFromError(
  err: unknown,
  stream: "stderr" | "stdout" = "stderr",
): Promise<never> {
  const message = err instanceof Error ? err.message : String(err);
  const line = `Error: ${message}\n`;
  if (stream === "stdout") process.stdout.write(line);
  else process.stderr.write(line);

  const exitCode =
    typeof (err as { exitCode?: unknown })?.exitCode === "number"
      ? (err as { exitCode: number }).exitCode
      : EXIT.failure;
  return exitCli(exitCode);
}
