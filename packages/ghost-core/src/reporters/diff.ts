import type { ComponentDiff, DiffResult, DiffSeverity } from "../diff.js";

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
  magenta: (s: string) => (useColor ? `\x1b[35m${s}\x1b[0m` : s),
};

function _severityBadge(severity: DiffSeverity): string {
  switch (severity) {
    case "error":
      return c.red("BREAKING");
    case "warn":
      return c.yellow("CHANGED");
    case "info":
      return c.cyan("COSMETIC");
  }
}

function classificationLabel(
  classification: ComponentDiff["classification"],
): string {
  switch (classification) {
    case "missing":
      return c.red("MISSING");
    case "breaking":
      return c.red("BREAKING");
    case "additive":
      return c.yellow("ADDITIVE");
    case "cosmetic":
      return c.cyan("COSMETIC");
  }
}

function formatComponentDiff(cd: ComponentDiff): string {
  const lines: string[] = [];

  if (cd.component === "_tokens") {
    lines.push(`\n${c.bold("Token Drift")}`);
    for (const vd of cd.valueDrifts) {
      const tag = vd.severity === "error" ? c.red("ERROR") : c.yellow(" WARN");
      lines.push(`  ${tag} ${vd.message}`);
      if (vd.registryValue && vd.consumerValue) {
        lines.push(`         ${c.dim("registry:")} ${vd.registryValue}`);
        lines.push(`         ${c.dim("local:")}    ${vd.consumerValue}`);
      }
      if (vd.suggestion) {
        lines.push(`         ${c.green("suggestion:")} ${vd.suggestion}`);
      }
    }
    return lines.join("\n");
  }

  const badge = classificationLabel(cd.classification);
  lines.push(`\n${c.bold(cd.component)} ${badge}`);

  if (cd.structureDrift) {
    const sd = cd.structureDrift;
    if (sd.rule === "missing-component") {
      lines.push(`  Not found at ${c.dim(sd.consumerFile ?? "")}`);
    } else {
      lines.push(
        `  ${c.green(`+${sd.linesAdded}`)} ${c.red(`-${sd.linesRemoved}`)} lines`,
      );
      if (sd.diff) {
        // Show a condensed diff (first 20 meaningful lines)
        const diffLines = sd.diff.split("\n");
        let shown = 0;
        for (const line of diffLines) {
          if (shown >= 20) {
            lines.push(c.dim(`  ... (${diffLines.length - shown} more lines)`));
            break;
          }
          if (line.startsWith("+") && !line.startsWith("+++")) {
            lines.push(`  ${c.green(line)}`);
            shown++;
          } else if (line.startsWith("-") && !line.startsWith("---")) {
            lines.push(`  ${c.red(line)}`);
            shown++;
          } else if (line.startsWith("@@")) {
            lines.push(`  ${c.magenta(line)}`);
            shown++;
          }
        }
      }
    }
  }

  return lines.join("\n");
}

export function formatDiffCLI(results: DiffResult[]): string {
  const lines: string[] = [];

  for (const result of results) {
    lines.push(c.bold(`\n${result.designSystem}`));
    lines.push(
      c.dim(
        `${result.summary.total} components | ${result.summary.clean} clean | ${result.summary.diverged} diverged | ${result.summary.missing} missing | ${result.summary.tokenDrifts} token drifts`,
      ),
    );

    if (result.components.length === 0) {
      lines.push(c.green("\n  All components match registry."));
      continue;
    }

    // Sort: breaking first, then additive, then cosmetic
    const order = { missing: 0, breaking: 1, additive: 2, cosmetic: 3 };
    const sorted = [...result.components].sort(
      (a, b) => order[a.classification] - order[b.classification],
    );

    for (const cd of sorted) {
      lines.push(formatComponentDiff(cd));
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function formatDiffJSON(results: DiffResult[]): string {
  return JSON.stringify(results, null, 2);
}
