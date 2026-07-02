import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cac } from "cac";
import { formatGhostHelp } from "./commands/command-discovery.js";
import { registerFingerprintCommands } from "./commands/fingerprint-commands.js";
import { registerGatherCommand } from "./commands/gather-command.js";
import { registerManifestCommand } from "./commands/manifest-command.js";
import { registerPullCommand } from "./commands/pull-command.js";
import { registerSkillCommand } from "./commands/skill-command.js";

export {
  buildCliManifest,
  getCommandDiscoveryMetadata,
} from "./commands/command-discovery.js";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost");

  registerFingerprintCommands(cli);
  registerGatherCommand(cli);
  registerPullCommand(cli);
  registerManifestCommand(cli);
  registerSkillCommand(cli);

  cli.help((sections) => formatGhostHelp(cli, sections));
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
