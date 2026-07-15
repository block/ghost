import type { CAC, Command } from "cac";

export type CliManifestOption = {
  rawName: string;
  name: string;
  description: string;
  default: unknown;
  takesValue: boolean;
  negated: boolean;
};

export type CliManifestCommand = {
  tool: string;
  name: string;
  rawName: string;
  description: string;
  group?: CommandDiscoveryGroup;
  defaultHelp?: boolean;
  compactName?: string;
  summary?: string;
  options: CliManifestOption[];
};

export type CliManifestGlobalOption = {
  rawName: string;
  name: string;
  description: string;
  default: unknown;
};

export type CliManifestTool = {
  tool: string;
  commands: CliManifestCommand[];
  globalOptions: CliManifestGlobalOption[];
};

/**
 * Derive a structured manifest of a built cac CLI: every command, its
 * curated discovery metadata, and its flags. The cac registry is the single
 * source of truth, so this can never drift from the real command definitions.
 *
 * Shared by the terminal help formatter's data source and the docs-site
 * manifest dump (`scripts/dump-cli-help.mjs`) so both read one shape.
 */
export function buildCliManifest(cli: CAC, toolName: string): CliManifestTool {
  const commands: CliManifestCommand[] = cli.commands.map((cmd) => {
    const discovery = metadataFor(cmd);
    return {
      tool: toolName,
      name: cmd.name,
      rawName: cmd.rawName,
      description: cmd.description,
      ...(discovery
        ? {
            group: discovery.group,
            defaultHelp: discovery.defaultHelp,
            compactName: discovery.compactName,
            summary: discovery.summary,
          }
        : {}),
      options: cmd.options.map((o) => ({
        rawName: o.rawName,
        name: o.name,
        description: o.description,
        default: o.config?.default ?? null,
        takesValue: /<[^>]+>/.test(o.rawName),
        negated: Boolean(o.negated),
      })),
    };
  });

  const globalOptions: CliManifestGlobalOption[] =
    cli.globalCommand.options.map((o) => ({
      rawName: o.rawName,
      name: o.name,
      description: o.description,
      default: o.config?.default ?? null,
    }));

  return { tool: toolName, commands, globalOptions };
}

type HelpSection = {
  title?: string;
  body: string;
};

export type CommandDiscoveryGroup = "core" | "advanced";

export type CommandDiscoveryMetadata = {
  name: string;
  group: CommandDiscoveryGroup;
  defaultHelp: boolean;
  compactName: string;
  summary: string;
  order: number;
};

const GROUPS: ReadonlyArray<{
  group: CommandDiscoveryGroup;
  title: string;
}> = [
  { group: "core", title: "Core workflow" },
  { group: "advanced", title: "Advanced/package inspection" },
];

const COMMAND_DISCOVERY = [
  {
    name: "init",
    group: "core",
    defaultHelp: true,
    compactName: "init",
    summary: "Scaffold a .ghost/ fingerprint: manifest, glossary, and a node.",
  },
  {
    name: "validate",
    group: "core",
    defaultHelp: true,
    compactName: "validate",
    summary: "Validate the fingerprint: artifact shape + node validity.",
  },
  {
    name: "gather",
    group: "core",
    defaultHelp: true,
    compactName: "gather [ask]",
    summary:
      "Emit the complete guidance menu so the agent can pull applicable nodes.",
  },
  {
    name: "pull",
    group: "core",
    defaultHelp: true,
    compactName: "pull",
    summary: "Emit the named nodes' bodies; log the pull to .ghost/.events.",
  },
  {
    name: "pulse",
    group: "core",
    defaultHelp: true,
    compactName: "pulse",
    summary: "Summarize local gather/pull events from .ghost/.events.",
  },
  {
    name: "review",
    group: "core",
    defaultHelp: true,
    compactName: "review",
    summary:
      "Emit an advisory review packet for a diff (needs .ghost/checks/).",
  },
  {
    name: "export",
    group: "core",
    defaultHelp: true,
    compactName: "export",
    summary: "Package the fingerprint as a portable brand artifact.",
  },
  {
    name: "checks",
    group: "core",
    defaultHelp: true,
    compactName: "checks init",
    summary: "Scaffold .ghost/checks/ with review assertions.",
  },
  {
    name: "skill",
    group: "core",
    defaultHelp: true,
    compactName: "skill install",
    summary: "Install the Ghost skill bundle.",
  },
  {
    name: "manifest",
    group: "advanced",
    defaultHelp: false,
    compactName: "manifest",
    summary: "Emit a self-describing JSON manifest of commands and flags.",
  },
] satisfies ReadonlyArray<Omit<CommandDiscoveryMetadata, "order">>;

