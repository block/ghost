import { readFile } from "node:fs/promises";
import type { CAC } from "cac";
import {
  buildCatalogMenu,
  type CatalogMenuEntry,
  parseGlossary,
} from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { isMissingPathError } from "../internal/fs.js";
import { appendGhostEvent, resolveRunId } from "../observability-events.js";
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
    .option(
      "--run <id>",
      "Attribute the tape event to this run id (default: GHOST_RUN_ID)",
    )
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
        const coverId = loaded.manifest.cover;
        const coverNode = coverId
          ? loaded.catalog.nodes.get(coverId)
          : undefined;
        const menu = buildCatalogMenu(loaded.catalog).filter(
          (entry) => entry.id !== coverNode?.id,
        );
        const kinds = await readMenuKinds(paths.glossary);
        const runId = resolveRunId(opts.run);
        await appendGhostEvent(paths.packageDir, {
          event: "gather",
          ...(runId ? { run: runId } : {}),
          ...(ask ? { ask } : {}),
          menu: menu.map((entry) => entry.id),
        });

        // Ghost does no selection. It emits the catalog; the agent reads the
        // ask against it and pulls the nodes it judges relevant.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "menu",
                ...(ask ? { ask } : {}),
                ...(coverNode
                  ? { cover: { id: coverNode.id, body: coverNode.body } }
                  : {}),
                coverage: menuCoverage(menu),
                ...(kinds.length > 0 ? { kinds } : {}),
                nodes: menu,
              },
              null,
              2,
            )}\n`,
          );
        } else {
          process.stdout.write(
            formatMenuMarkdown(menu, kinds, {
              ask,
              cover: coverNode
                ? { id: coverNode.id, body: coverNode.body }
                : undefined,
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
  cover?: {
    id: string;
    body: string;
  };
}

function menuCoverage(menu: CatalogMenuEntry[]): {
  nodes: number;
  concrete: number;
  undescribed: number;
} {
  return {
    nodes: menu.length,
    concrete: menu.filter((entry) => entry.concrete).length,
    // A node without a description is a bare id the agent cannot select
    // against — surface the count where selection happens.
    undescribed: menu.filter(
      (entry) => !entry.description || entry.description.trim().length === 0,
    ).length,
  };
}

function menuCoverageLine(menu: CatalogMenuEntry[]): string {
  const coverage = menuCoverage(menu);
  const parts = [
    `${coverage.nodes} nodes`,
    `${coverage.concrete} carry concrete material`,
  ];
  if (coverage.undescribed > 0) {
    parts.push(`${coverage.undescribed} lack descriptions`);
  }
  return parts.join(" · ");
}

function formatMenuMarkdown(
  menu: CatalogMenuEntry[],
  kinds: MenuKind[],
  options: FormatMenuOptions = {},
): string {
  const lines: string[] = [
    options.ask ? `# Ghost Nodes — for: ${options.ask}` : "# Ghost Nodes",
    "",
  ];
  if (options.cover) {
    lines.push(
      `## Cover — \`${options.cover.id}\``,
      "",
      options.cover.body,
      "",
      "---",
      "",
    );
  }
  lines.push(
    "The fingerprint menu. Match the ask against these nodes and read the ones you judge relevant.",
    menuCoverageLine(menu),
    "",
  );
  if (kinds.length > 0) {
    lines.push("Kinds:", "");
    for (const kind of kinds) {
      lines.push(`- **${kind.name}** — ${kind.purpose}`);
    }
    lines.push("");
  }
  for (const entry of menu) {
    const kind = entry.kind ? ` _(${entry.kind})_` : "";
    lines.push(`- \`${entry.id}\`${kind}`);
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
  return `${lines.join("\n")}\n`;
}
