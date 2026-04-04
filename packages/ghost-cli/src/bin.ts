#!/usr/bin/env node

import {
  formatCLIReport,
  formatJSONReport,
  loadConfig,
  scan,
} from "@ghost/core";
import { defineCommand, runMain } from "citty";

const scanCommand = defineCommand({
  meta: {
    name: "scan",
    description: "Scan for design drift",
  },
  args: {
    config: {
      type: "string",
      description: "Path to ghost config file",
      alias: "c",
    },
    format: {
      type: "string",
      description: "Output format: cli or json",
      default: "cli",
    },
    "no-color": {
      type: "boolean",
      description: "Disable colored output",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const config = await loadConfig(args.config);
      const report = await scan(config);

      const output =
        args.format === "json"
          ? formatJSONReport(report)
          : formatCLIReport(report);

      process.stdout.write(output);
      process.exit(report.summary.errors > 0 ? 1 : 0);
    } catch (err) {
      console.error(
        `Error: ${err instanceof Error ? err.message : String(err)}`,
      );
      process.exit(2);
    }
  },
});

const main = defineCommand({
  meta: {
    name: "ghost",
    version: "0.1.0",
    description: "Design drift detection",
  },
  subCommands: {
    scan: scanCommand,
  },
});

runMain(main);
