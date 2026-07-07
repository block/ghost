import { cac } from "cac";
import { registerChecksCommand } from "./commands/checks-command.js";
import { formatGhostHelp } from "./commands/command-discovery.js";
import { registerExportCommand } from "./commands/export-command.js";
import { registerFingerprintCommands } from "./commands/fingerprint-commands.js";
import { registerGatherCommand } from "./commands/gather-command.js";
import { registerManifestCommand } from "./commands/manifest-command.js";
import { registerPullCommand } from "./commands/pull-command.js";
import { registerPulseCommand } from "./commands/pulse-command.js";
import { registerReviewCommand } from "./commands/review-command.js";
import { registerSkillCommand } from "./commands/skill-command.js";
import { readPackageVersion } from "./package-version.js";

export {
  buildCliManifest,
  getCommandDiscoveryMetadata,
} from "./commands/command-discovery.js";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost");

  registerFingerprintCommands(cli);
  registerGatherCommand(cli);
  registerPullCommand(cli);
  registerPulseCommand(cli);
  registerReviewCommand(cli);
  registerExportCommand(cli);
  registerChecksCommand(cli);
  registerManifestCommand(cli);
  registerSkillCommand(cli);

  cli.help((sections) => formatGhostHelp(cli, sections));
  cli.version(readPackageVersion());

  return cli;
}
