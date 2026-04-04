import type {
  DriftReport,
  StructureDrift,
  ValueDrift,
  VisualDrift,
} from "../types.js";

const useColor =
  !process.env.NO_COLOR &&
  !process.argv.includes("--no-color") &&
  process.stdout.isTTY;

const c = {
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  yellow: (s: string) => (useColor ? `\x1b[33m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
};

function severityTag(severity: string): string {
  switch (severity) {
    case "error":
      return c.red("ERROR");
    case "warn":
      return c.yellow(" WARN");
    default:
      return c.cyan(" INFO");
  }
}

function formatValueDrift(drift: ValueDrift): string {
  const lines: string[] = [];
  const location = drift.file
    ? drift.line
      ? `${drift.file}:${drift.line}`
      : drift.file
    : "";

  lines.push(
    `  ${severityTag(drift.severity)}  ${c.dim(drift.rule)}  ${c.dim(location)}`,
  );
  lines.push(`         ${drift.message}`);

  if (drift.registryValue && drift.consumerValue) {
    lines.push(
      `         ${c.dim("registry:")} ${drift.registryValue}  ${c.dim("consumer:")} ${drift.consumerValue}`,
    );
  }

  return lines.join("\n");
}

function formatStructureDrift(drift: StructureDrift): string {
  const lines: string[] = [];
  const location = drift.consumerFile ?? drift.component;

  lines.push(
    `  ${severityTag(drift.severity)}  ${c.dim(drift.rule)}  ${c.dim(location)}`,
  );
  lines.push(`         ${drift.message}`);

  return lines.join("\n");
}

function formatVisualDrift(drift: VisualDrift): string {
  const lines: string[] = [];
  const location = drift.consumerFile ?? drift.component;

  lines.push(
    `  ${severityTag(drift.severity)}  ${c.dim(drift.rule)}  ${c.dim(location)}`,
  );
  lines.push(`         ${drift.message}`);

  if (drift.diffImagePath) {
    lines.push(`         ${c.dim("diff image:")} ${drift.diffImagePath}`);
  }

  return lines.join("\n");
}

export function formatReport(report: DriftReport): string {
  const lines: string[] = [];

  for (const system of report.systems) {
    lines.push("");
    lines.push(c.bold(`ghost scan results for ${system.designSystem}`));
    lines.push(c.dim("═".repeat(50)));

    if (system.values.length > 0) {
      lines.push("");
      lines.push(c.bold(`Values ${c.dim(`(${system.values.length} issues)`)}`));
      for (const drift of system.values) {
        lines.push(formatValueDrift(drift));
      }
    }

    if (system.structure.length > 0) {
      lines.push("");
      lines.push(
        c.bold(`Structure ${c.dim(`(${system.structure.length} issues)`)}`),
      );
      for (const drift of system.structure) {
        lines.push(formatStructureDrift(drift));
      }
    }

    if (system.visual.length > 0) {
      lines.push("");
      lines.push(c.bold(`Visual ${c.dim(`(${system.visual.length} issues)`)}`));
      for (const drift of system.visual) {
        lines.push(formatVisualDrift(drift));
      }
    }

    if (
      system.values.length === 0 &&
      system.structure.length === 0 &&
      system.visual.length === 0
    ) {
      lines.push("");
      lines.push(c.green("  No drift detected."));
    }
  }

  lines.push("");
  lines.push(c.dim("─".repeat(50)));

  const { errors, warnings, info } = report.summary;
  const parts: string[] = [];
  if (errors > 0)
    parts.push(c.red(`${errors} error${errors !== 1 ? "s" : ""}`));
  if (warnings > 0)
    parts.push(c.yellow(`${warnings} warning${warnings !== 1 ? "s" : ""}`));
  if (info > 0) parts.push(c.cyan(`${info} info`));

  if (parts.length === 0) {
    lines.push(c.green("No issues found."));
  } else {
    lines.push(`Summary: ${parts.join(", ")}`);
  }

  lines.push("");
  return lines.join("\n");
}
