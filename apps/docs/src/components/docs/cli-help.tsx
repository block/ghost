import manifest from "@/generated/cli-manifest.json";

type ToolName = "ghost";

interface CliHelpProps {
  command: string;
  tool?: ToolName;
  show?: "all" | "signature" | "options";
  hideDescription?: boolean;
}

interface CliOption {
  rawName: string;
  name: string;
  description: string;
  default: string | number | boolean | null;
  takesValue: boolean;
  negated: boolean;
}

interface CliCommand {
  tool: ToolName;
  name: string;
  rawName: string;
  description: string;
  group?: string;
  defaultHelp?: boolean;
  compactName?: string;
  summary?: string;
  options: CliOption[];
}

interface ToolEntry {
  tool: ToolName;
  commands: CliCommand[];
}

const tools = (manifest as { tools: ToolEntry[] }).tools;

function findCommand(tool: ToolName, name: string): CliCommand | undefined {
  const entry = tools.find((candidate) => candidate.tool === tool);
  if (!entry) return undefined;
  return entry.commands.find(
    (command) => command.name === name || command.rawName.startsWith(name),
  );
}

export function CliHelp({
  command,
  tool = "ghost",
  show = "all",
  hideDescription = false,
}: CliHelpProps) {
  const cmd = findCommand(tool, command);
  if (!cmd) {
    const knownTools = tools.map((entry) => entry.tool).join(", ");
    return (
      <div className="my-4 max-w-[76ch] border border-[var(--doc-line)] bg-[var(--doc-flag)] p-4 text-foreground">
        Unknown CLI command: <code>{`${tool} ${command}`}</code>. Tools in
        manifest: {knownTools}
      </div>
    );
  }

  return (
    <figure className="doc-figure">
      {(show === "all" || show === "signature") && (
        <figcaption className="doc-figure-caption">
          <div className="font-bold text-foreground">
            {tool} {cmd.rawName}
          </div>
          {!hideDescription && cmd.description ? (
            <div className="text-[var(--doc-middle)]">{cmd.description}</div>
          ) : null}
        </figcaption>
      )}
      {(show === "all" || show === "options") && cmd.options.length > 0 ? (
        <div>
          {cmd.options.map((option) => (
            <div
              className="doc-figure-row sm:grid-cols-[24ch_1fr]"
              key={option.rawName}
            >
              <div>
                <code className="font-bold text-foreground">
                  {option.rawName}
                </code>
                {option.default !== null ? (
                  <div className="text-[var(--doc-middle)]">
                    default: {String(option.default)}
                  </div>
                ) : null}
              </div>
              <div className="text-foreground">{option.description}</div>
            </div>
          ))}
        </div>
      ) : null}
      {(show === "all" || show === "options") && cmd.options.length === 0 ? (
        <div className="p-4 px-[2ch] text-[var(--doc-middle)]">no options.</div>
      ) : null}
    </figure>
  );
}