const COMMAND_METADATA: ReadonlyArray<CommandDiscoveryMetadata> =
  COMMAND_DISCOVERY.map((entry, index) => ({
    ...entry,
    order: index,
  }));

const METADATA_BY_NAME = new Map(
  COMMAND_METADATA.map((entry) => [entry.name, entry]),
);

export function getCommandDiscoveryMetadata(): CommandDiscoveryMetadata[] {
  return COMMAND_METADATA.map((entry) => ({ ...entry }));
}

export function formatGhostHelp(
  cli: CAC,
  sections: HelpSection[],
): HelpSection[] {
  if (cli.matchedCommand) return sections;

  const baseSections = pickBaseSections(sections);
  const showAll = Boolean(
    (cli.options as Record<string, unknown> | undefined)?.all,
  );
  const commandSections = showAll
    ? formatAllCommandSections(cli.commands)
    : formatDefaultCommandSections(cli.commands);

  return [
    baseSections.header,
    baseSections.usage,
    ...commandSections,
    ...(showAll ? [formatCommandHelpSection(cli.commands, cli.name)] : []),
    ...(showAll ? [] : [formatMoreSection()]),
    baseSections.options,
  ].filter(isSection);
}

function pickBaseSections(sections: HelpSection[]): {
  header?: HelpSection;
  usage?: HelpSection;
  options?: HelpSection;
} {
  return {
    header: sections.find((section) => !section.title),
    usage: sections.find((section) => section.title === "Usage"),
    options: sections.find((section) => section.title === "Options"),
  };
}

function formatDefaultCommandSections(commands: Command[]): HelpSection[] {
  return [
    {
      title: "Core workflow",
      body: formatCommandRows(
        commands.filter((command) => metadataFor(command)?.defaultHelp),
        "compact",
      ),
    },
  ];
}

function formatAllCommandSections(commands: Command[]): HelpSection[] {
  const grouped = GROUPS.map(({ group, title }) => ({
    title,
    body: formatCommandRows(
      commands.filter((command) => metadataFor(command)?.group === group),
      "raw",
    ),
  })).filter((section) => section.body.length > 0);

  const unlisted = commands.filter((command) => !metadataFor(command));
  if (unlisted.length > 0) {
    grouped.push({
      title: "Other",
      body: formatCommandRows(unlisted, "raw"),
    });
  }

  return grouped;
}

function formatCommandRows(
  commands: Command[],
  mode: "compact" | "raw",
): string {
  const sorted = [...commands].sort(compareCommands);
  const rows = sorted.map((command) => {
    const metadata = metadataFor(command);
    const displayName =
      mode === "compact"
        ? (metadata?.compactName ?? command.name)
        : command.rawName;
    const summary = metadata?.summary ?? command.description;
    return { displayName, summary };
  });
  const width = Math.max(...rows.map((row) => row.displayName.length), 0);
  return rows
    .map((row) => `  ${padRight(row.displayName, width)}  ${row.summary}`)
    .join("\n");
}

function formatCommandHelpSection(
  commands: Command[],
  cliName: string,
): HelpSection {
  const sorted = [...commands].sort(compareCommands);
  return {
    title: "For command-specific help",
    body: sorted
      .map((command) => `  $ ${cliName} ${command.name} --help`)
      .join("\n"),
  };
}

function formatMoreSection(): HelpSection {
  return {
    title: "More",
    body: [
      "  $ ghost --help --all      Show all advanced commands",
      "  $ ghost <command> --help  Show command-specific options",
    ].join("\n"),
  };
}

function compareCommands(a: Command, b: Command): number {
  const aOrder = metadataFor(a)?.order ?? Number.MAX_SAFE_INTEGER;
  const bOrder = metadataFor(b)?.order ?? Number.MAX_SAFE_INTEGER;
  return aOrder - bOrder || a.name.localeCompare(b.name);
}

function metadataFor(command: Command): CommandDiscoveryMetadata | undefined {
  return METADATA_BY_NAME.get(command.name);
}

function padRight(value: string, width: number): string {
  return value + " ".repeat(Math.max(0, width - value.length));
}

function isSection(section: HelpSection | undefined): section is HelpSection {
  return Boolean(section);
}
