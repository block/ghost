import { cac } from "cac";
import { runInit } from "./commands/init.js";
import { buildHauntManifest } from "./commands/manifest.js";
import { runReview } from "./commands/review.js";
import { runSkillInstall } from "./commands/skill.js";
import { formatReport, runValidate } from "./commands/validate.js";

const VERSION = "0.0.0";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("haunt");

  cli
    .command("init", "Scaffold a .haunt/ package with an example per tier.")
    .option(
      "--package <dir>",
      "The .haunt/ package directory (default: .haunt)",
    )
    .option("--id <id>", "Package id (default: fingerprint)")
    .option("--force", "Overwrite an existing manifest")
    .action(
      async (opts: { package?: string; id?: string; force?: boolean }) => {
        const result = await runInit(opts);
        if (result.code !== 0) {
          process.stderr.write(`Error: ${result.message}\n`);
          process.exitCode = result.code;
          return;
        }
        process.stdout.write(
          `Scaffolded ${result.written.length} files in ${result.dir}:\n`,
        );
        for (const f of result.written) process.stdout.write(`  ${f}\n`);
      },
    );

  cli
    .command("validate", "Validate a .haunt/ package: shape + the edge graph.")
    .option(
      "--package <dir>",
      "The .haunt/ package directory (default: .haunt)",
    )
    .action(async (options: { package?: string }) => {
      const { report, code } = await runValidate({ package: options.package });
      const out = formatReport(report);
      if (code === 0) {
        process.stdout.write(`${out}\n`);
      } else {
        process.stderr.write(`${out}\n`);
      }
      process.exitCode = code;
    });

  cli
    .command(
      "review",
      "Emit an advisory review packet from the .haunt/ package and a git diff.",
    )
    .option(
      "--package <dir>",
      "The .haunt/ package directory (default: .haunt)",
    )
    .option("--base <ref>", "Git ref to diff against (default: HEAD)")
    .option(
      "--diff <patch>",
      "A diff file to embed instead of running git diff. Use '-' for stdin.",
    )
    .option(
      "--json",
      "Emit the raw JSON packet instead of the markdown prompt.",
    )
    .action(
      async (options: {
        package?: string;
        base?: string;
        diff?: string;
        json?: boolean;
      }) => {
        const { output, code } = await runReview(options);
        if (code === 0) {
          process.stdout.write(`${output}\n`);
        } else {
          process.stderr.write(`${output}\n`);
        }
        process.exitCode = code;
      },
    );

  cli
    .command(
      "skill <action>",
      "Install the Haunt skill bundle (action: install).",
    )
    .option(
      "--dest <path>",
      "Install destination (default: agent skills dir + /haunt)",
    )
    .option(
      "--agent <name>",
      "Agent destination when --dest is omitted: claude, cursor, codex, opencode",
    )
    .option("--force", "Overwrite an existing installed Haunt skill")
    .action(
      async (
        action: string,
        opts: { dest?: string; agent?: string; force?: boolean },
      ) => {
        if (action !== "install") {
          process.stderr.write(
            "Error: haunt skill currently supports only `install`\n",
          );
          process.exitCode = 2;
          return;
        }
        try {
          const result = await runSkillInstall(opts);
          if (result.code !== 0) {
            process.stderr.write(`Error: ${result.message}\n`);
            process.exitCode = result.code;
            return;
          }
          process.stdout.write(
            `Wrote ${result.written.length} file${result.written.length === 1 ? "" : "s"} to ${result.outDir}:\n`,
          );
          for (const f of result.written) process.stdout.write(`  ${f}\n`);
        } catch (err) {
          process.stderr.write(
            `Error: ${err instanceof Error ? err.message : String(err)}\n`,
          );
          process.exitCode = 2;
        }
      },
    );

  cli
    .command("manifest", "Emit a self-describing JSON manifest of commands.")
    .action(() => {
      process.stdout.write(
        `${JSON.stringify(buildHauntManifest(VERSION), null, 2)}\n`,
      );
    });

  cli.help();
  cli.version(VERSION);

  return cli;
}
