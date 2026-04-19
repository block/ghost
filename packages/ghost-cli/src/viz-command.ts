import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareFleet, DIMENSION_RANGES, loadExpression } from "@ghost/core";
import type { CAC } from "cac";

export function registerVizCommand(cli: CAC): void {
  cli
    .command(
      "viz [...fingerprints]",
      "Launch interactive 3D visualization of design fingerprints",
    )
    .option("--port <n>", "Port for the visualization server", {
      default: "3333",
    })
    .option("--no-open", "Don't auto-open browser")
    .action(async (paths: string[], opts) => {
      try {
        if (paths.length < 2) {
          console.error("Error: viz requires at least 2 fingerprint paths");
          process.exit(2);
        }

        const members = await Promise.all(
          paths.map(async (p) => {
            const { fingerprint } = await loadExpression(p);
            return { id: fingerprint.id, fingerprint };
          }),
        );

        const fleet = compareFleet(members, { cluster: true });

        const payload = JSON.stringify({
          fleet: {
            members: fleet.members.map((m) => ({
              id: m.id,
              embedding: m.fingerprint.embedding,
              fingerprint: m.fingerprint,
            })),
            pairwise: fleet.pairwise,
            centroid: fleet.centroid,
            spread: fleet.spread,
            clusters: fleet.clusters,
          },
          dimensionRanges: DIMENSION_RANGES,
        });

        const __dirname = dirname(fileURLToPath(import.meta.url));
        const htmlPath = join(__dirname, "viz", "index.html");
        const htmlContent = await readFile(htmlPath, "utf-8");

        const port = Number.parseInt(String(opts.port), 10);

        const server = createServer((req, res) => {
          if (req.url === "/" || req.url === "/index.html") {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(htmlContent);
          } else if (req.url === "/api/data") {
            res.writeHead(200, {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(payload);
          } else {
            res.writeHead(404);
            res.end("Not found");
          }
        });

        server.listen(port, () => {
          const url = `http://localhost:${port}`;
          console.log(`\n  Ghost Viz → ${url}`);
          console.log(`  ${members.length} fingerprints loaded`);
          console.log("  Press Ctrl+C to stop\n");

          // cac negated-boolean options land as `open` (the opposite of --no-open)
          if (opts.open !== false) {
            const cmd =
              process.platform === "darwin"
                ? "open"
                : process.platform === "win32"
                  ? "start"
                  : "xdg-open";
            exec(`${cmd} ${url}`);
          }
        });
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
