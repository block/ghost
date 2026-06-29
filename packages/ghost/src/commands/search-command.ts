import type { CAC } from "cac";
import { type SearchDomain, type SearchHit, searchGraph } from "#ghost-core";
import { resolveFingerprintPackage } from "../fingerprint.js";
import { loadChecksDir } from "../scan/checks-dir.js";
import { loadFingerprintPackage } from "../scan/fingerprint-package.js";

const DOMAINS: SearchDomain[] = ["node", "surface", "check"];

export function registerSearchCommand(cli: CAC): void {
  cli
    .command(
      "search <query>",
      "Search nodes, surfaces, and checks in one ranked, cross-domain result set, each tagged with the follow-up command.",
    )
    .option(
      "--type <domain>",
      "Restrict to one domain: node, surface, or check",
    )
    .option("--limit <n>", "Cap the number of results (default 20)")
    .option(
      "--package <dir>",
      "Use this fingerprint package directory (default: ./.ghost)",
    )
    .option("--format <fmt>", "Output format: markdown or json", {
      default: "markdown",
    })
    .action(async (query: string, opts) => {
      try {
        if (opts.format !== "markdown" && opts.format !== "json") {
          console.error("Error: --format must be 'markdown' or 'json'");
          process.exit(2);
          return;
        }

        const domain = parseDomainOption(opts.type);
        const limit = parseLimitOption(opts.limit);

        const paths = resolveFingerprintPackage(opts.package, process.cwd());
        const loaded = await loadFingerprintPackage(paths);
        const { checks } = await loadChecksDir(paths.dir);

        const results = searchGraph(
          query,
          {
            graph: loaded.graph,
            checks: checks.map((c) => ({
              name: c.frontmatter.name,
              surface: c.frontmatter.surface ?? "core",
              body: c.body,
              ...(c.frontmatter.description
                ? { description: c.frontmatter.description }
                : {}),
            })),
          },
          {
            ...(domain !== undefined ? { domain } : {}),
            ...(limit !== undefined ? { limit } : {}),
          },
        );

        if (opts.format === "json") {
          process.stdout.write(
            `${JSON.stringify({ kind: "search", query, results }, null, 2)}\n`,
          );
        } else {
          process.stdout.write(formatSearchMarkdown(query, results));
        }
        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(1);
      }
    });
}

function parseDomainOption(value: unknown): SearchDomain | undefined {
  if (value === undefined) return undefined;
  const candidate = String(value).trim();
  if ((DOMAINS as string[]).includes(candidate)) {
    return candidate as SearchDomain;
  }
  throw new Error(`--type must be one of: ${DOMAINS.join(", ")}`);
}

function parseLimitOption(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("--limit must be a positive integer");
  }
  return parsed;
}

function formatSearchMarkdown(query: string, results: SearchHit[]): string {
  const lines: string[] = [`# Ghost Search: \`${query}\``, ""];
  if (results.length === 0) {
    lines.push(
      "No matching nodes, surfaces, or checks. Run `ghost gather` to list the full node menu.",
    );
    return `${lines.join("\n")}\n`;
  }

  lines.push(`${results.length} result(s):`, "");
  for (const hit of results) {
    lines.push(`- [${hit.domain}] \`${hit.id}\``);
    if (hit.description) lines.push(`  - ${hit.description}`);
    for (const next of hit.next) {
      lines.push(`  - → \`${next}\``);
    }
  }
  return `${lines.join("\n")}\n`;
}
