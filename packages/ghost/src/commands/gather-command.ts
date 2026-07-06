import { readFile } from "node:fs/promises";
import type { CAC } from "cac";
import {
  buildCatalogMenu,
  type CatalogMenuEntry,
  parseGlossary,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { isMissingPathError } from "../internal/fs.js";
import { appendGhostEvent } from "../observability-events.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";
import { failFromError } from "./errors.js";

/**
 * A glossary kind surfaced in the gather menu: the name plus the author's
 * prose purpose, so the menu is self-sufficient selection context and the
 * agent does not need a separate glossary read to interpret kind prefixes.
 */
interface MenuKind {
  name: string;
  purpose: string;
}

export function registerGatherCommand(cli: CAC): void {
  cli
    .command(
      "gather [...ask]",
      "Emit the fingerprint menu — every node's id, kind, and description — for the agent to select from.",
    )
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .option("--wild", "Include wild-posture nodes in the menu")
    .action(async (askParts: string[] | undefined, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const ask = normalizeAsk(askParts);
        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const wildIds = [...loaded.catalog.nodes.values()]
          .filter((node) => node.wild)
          .map((node) => node.id)
          .sort();
        const includeWild = Boolean(opts.wild);
        const menu = buildCatalogMenu(loaded.catalog, { includeWild });
        const exposedWildIds = menu
          .filter((entry) => entry.wild)
          .map((entry) => entry.id);
        const kinds = await readMenuKinds(paths.glossary);
        await appendGhostEvent(paths.packageDir, {
          event: "gather",
          ...(ask ? { ask } : {}),
          menu: menu.map((entry) => entry.id),
          wild: includeWild,
          wildIds: exposedWildIds,
        });

        // Ghost does no selection. It emits the catalog; the agent reads the
        // ask against it and pulls the nodes it judges relevant.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "menu",
                ...(ask ? { ask } : {}),
                coverage: menuCoverage(menu),
                ...(kinds.length > 0 ? { kinds } : {}),
                nodes: menu,
                ...(wildIds.length > 0 && !includeWild
                  ? { wildAvailable: wildIds.length }
                  : {}),
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            formatMenuMarkdown(menu, kinds, {
              ask,
              wildAvailable: includeWild ? 0 : wildIds.length,
              wildIncluded: includeWild && exposedWildIds.length > 0,
            }),
          );
        }
        process.exit(0);
      } catch (err) {
        failFromError(err);
      }
    });
}

function normalizeAsk(askParts: string[] | undefined): string | undefined {
  const ask = (askParts ?? []).join(" ").trim();
  return ask.length > 0 ? ask : undefined;
}

/**
 * Read the glossary's declared kinds and their prose purposes for the menu
 * header. Missing or malformed glossaries degrade to no legend — the menu
 * itself never depends on the glossary being present.
 */
async function readMenuKinds(glossaryPath: string): Promise<MenuKind[]> {
  let raw: string;
  try {
    raw = await readFile(glossaryPath, "utf-8");
  } catch (err) {
    if (isMissingPathError(err)) return [];
    throw err;
  }
  const result = parseGlossary(raw);
  if (result.glossary === null) return [];
  return result.glossary.kinds
    .filter((kind) => kind.purpose.length > 0)
    .map((kind) => ({
      name: kind.name,
      // Legend entries are one line each: keep the section's first paragraph
      // and collapse internal wrapping.
      purpose: (kind.purpose.split(/\n\s*\n/, 1)[0] ?? "")
        .replace(/\s+/g, " ")
        .trim(),
    }));
}

interface FormatMenuOptions {
  ask?: string;
  wildAvailable?: number;
  wildIncluded?: boolean;
}

function menuCoverage(menu: CatalogMenuEntry[]): {
  nodes: number;
  concrete: number;
  guards: number;
} {
  return {
    nodes: menu.length,
    concrete: menu.filter((entry) => entry.concrete).length,
    guards: menu.filter((entry) => entry.guard).length,
  };
}

function menuCoverageLine(menu: CatalogMenuEntry[]): string {
  const coverage = menuCoverage(menu);
  return `${coverage.nodes} nodes · ${coverage.concrete} carry concrete material · ${coverage.guards} guards`;
}

function formatMenuMarkdown(
  menu: CatalogMenuEntry[],
  kinds: MenuKind[],
  options: FormatMenuOptions = {},
): string {
  const lines: string[] = [
    options.ask ? `# Ghost Nodes — for: ${options.ask}` : "# Ghost Nodes",
    "",
    "The fingerprint menu. Match the ask against these nodes and read the ones you judge relevant.",
    menuCoverageLine(menu),
    "",
  ];
  if (options.wildIncluded) {
    lines.push(
      "Wild nodes are marked `(wild)`: they push past the fingerprint and require explicit open territory in the brief.",
      "",
    );
  }
  if (kinds.length > 0) {
    lines.push("Kinds:", "");
    for (const kind of kinds) {
      lines.push(`- **${kind.name}** — ${kind.purpose}`);
    }
    lines.push("");
  }
  for (const entry of menu) {
    const kind = entry.kind ? ` _(${entry.kind})_` : "";
    const wild = entry.wild ? " _(wild)_" : "";
    const guard = entry.guard ? " _(guard)_" : "";
    lines.push(`- \`${entry.id}\`${kind}${wild}${guard}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
    if (entry.materials !== undefined) {
      lines.push(`  - materials: ${entry.materials}`);
    }
    if (entry.concrete) {
      lines.push(
        `  - carries concrete material${entry.hasSkeleton ? " (Skeleton)" : ""}`,
      );
    }
  }
  if ((options.wildAvailable ?? 0) > 0) {
    lines.push(
      "",
      `${options.wildAvailable} wild node${options.wildAvailable === 1 ? "" : "s"} available via \`--wild\`.`,
    );
  }
  return `${lines.join("\n")}\n`;
}
