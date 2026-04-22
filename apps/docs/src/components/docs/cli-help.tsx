import manifest from "@/generated/cli-manifest.json";

interface CliHelpProps {
  command: string;
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
  name: string;
  rawName: string;
  description: string;
  options: CliOption[];
}

const commands = (manifest as { commands: CliCommand[] }).commands;

function findCommand(name: string): CliCommand | undefined {
  return commands.find((c) => c.name === name || c.rawName.startsWith(name));
}

export function CliHelp({
  command,
  show = "all",
  hideDescription = false,
}: CliHelpProps) {
  const cmd = findCommand(command);
  if (!cmd) {
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        Unknown CLI command: <code>{command}</code>. Commands in manifest:{" "}
        {commands.map((c) => c.name).join(", ")}
      </div>
    );
  }

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-border-card bg-muted/40">
      {(show === "all" || show === "signature") && (
        <div className="border-b border-border/40 bg-background/60 px-4 py-3">
          <div className="font-mono text-sm text-foreground">
            ghost-drift {cmd.rawName}
          </div>
          {!hideDescription && cmd.description && (
            <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {cmd.description}
            </div>
          )}
        </div>
      )}
      {(show === "all" || show === "options") && cmd.options.length > 0 && (
        <div className="divide-y divide-border/40">
          {cmd.options.map((opt) => (
            <div
              key={opt.rawName}
              className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-4"
            >
              <div className="flex flex-shrink-0 flex-wrap items-baseline gap-2 sm:w-64">
                <code className="font-mono text-xs text-foreground">
                  {opt.rawName}
                </code>
                {opt.default !== null && (
                  <span className="text-[10px] font-mono text-muted-foreground">
                    default: {String(opt.default)}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                {opt.description}
              </div>
            </div>
          ))}
        </div>
      )}
      {(show === "all" || show === "options") && cmd.options.length === 0 && (
        <div className="px-4 py-3 text-xs text-muted-foreground italic">
          No options.
        </div>
      )}
    </div>
  );
}
