import type { CAC } from "cac";
import { EXIT } from "#ghost-core";
import { exitCli, failFromError } from "./errors.js";

/**
 * Parse and run the CLI without leaking parser stack traces to users.
 *
 * cac validates unknown options and required arguments synchronously before it
 * invokes an action. Those failures never reach command-level error handlers,
 * so the executable must translate them into the same stable usage-error
 * contract as errors raised inside an action.
 */
export async function parseCli(
  cli: CAC,
  argv: string[] = process.argv,
): Promise<void> {
  try {
    assertSupportedRuntime();
    const parsed = cli.parse(argv, { run: false });
    assertKnownGlobalOptions(cli);
    const actionResult = cli.runMatchedCommand();
    if (isPromiseLike(actionResult)) await actionResult;

    if (!cli.matchedCommand && parsed.args.length > 0) {
      const command = parsed.args[0];
      await failFromError(
        new CliUsageError(
          `Unknown command '${command}'. Run \`ghost --help\` to list available commands.`,
        ),
      );
      return;
    }
    if (
      !cli.matchedCommand &&
      parsed.args.length === 0 &&
      !parsed.options.help
    ) {
      cli.outputHelp();
      await exitCli(EXIT.ok);
    }
  } catch (err) {
    if (isCliParserError(err)) {
      const command = cli.matchedCommand?.name;
      const helpCommand = command ? `ghost ${command} --help` : "ghost --help";
      const message =
        err instanceof CliUsageError
          ? err.message
          : (removedOptionMessage(err.message) ??
            `${err.message}. Run \`${helpCommand}\` for usage.`);
      await failFromError(new CliUsageError(message));
      return;
    }
    await failFromError(err);
  }
}

function removedOptionMessage(message: string): string | undefined {
  if (message.includes("Unknown option `--template`")) {
    return "--template was removed. The skeleton is now the default; omit the flag.";
  }
  if (message.includes("Unknown option `--reference`")) {
    return "--reference was removed. Add concrete files to node `materials` instead.";
  }
  if (
    message.includes("Unknown option `--with-intent`") ||
    message.includes("Unknown option `--withIntent`")
  ) {
    return "--with-intent was removed. Edit the scaffolded guidance nodes directly.";
  }
  return undefined;
}

export function isSupportedNodeVersion(
  version: string = process.versions.node,
): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-|$)/.exec(version);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return (
    (major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22
  );
}

function assertSupportedRuntime(): void {
  if (isSupportedNodeVersion()) return;
  throw new CliUsageError(
    `ghost requires Node 20.19+ or 22.12+. Current version: ${process.version}. Upgrade Node, then run the command again.`,
  );
}

function assertKnownGlobalOptions(cli: CAC): void {
  if (cli.matchedCommand) return;
  for (const name of Object.keys(cli.options)) {
    if (name !== "--" && !cli.globalCommand.hasOption(name)) {
      throw new CliUsageError(
        `Unknown option \`${name.length > 1 ? `--${name}` : `-${name}`}\`. Run \`ghost --help\` for usage.`,
      );
    }
  }
}

function isCliParserError(err: unknown): err is Error {
  return (
    err instanceof CliUsageError ||
    (err instanceof Error && err.name === "CACError")
  );
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "then" in value &&
    typeof value.then === "function"
  );
}

class CliUsageError extends Error {
  readonly exitCode = EXIT.usage;
}
