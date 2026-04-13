import type { DiscoveredSystem } from "../agents/discovery.js";

export function formatDiscoveryCLI(systems: DiscoveredSystem[]): string {
  if (systems.length === 0) {
    return "No design systems found matching your query.\n";
  }

  const lines: string[] = [];
  lines.push(`\x1b[1mDiscovered Design Systems\x1b[0m (${systems.length})\n`);

  for (const system of systems) {
    const stars = system.stars
      ? ` \x1b[33m★ ${formatStars(system.stars)}\x1b[0m`
      : "";
    const source = `\x1b[2m[${system.source}]\x1b[0m`;

    lines.push(`  \x1b[1m${system.name}\x1b[0m${stars} ${source}`);
    lines.push(`  ${system.description}`);
    lines.push(`  \x1b[36m${system.url}\x1b[0m`);
    lines.push("");
  }

  return lines.join("\n");
}

export function formatDiscoveryJSON(systems: DiscoveredSystem[]): string {
  return JSON.stringify(systems, null, 2);
}

function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}
