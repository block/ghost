import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

export function openRun(config, arm, askN, runK) {
  mkdirSync(config.out, { recursive: true });
  const lock = lockPath(config);
  if (existsSync(lock)) {
    console.error(
      `steering-control: run lock exists at ${lock}; finish or remove it before opening another run`,
    );
    process.exit(1);
  }
  const tapeOffset = arm === "gather" ? tapeLength(config) : 0;
  writeFileSync(
    lock,
    JSON.stringify(
      { arm, askN: Number(askN), runK: Number(runK), tapeOffset },
      null,
      2,
    ),
    "utf8",
  );
}

export function closeRun(config) {
  const lock = lockPath(config);
  if (!existsSync(lock)) throw new Error(`no open run lock at ${lock}`);
  const run = JSON.parse(readFileSync(lock, "utf8"));
  const events =
    run.arm === "gather" ? readEventsSlice(config, run.tapeOffset ?? 0) : [];
  unlinkSync(lock);
  const pullEvents = events.filter(
    (event) => event.event === "pull" && Array.isArray(event.ids),
  );
  return {
    events,
    pulledIds: [...new Set(pullEvents.flatMap((event) => event.ids))],
    pullCount: pullEvents.length,
  };
}

function readEventsSlice(config, offset) {
  const path = tapePath(config);
  if (!existsSync(path)) return [];
  const sliced = readFileSync(path).subarray(offset).toString("utf8");
  const events = [];
  for (const line of sliced.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch {
      // Ignore partial or malformed tape lines from unrelated local use.
    }
  }
  return events;
}

function tapeLength(config) {
  const path = tapePath(config);
  return existsSync(path) ? statSync(path).size : 0;
}

function tapePath(config) {
  return join(config.package, ".events");
}
function lockPath(config) {
  return join(config.out, ".run.lock");
}
