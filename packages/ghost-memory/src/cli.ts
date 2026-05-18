import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundle } from "@ghost/core";
import { cac } from "cac";

const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("./skill-bundle", import.meta.url),
);

const DEFAULT_SKILL_OUT = ".claude/skills/ghost-memory";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost-memory");

  cli
    .command(
      "emit <kind>",
      "Emit the ghost-memory agentskills.io bundle (kind: skill).",
    )
    .option(
      "-o, --out <path>",
      `Output directory (default: ${DEFAULT_SKILL_OUT})`,
    )
    .action(async (kind: string, opts) => {
      try {
        if (kind !== "skill") {
          console.error(
            `Error: unknown emit kind '${kind}'. Supported: skill.`,
          );
          process.exit(2);
          return;
        }

        const outDir = resolve(
          process.cwd(),
          (opts.out as string | undefined) ?? DEFAULT_SKILL_OUT,
        );
        const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
        const written: string[] = [];
        for (const file of bundle) {
          const outPath = resolve(outDir, file.path);
          await mkdir(dirname(outPath), { recursive: true });
          await writeFile(outPath, file.content, "utf-8");
          written.push(file.path);
        }
        process.stdout.write(
          `Wrote ${written.length} file${written.length === 1 ? "" : "s"} to ${outDir}:\n`,
        );
        for (const f of written) process.stdout.write(`  ${f}\n`);
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });

  cli.help();
  cli.version(readPackageVersion());

  return cli;
}

function readPackageVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(
    readFileSync(resolve(here, "../package.json"), "utf8"),
  );
  return pkg.version as string;
}
