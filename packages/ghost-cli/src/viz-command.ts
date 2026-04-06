import { exec } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DesignFingerprint } from "@ghost/core";
import { compareFleet, DIMENSION_RANGES } from "@ghost/core";
import { defineCommand } from "citty";

export const vizCommand = defineCommand({
  meta: {
    name: "viz",
    description: "Launch interactive 3D visualization of design fingerprints",
  },
  args: {
    fingerprints: {
      type: "positional",
      description: "Paths to fingerprint JSON files (2 or more)",
      required: true,
    },
    port: {
      type: "string",
      description: "Port for the visualization server",
      default: "3333",
    },
    "no-open": {
      type: "boolean",
      description: "Don't auto-open browser",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const vizIdx = process.argv.indexOf("viz");
      const paths: string[] = [];
      for (let i = vizIdx + 1; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith("-")) break;
        paths.push(arg);
      }

      if (paths.length < 2) {
        console.error("Error: viz requires at least 2 fingerprint paths");
        process.exit(2);
      }

      const members = await Promise.all(
        paths.map(async (p) => {
          const data = await readFile(p, "utf-8");
          const fingerprint: DesignFingerprint = JSON.parse(data);
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

      const port = Number.parseInt(args.port, 10);

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

        if (!args["no-open"]) {
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
  },
});
