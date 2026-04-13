import { readFile } from "node:fs/promises";
import type { DesignFingerprint, DimensionStance, Target } from "@ghost/core";
import {
  acknowledge,
  compareFleet,
  formatFleetComparison,
  formatFleetComparisonJSON,
  loadConfig,
  profile,
  resolveParent,
} from "@ghost/core";
import { defineCommand } from "citty";

export const ackCommand = defineCommand({
  meta: {
    name: "ack",
    description:
      "Acknowledge current drift — record intentional stance toward parent",
  },
  args: {
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    dimension: {
      type: "string",
      description: "Acknowledge a specific dimension only",
      alias: "d",
    },
    stance: {
      type: "string",
      description: "Stance: aligned, accepted, or diverging",
      default: "accepted",
    },
    reason: {
      type: "string",
      description: "Reason for this acknowledgment",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig(args.config);

      if (!config.parent) {
        console.error(
          "Error: No parent declared. Set `parent` in ghost.config.ts or use --parent.",
        );
        process.exit(2);
      }

      const parentFp = await resolveParent(config.parent);
      const childFp = await profile(config);

      const { manifest, comparison } = await acknowledge({
        child: childFp,
        parent: parentFp,
        parentRef: config.parent,
        dimension: args.dimension,
        stance: args.stance as DimensionStance,
        reason: args.reason,
      });

      if (args.format === "json") {
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
  },
});

export const adoptCommand = defineCommand({
  meta: {
    name: "adopt",
    description: "Shift parent reference — adopt a new fingerprint as baseline",
  },
  args: {
    source: {
      type: "positional",
      description:
        "Path to the fingerprint JSON to adopt as the new parent baseline",
      required: true,
    },
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    dimension: {
      type: "string",
      description: "Adopt only for a specific dimension",
      alias: "d",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const sourceData = await readFile(args.source, "utf-8");
      const newParent: DesignFingerprint = JSON.parse(sourceData);

      const config = await loadConfig(args.config);
      const childFp = await profile(config);

      const newParentRef: Target = { type: "path", value: args.source };

      const { manifest, comparison } = await acknowledge({
        child: childFp,
        parent: newParent,
        parentRef: newParentRef,
        dimension: args.dimension,
        stance: "accepted",
      });

      if (args.format === "json") {
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
  },
});

export const divergeCommand = defineCommand({
  meta: {
    name: "diverge",
    description: "Declare intentional divergence on a dimension",
  },
  args: {
    dimension: {
      type: "positional",
      description: "The dimension to mark as intentionally diverging",
      required: true,
    },
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    reason: {
      type: "string",
      description: "Why this dimension is intentionally diverging",
      alias: "r",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig(args.config);

      if (!config.parent) {
        console.error(
          "Error: No parent declared. Set `parent` in ghost.config.ts or use --parent.",
        );
        process.exit(2);
      }

      const parentFp = await resolveParent(config.parent);
      const childFp = await profile(config);

      const { manifest } = await acknowledge({
        child: childFp,
        parent: parentFp,
        parentRef: config.parent,
        dimension: args.dimension,
        stance: "diverging",
        reason: args.reason,
      });

      const ack = manifest.dimensions[args.dimension];

      if (args.format === "json") {
        process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
      } else {
        console.log(`Marked "${args.dimension}" as intentionally diverging`);
        if (ack) {
          console.log(`  Distance: ${ack.distance.toFixed(3)}`);
        }
        if (args.reason) {
          console.log(`  Reason: ${args.reason}`);
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
  },
});

export const fleetCommand = defineCommand({
  meta: {
    name: "fleet",
    description: "Compare N fingerprints for an ecosystem-level view",
  },
  args: {
    fingerprints: {
      type: "positional",
      description: "Paths to fingerprint JSON files (2 or more)",
      required: true,
    },
    cluster: {
      type: "boolean",
      description: "Include cluster analysis",
      default: false,
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
  },
  async run({ args }) {
    try {
      // citty gives us the first positional arg; remaining are in process.argv
      // Parse all positional args after "fleet"
      const fleetIdx = process.argv.indexOf("fleet");
      const paths: string[] = [];
      for (let i = fleetIdx + 1; i < process.argv.length; i++) {
        const arg = process.argv[i];
        if (arg.startsWith("-")) break;
        paths.push(arg);
      }

      if (paths.length < 2) {
        console.error("Error: fleet requires at least 2 fingerprint paths");
        process.exit(2);
      }

      const members = await Promise.all(
        paths.map(async (p) => {
          const data = await readFile(p, "utf-8");
          const fingerprint: DesignFingerprint = JSON.parse(data);
          return { id: fingerprint.id, fingerprint };
        }),
      );

      const fleet = compareFleet(members, { cluster: args.cluster });

      const output =
        args.format === "json"
          ? formatFleetComparisonJSON(fleet)
          : formatFleetComparison(fleet);

      process.stdout.write(`${output}\n`);
      process.exit(0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  },
});
