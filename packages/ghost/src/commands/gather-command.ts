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
      "Emit the complete available guidance menu so the agent can pull applicable nodes.",
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

        // Ghost does no selection. It emits the complete catalog; the agent
        // reads the ask against it and pulls the nodes whose described
        // conditions apply.
        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify(
              {
                kind: "menu",
                ...(ask ? { ask } : {}),
                source: {
                  artifact: "Ghost brand fingerprint",
                  list: "Available guidance",
                },
                contract: gatherContract(ask),
                ...(coverNode
                  ? {
                      cover: {
                        id: coverNode.id,
                        body: coverNode.body,
                        inContext: true,
                        selectable: false,
                      },
                    }
                  : {}),
                next: { command: "ghost pull <id> [<id>…]" },
                silence: {
                  ifNoneApply:
                    "Name the fingerprint's silence, follow the cover silence posture when present, and do not invent Ghost-backed guidance.",
                },
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

interface GatherContract {
  completeness: {
    complete: true;
    filtered: false;
    ranked: false;
    selectedByGhost: false;
  };
  selection: {
    basis: "applicability";
    instruction: string;
    topicOverlapAloneIsApplicability: false;
    addForCompleteness: false;
    omitApplicableForCount: false;
  };
  noAsk: string;
}

function gatherContract(ask: string | undefined): GatherContract {
  return {
    completeness: {
      complete: true,
      filtered: false,
      ranked: false,
      selectedByGhost: false,
    },
    selection: {
      basis: "applicability",
      instruction: ask
        ? "Pull every node whose description indicates its stated situation applies and whose truth, material, structure, or refusal governs the work; skip inapplicable nodes."
        : "Bare gather is catalog inspection. Do not treat the menu as task grounding until an ask is supplied; when grounding a task, pull every applicable node and skip inapplicable nodes.",
      topicOverlapAloneIsApplicability: false,
      addForCompleteness: false,
      omitApplicableForCount: false,
    },
    noAsk:
      "Bare gather is catalog inspection and does not imply task grounding.",
  };
}

function menuCoverage(menu: CatalogMenuEntry[]): {
  nodes: number;
  concrete: number;
  payloads: {
    materials: number;
    fencedExamples: number;
    skeletons: number;
  };
  undescribed: number;
} {
  return {
    nodes: menu.length,
    concrete: menu.filter((entry) => entry.concrete).length,
    payloads: {
      materials: menu.filter((entry) => entry.materials !== undefined).length,
      fencedExamples: menu.filter((entry) => entry.hasFencedExample).length,
      skeletons: menu.filter((entry) => entry.hasSkeleton).length,
    },
    // A node without a description is a bare id the agent cannot select
    // against; surface the count where selection happens.
    undescribed: menu.filter(
      (entry) => !entry.description || entry.description.trim().length === 0,
    ).length,
  };
}

function menuCoverageLine(menu: CatalogMenuEntry[]): string {
  const coverage = menuCoverage(menu);
  const payloadParts = [
    `${coverage.payloads.materials} with materials`,
    `${coverage.payloads.fencedExamples} with substantial fenced examples`,
    `${coverage.payloads.skeletons} with Skeletons`,
  ];
  const parts = [
    `${coverage.nodes} nodes`,
    `${coverage.concrete} carry payloads (${payloadParts.join(", ")})`,
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
  const lines: string[] = ["# Ghost brand fingerprint", ""];
  if (options.ask) lines.push(`Ask: ${options.ask}`, "");
  if (options.cover) {
    lines.push(
      `## Cover in context: \`${options.cover.id}\``,
      "",
      options.cover.body,
      "",
      "Cover status: already in context; outside selection; do not pull again.",
      "",
      "---",
      "",
    );
  }
  lines.push("## Available guidance", "", menuCoverageLine(menu), "");
  if (options.ask) {
    lines.push(
      "Complete, unfiltered, unranked list from the fingerprint. Ghost has not selected nodes for this ask.",
      "Pull every node whose description indicates its stated situation applies and whose truth, material, structure, or refusal governs the work. Skip inapplicable nodes. Topic overlap alone is not applicability. Do not add nodes for completeness or omit applicable nodes to meet a count.",
      "Next: `ghost pull <id> [<id>…]`.",
      "If nothing applies, name the fingerprint's silence, follow the cover silence posture, and do not invent Ghost-backed guidance.",
      "",
    );
  } else {
    lines.push(
      "Complete, unfiltered, unranked list from the fingerprint. Bare gather is catalog inspection; Ghost has not grounded a task or selected nodes.",
      "When grounding an ask, pull every applicable node with `ghost pull <id> [<id>…]`. Skip inapplicable nodes and do not invent Ghost-backed guidance when the fingerprint is silent.",
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
    lines.push(`- \`${entry.id}\`${kind}`);
    if (entry.description) lines.push(`  - ${entry.description}`);
    if (entry.materials !== undefined) {
      lines.push(`  - materials: ${entry.materials}`);
    }
    const payloadTypes = formatPayloadTypes(entry);
    if (payloadTypes.length > 0) {
      lines.push(`  - payloads: ${payloadTypes.join(", ")}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function formatPayloadTypes(entry: CatalogMenuEntry): string[] {
  const types: string[] = [];
  if (entry.materials !== undefined) types.push("materials");
  if (entry.hasFencedExample) types.push("substantial fenced example");
  if (entry.hasSkeleton) types.push("Skeleton");
  return types;
}
