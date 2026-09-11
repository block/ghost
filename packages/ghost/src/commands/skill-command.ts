import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CAC } from "cac";
import { loadSkillBundle, UsageError } from "#ghost-core";
import { exitCli, failFromError } from "./errors.js";
import { parseEnumOption } from "./options.js";
import { checkSkillInstall, formatSkillCheckResult } from "./skill-check.js";

// The bundle assets are copied to `dist/skill-bundle` (sibling of `commands/`).
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("../skill-bundle", import.meta.url),
);

const SUPPORTED_AGENTS = [
  "claude",
  "cursor",
  "codex",
  "opencode",
  "goose",
] as const;
type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

export function registerSkillCommand(cli: CAC): void {
  cli
    .command(
      "skill <action>",
      "Install or check the unified ghost skill bundle.",
    )
    .option(
      "--dest <path>",
      "Install/check destination (default: detected agent skills directory + /ghost)",
    )
    .option(
      "--agent <name>",
      "Agent destination to use when --dest is omitted: claude, cursor, codex, opencode, goose",
    )
    .option(
      "--force",
      "Overwrite an existing installed ghost skill (install only)",
    )
    .action(async (action: string, opts) => {
      try {
        if (action !== "install" && action !== "check") {
          throw new UsageError(
            "ghost skill supports only `install` and `check`",
          );
        }
        if (action === "check" && opts.force !== undefined) {
          throw new UsageError(
            "ghost skill check does not accept --force; omit it to check without writing, or use ghost skill install --force to reinstall.",
          );
        }

        if (
          opts.dest !== undefined &&
          (typeof opts.dest !== "string" || !opts.dest.trim())
        ) {
          throw new UsageError(
            "--dest must be a nonempty path; pass --dest <path> or omit it to use the agent destination.",
          );
        }
        const agent = parseAgent(opts.agent);
        const outDir = resolve(
          process.cwd(),
          typeof opts.dest === "string"
            ? opts.dest
            : `${agentSkillDir(agent ?? detectAgent())}/ghost`,
        );
        const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);

        if (action === "check") {
          const result = await checkSkillInstall(outDir, bundle);
          process.stdout.write(formatSkillCheckResult(result));
          await exitCli(result.matches ? 0 : 1);
          return;
        }

        if (existsSync(resolve(outDir, "SKILL.md")) && !opts.force) {
          console.error(
            `Error: ${outDir} already contains SKILL.md. Pass --force to reinstall.`,
          );
          await exitCli(3);
          return;
        }

        if (opts.force && existsSync(resolve(outDir, "SKILL.md"))) {
          await rm(resolve(outDir, "SKILL.md"), { force: true });
          await rm(resolve(outDir, "references"), {
            recursive: true,
            force: true,
          });
        }

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
        for (const file of written) process.stdout.write(`  ${file}\n`);
        await exitCli(0);
      } catch (err) {
        await failFromError(err);
      }
    });
}

function parseAgent(raw: unknown): SupportedAgent | undefined {
  if (raw === undefined) return undefined;
  return parseEnumOption(raw, "--agent", SUPPORTED_AGENTS);
}

function detectAgent(): SupportedAgent {
  const home = homedir();
  if (existsSync(resolve(home, ".claude"))) return "claude";
  if (existsSync(resolve(home, ".cursor"))) return "cursor";
  if (existsSync(resolve(home, ".codex"))) return "codex";
  if (existsSync(resolve(home, ".opencode"))) return "opencode";
  if (
    existsSync(resolve(home, ".goose")) ||
    existsSync(resolve(home, ".config", "goose"))
  ) {
    return "goose";
  }
  return "claude";
}

function agentSkillDir(agent: SupportedAgent): string {
  const home = homedir();
  if (agent === "claude") return resolve(home, ".claude", "skills");
  if (agent === "cursor") return resolve(home, ".cursor", "skills");
  if (agent === "codex") return resolve(home, ".codex", "skills");
  if (agent === "opencode") return resolve(home, ".opencode", "skills");
  // Goose's canonical writable global skills location is ~/.agents/skills —
  // the agent-neutral path it scans first among global roots.
  return resolve(home, ".agents", "skills");
}
