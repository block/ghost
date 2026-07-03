import type { CAC } from "cac";
import { resolveFingerprintPackage } from "../fingerprint.js";
import {
  addHaunt,
  listHauntTemplates,
  listInstalledHaunts,
  removeHaunt,
} from "../scan/haunt-scaffold.js";
import { failFromError } from "./errors.js";

/**
 * `ghost haunt <action> [id]` — manage optional haunts attached to the
 * fingerprint. A haunt is a capability directory under `.ghost/haunts/<id>/`
 * anchored by a thin `haunt.yml`. Core init stays fingerprint-only; haunts are
 * always opt-in.
 */
export function registerHauntCommand(cli: CAC): void {
  cli
    .command("haunt <action> [id]", "Manage haunts: add, remove, or list.")
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (action: string, id: string | undefined, opts) => {
      try {
        if (opts.format !== "cli" && opts.format !== "json") {
          console.error("Error: --format must be 'cli' or 'json'");
          process.exit(2);
          return;
        }
        const paths = resolveFingerprintPackage(opts.package, process.cwd());

        if (action === "list") {
          const installed = await listInstalledHaunts(paths.packageDir);
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify(
                { installed, available: listHauntTemplates() },
                null,
                2,
              )}\n`,
            );
          } else {
            process.stdout.write(
              installed.length > 0
                ? `Haunting this fingerprint: ${installed.join(", ")}\n`
                : "No haunts installed.\n",
            );
            process.stdout.write("Available:\n");
            for (const template of listHauntTemplates()) {
              process.stdout.write(
                `  ${template.id} — ${template.description}\n`,
              );
            }
          }
          process.exit(0);
          return;
        }

        if (action === "add") {
          requireId(action, id);
          const result = await addHaunt(paths.packageDir, id as string);
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify(
                { added: id, dir: result.dir, written: result.written },
                null,
                2,
              )}\n`,
            );
          } else {
            process.stdout.write(`Added haunt '${id}': ${result.dir}\n`);
            for (const file of result.written) {
              process.stdout.write(`  ${file}\n`);
            }
          }
          process.exit(0);
          return;
        }

        if (action === "remove") {
          requireId(action, id);
          const dir = await removeHaunt(paths.packageDir, id as string);
          if (opts.format === "json") {
            process.stdout.write(
              `${JSON.stringify({ removed: id, dir }, null, 2)}\n`,
            );
          } else {
            process.stdout.write(`Removed haunt '${id}': ${dir}\n`);
          }
          process.exit(0);
          return;
        }

        console.error(
          "Error: ghost haunt supports `add <id>`, `remove <id>`, and `list`",
        );
        process.exit(2);
      } catch (err) {
        failFromError(err);
      }
    });
}

function requireId(action: string, id: string | undefined): void {
  if (id === undefined || id.length === 0) {
    console.error(`Error: ghost haunt ${action} requires a haunt id`);
    process.exit(2);
  }
}
