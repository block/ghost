import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkillBundle } from "@anarchitecture/ghost-fingerprint/core";

// Bundle assets are copied to `dist/skill-bundle` (sibling of `commands/`).
const SKILL_BUNDLE_ROOT = fileURLToPath(
  new URL("../skill-bundle", import.meta.url),
);

const SUPPORTED_AGENTS = ["claude", "cursor", "codex", "opencode"] as const;
type SupportedAgent = (typeof SUPPORTED_AGENTS)[number];

export interface SkillInstallOptions {
  dest?: string;
  agent?: string;
  force?: boolean;
}

export interface SkillInstallResult {
  written: string[];
  outDir: string;
  code: number;
  message?: string;
}

/** Install the Haunt skill bundle into an agent's skills directory. */
export async function runSkillInstall(
  options: SkillInstallOptions,
): Promise<SkillInstallResult> {
  const agent = parseAgent(options.agent);
  const outDir = resolve(
    process.cwd(),
    typeof options.dest === "string"
      ? options.dest
      : `${agentSkillDir(agent ?? detectAgent())}/haunt`,
  );

  if (existsSync(resolve(outDir, "SKILL.md")) && !options.force) {
    return {
      written: [],
      outDir,
      code: 3,
      message: `${outDir} already contains SKILL.md. Pass --force to reinstall.`,
    };
  }

  const bundle = loadSkillBundle(SKILL_BUNDLE_ROOT);
  const written: string[] = [];
  for (const file of bundle) {
    const outPath = resolve(outDir, file.path);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, file.content, "utf-8");
    written.push(file.path);
  }
  return { written, outDir, code: 0 };
}

function parseAgent(raw: string | undefined): SupportedAgent | undefined {
  if (raw === undefined) return undefined;
  if ((SUPPORTED_AGENTS as readonly string[]).includes(raw)) {
    return raw as SupportedAgent;
  }
  throw new Error(`--agent must be one of: ${SUPPORTED_AGENTS.join(", ")}`);
}

function detectAgent(): SupportedAgent {
  const home = homedir();
  if (existsSync(resolve(home, ".claude"))) return "claude";
  if (existsSync(resolve(home, ".cursor"))) return "cursor";
  if (existsSync(resolve(home, ".codex"))) return "codex";
  if (existsSync(resolve(home, ".opencode"))) return "opencode";
  return "claude";
}

function agentSkillDir(agent: SupportedAgent): string {
  return resolve(homedir(), `.${agent}`, "skills");
}
