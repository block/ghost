import type { CAC } from "cac";
import { loadFingerprint, resolveFingerprintPackage } from "#scan";
import type { DimensionStance, Target } from "./core/index.js";
import {
  acknowledge,
  loadConfig,
  resolveTrackedFingerprint,
} from "./core/index.js";

async function loadLocalFingerprint() {
  const path = resolveFingerprintPackage(undefined, process.cwd()).fingerprint;
  const { fingerprint } = await loadFingerprint(path);
  return fingerprint;
}

export function registerAckCommand(cli: CAC): void {
  cli
    .command(
      "ack",
      "Acknowledge current drift — record intentional stance toward the tracked fingerprint",
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

        if (!config.tracks) {
          console.error(
            "Error: No tracked fingerprint declared. Set `tracks` in ghost.config.ts.",
          );
          process.exit(2);
        }

        const trackedFingerprint = await resolveTrackedFingerprint(
          config.tracks,
        );
        const localFingerprint = await loadLocalFingerprint();

        const { manifest, comparison } = await acknowledge({
          local: localFingerprint,
          tracked: trackedFingerprint,
          tracks: config.tracks,
          dimension: opts.dimension,
          stance: opts.stance as DimensionStance,
          reason: opts.reason,
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        } else {
          console.log(
            `Acknowledged drift from "${manifest.trackedFingerprintId}"`,
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

export function registerTrackCommand(cli: CAC): void {
  cli
    .command(
      "track <fingerprint>",
      "Track another fingerprint as this repo's reference",
    )
    .option("-d, --dimension <name>", "Track only for a specific dimension")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (source: string, opts) => {
      try {
        const { fingerprint: trackedFingerprint } =
          await loadFingerprint(source);
        const localFingerprint = await loadLocalFingerprint();

        const tracks: Target = { type: "path", value: source };

        const { manifest, comparison } = await acknowledge({
          local: localFingerprint,
          tracked: trackedFingerprint,
          tracks,
          dimension: opts.dimension,
          stance: "accepted",
        });

        if (opts.format === "json") {
          process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
        } else {
          console.log(`Now tracking "${trackedFingerprint.id}"`);
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

        if (!config.tracks) {
          console.error(
            "Error: No tracked fingerprint declared. Set `tracks` in ghost.config.ts.",
          );
          process.exit(2);
        }

        const trackedFingerprint = await resolveTrackedFingerprint(
          config.tracks,
        );
        const localFingerprint = await loadLocalFingerprint();

        const { manifest } = await acknowledge({
          local: localFingerprint,
          tracked: trackedFingerprint,
          tracks: config.tracks,
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
