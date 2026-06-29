import { EXIT } from "#ghost-core";

/**
 * Report a thrown error and exit. A `UsageError` (or anything carrying a numeric
 * `exitCode`) exits with that code; everything else is an unexpected crash and
 * exits `1`. Pass `stream` to match a command's existing output channel.
 */
export function failFromError(
  err: unknown,
  stream: "stderr" | "stdout" = "stderr",
): never {
  const message = err instanceof Error ? err.message : String(err);
  const line = `Error: ${message}\n`;
  if (stream === "stdout") process.stdout.write(line);
  else process.stderr.write(line);

  const exitCode =
    typeof (err as { exitCode?: unknown })?.exitCode === "number"
      ? (err as { exitCode: number }).exitCode
      : EXIT.failure;
  process.exit(exitCode);
}
