import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { CAC } from "cac";
import { loadComparableFingerprint } from "./comparable-fingerprint.js";
import type { DimensionStance, Target } from "./core/index.js";
import {
  acknowledge,
  loadConfig,
  resolveTrackedFingerprint,
} from "./core/index.js";

const DEFAULT_SYNC_PATH = ".ghost-sync.json";

async function loadLocalFingerprint(localPath?: string) {
  return loadComparableFingerprint(localPath ?? ".ghost");
}

// resolveTracks gives ack/diverge the same escape hatch drift check already
// has: an explicit --tracked path wins over ghost.config.* `tracks`, so stance
// verbs work in every invocation pattern the drift gate accepts. Throws when
// neither is available; the command's catch handler prints and exits 2.
async function resolveTracks(opts: {
  tracked?: string;
  config?: string;
}): Promise<Target> {
  if (opts.tracked) {
    return { type: "path", value: opts.tracked };
  }
  const config = await loadConfig(opts.config);
  if (!config.tracks) {
    throw new Error(
      "No tracked fingerprint declared. Set `tracks` in ghost.config.ts or pass --tracked <path>.",
    );
  }
  return config.tracks;
}

async function loadTrackedComparableFingerprint(
  target: Target,
): Promise<Awaited<ReturnType<typeof loadComparableFingerprint>>> {
  if (target.type === "path") return loadComparableFingerprint(target.value);
  if (target.type === "npm") {
    const packageGhostDir = resolve("node_modules", target.value, ".ghost");
    if (
      existsSync(resolve(packageGhostDir, "fingerprint", "manifest.yml")) ||
      existsSync(resolve(packageGhostDir, "fingerprint.md"))
    ) {
      return loadComparableFingerprint(packageGhostDir);
    }
    return resolveTrackedFingerprint(target);
  }
  return resolveTrackedFingerprint(target);
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
    .option("--local <path>", "Local fingerprint or bundle (default: .ghost)")
    .option(
      "--tracked <path>",
      "Tracked/reference fingerprint or bundle (overrides config tracks)",
    )
    .option("--sync <path>", "Sync manifest path (default: ./.ghost-sync.json)")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (opts) => {
      try {
        const tracks = await resolveTracks(opts);
        const trackedFingerprint =
          await loadTrackedComparableFingerprint(tracks);
        const localFingerprint = await loadLocalFingerprint(opts.local);

        const { manifest, comparison } = await acknowledge({
          local: localFingerprint,
          tracked: trackedFingerprint,
          tracks,
          dimension: opts.dimension,
          stance: opts.stance as DimensionStance,
          reason: opts.reason,
          syncPath: opts.sync,
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
          console.log(`Written to ${opts.sync ?? DEFAULT_SYNC_PATH}`);
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
        const trackedFingerprint = await loadComparableFingerprint(source);
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
    .option("--local <path>", "Local fingerprint or bundle (default: .ghost)")
    .option(
      "--tracked <path>",
      "Tracked/reference fingerprint or bundle (overrides config tracks)",
    )
    .option("--sync <path>", "Sync manifest path (default: ./.ghost-sync.json)")
    .option("--format <fmt>", "Output format: cli or json", { default: "cli" })
    .action(async (dimension: string, opts) => {
      try {
        const tracks = await resolveTracks(opts);
        const trackedFingerprint =
          await loadTrackedComparableFingerprint(tracks);
        const localFingerprint = await loadLocalFingerprint(opts.local);

        const { manifest } = await acknowledge({
          local: localFingerprint,
          tracked: trackedFingerprint,
          tracks,
          dimension,
          stance: "diverging",
          reason: opts.reason,
          syncPath: opts.sync,
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
          console.log(`Updated ${opts.sync ?? DEFAULT_SYNC_PATH}`);
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
