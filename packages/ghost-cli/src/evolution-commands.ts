import { resolve } from "node:path";
import type { DimensionStance, Target } from "@ghost/core";
import {
  acknowledge,
  FINGERPRINT_FILENAME,
  loadConfig,
  loadFingerprint,
  resolveParent,
} from "@ghost/core";
import type { CAC } from "cac";

async function loadLocalExpression() {
  const path = resolve(process.cwd(), FINGERPRINT_FILENAME);
  const { fingerprint } = await loadFingerprint(path);
  return fingerprint;
}

export function registerAckCommand(cli: CAC): void {
  cli
    .command(
      "ack",
      "Acknowledge current drift — record intentional stance toward parent",
    )
    .option("-c, --config <path>", "Path to ghost config file")
    .option("-d, --dimension <name>", "Acknowledge a specific dimension only")
    .option("--stance <stance>", "Stance: aligned, accepted, or diverging", {
      default: "accepted",
    })
    .option("--reason <text>", "Reason for this acknowledgment")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (opts) => {
      try {
        const config = await loadConfig(opts.config);

        if (!config.parent) {
          console.error(
            "Error: No parent declared. Set `parent` in ghost.config.ts or use --parent.",
          );
          process.exit(2);
        }

        const parentFp = await resolveParent(config.parent);
        const childFp = await loadLocalExpression();

        const { manifest, comparison } = await acknowledge({
          child: childFp,
          parent: parentFp,
          parentRef: config.parent,
          dimension: opts.dimension,
          stance: opts.stance as DimensionStance,
          reason: opts.reason,
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        } else {
          console.log(
            `Acknowledged drift from "${manifest.parentFingerprintId}"`,
          );
          console.log(`Overall distance: ${comparison.distance.toFixed(3)}`);
          console.log();
          for (const [key, ack] of Object.entries(manifest.dimensions)) {
            const marker =
              ack.stance === "aligned"
                ? "="
                : ack.stance === "diverging"
                  ? "~"
                  : "*";
            const reasonSuffix = ack.reason ? ` (${ack.reason})` : "";
            console.log(
              `  ${marker} ${key}: ${ack.distance.toFixed(3)} [${ack.stance}]${reasonSuffix}`,
            );
          }
          console.log();
          console.log("Written to .ghost-sync.json");
        }

        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

export function registerAdoptCommand(cli: CAC): void {
  cli
    .command(
      "adopt <source>",
      "Shift parent reference — adopt a new fingerprint as baseline",
    )
    .option("-d, --dimension <name>", "Adopt only for a specific dimension")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (source: string, opts) => {
      try {
        const { fingerprint: newParent } = await loadFingerprint(source);
        const childFp = await loadLocalExpression();

        const newParentRef: Target = { type: "path", value: source };

        const { manifest, comparison } = await acknowledge({
          child: childFp,
          parent: newParent,
          parentRef: newParentRef,
          dimension: opts.dimension,
          stance: "accepted",
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        } else {
          console.log(`Adopted "${newParent.id}" as parent baseline`);
          console.log(`New distance: ${comparison.distance.toFixed(3)}`);
          console.log();
          for (const [key, delta] of Object.entries(comparison.dimensions)) {
            console.log(`  ${key}: ${delta.distance.toFixed(3)}`);
          }
          console.log();
          console.log("Updated .ghost-sync.json");
        }

        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}

export function registerDivergeCommand(cli: CAC): void {
  cli
    .command(
      "diverge <dimension>",
      "Declare intentional divergence on a dimension",
    )
    .option("-c, --config <path>", "Path to ghost config file")
    .option(
      "-r, --reason <text>",
      "Why this dimension is intentionally diverging",
    )
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dimension: string, opts) => {
      try {
        const config = await loadConfig(opts.config);

        if (!config.parent) {
          console.error(
            "Error: No parent declared. Set `parent` in ghost.config.ts or use --parent.",
          );
          process.exit(2);
        }

        const parentFp = await resolveParent(config.parent);
        const childFp = await loadLocalExpression();

        const { manifest } = await acknowledge({
          child: childFp,
          parent: parentFp,
          parentRef: config.parent,
          dimension,
          stance: "diverging",
          reason: opts.reason,
        });

        const ack = manifest.dimensions[dimension];

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        } else {
          console.log(`Marked "${dimension}" as intentionally diverging`);
          if (ack) {
            console.log(`  Distance: ${ack.distance.toFixed(3)}`);
          }
          if (opts.reason) {
            console.log(`  Reason: ${opts.reason}`);
          }
          console.log();
          console.log("Updated .ghost-sync.json");
        }

        process.exit(0);
      } catch (err) {
        console.error(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        process.exit(2);
      }
    });
}
