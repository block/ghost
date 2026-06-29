import type { CAC, Command } from "cac";

type HelpSection = {
  title?: string;
  body: string;
};

export type CommandDiscoveryGroup = "core" | "advanced" | "maintenance";

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
  { group: "maintenance", title: "Maintenance/legacy" },
];

const COMMAND_DISCOVERY = [
  {
    name: "init",
    group: "core",
    defaultHelp: true,
    compactName: "init",
    summary: "Create .ghost/ package facets.",
  },
  {
    name: "scan",
    group: "core",
    defaultHelp: true,
    compactName: "scan",
    summary: "Report fingerprint contribution facets.",
  },
  {
    name: "validate",
    group: "core",
    defaultHelp: true,
    compactName: "validate",
    summary: "Validate the fingerprint: artifact shape + the node graph.",
  },
  {
    name: "check",
    group: "core",
    defaultHelp: true,
    compactName: "check",
    summary: "Run active deterministic gates against a diff.",
  },
  {
    name: "review",
    group: "core",
    defaultHelp: true,
    compactName: "review",
    summary: "Emit an advisory packet from fingerprint facets and a diff.",
  },
  {
    name: "gather",
    group: "core",
    defaultHelp: true,
    compactName: "gather",
    summary: "Gather the composed context slice for a surface.",
  },
  {
    name: "checks",
    group: "core",
    defaultHelp: true,
    compactName: "checks",
    summary: "Select and ground the checks relevant to a diff, by surface.",
  },
  {
    name: "skill",
    group: "core",
    defaultHelp: true,
    compactName: "skill install",
    summary: "Install the Ghost skill bundle.",
  },
  {
    name: "signals",
    group: "advanced",
    defaultHelp: false,
    compactName: "signals",
    summary: "Emit raw repo signals for fingerprint authoring.",
  },
  {
    name: "migrate",
    group: "maintenance",
    defaultHelp: false,
    compactName: "migrate",
    summary: "Migrate a legacy .ghost/ package onto the surface model.",
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

export function getCommandDiscoveryForCommand(
  name: string,
): CommandDiscoveryMetadata | undefined {
  const entry = METADATA_BY_NAME.get(name);
  return entry ? { ...entry } : undefined;
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

  const uncategorized = commands.filter((command) => !metadataFor(command));
  if (uncategorized.length > 0) {
    grouped.push({
      title: "Other",
      body: formatCommandRows(uncategorized, "raw"),
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
      "  $ ghost --help --all      Show all advanced and maintenance commands",
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
