import { cac } from "cac";
import { registerChecksCommand } from "./commands/checks-command.js";
import { formatGhostHelp } from "./commands/command-discovery.js";
import { registerGatherCommand } from "./commands/gather-command.js";
import { registerManifestCommand } from "./commands/manifest-command.js";
import { registerPackageCommands } from "./commands/package-commands.js";
import { registerPullCommand } from "./commands/pull-command.js";
import { registerReviewCommand } from "./commands/review-command.js";
import { registerSkillCommand } from "./commands/skill-command.js";
import { registerStatsCommand } from "./commands/stats-command.js";
import { readPackageVersion } from "./package-version.js";

export {
  buildCliManifest,
  getCommandDiscoveryMetadata,
} from "./commands/command-discovery.js";

export function buildCli(): ReturnType<typeof cac> {
  const cli = cac("ghost");

  registerPackageCommands(cli);
  registerGatherCommand(cli);
  registerPullCommand(cli);
  registerStatsCommand(cli);
  registerReviewCommand(cli);
  registerChecksCommand(cli);
  registerManifestCommand(cli);
  registerSkillCommand(cli);

  cli.option("--all", "Show all commands when used with --help");
  cli.help((sections) => formatGhostHelp(cli, sections));
  cli.version(readPackageVersion());

  return cli;
}
