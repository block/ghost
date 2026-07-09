import { access, appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GHOST_EVENTS_FILENAME } from "./scan/constants.js";

const FIRST_WRITE_NOTICE = `ghost: logging selection events locally to .ghost/${GHOST_EVENTS_FILENAME} (gitignored; never leaves your machine). Summarize with \`ghost pulse\`.`;

/**
 * Gather event shape used by Ghost observability. The CLI appends these events
 * to `.ghost/.events`; library consumers may construct the same shapes for
 * their own telemetry, but must never write into a fingerprint package
 * directory.
 */
export type GatherObservabilityEvent = {
  ts: string;
  event: "gather";
  ask?: string;
  menu: string[];
  materials?: string[];
  wild?: boolean;
  wildIds?: string[];
};

/**
 * Pull miss shape used by Ghost observability. The CLI appends enclosing pull
 * events to `.ghost/.events`; library consumers may construct the same shapes
 * for their own telemetry, but must never write into a fingerprint package
 * directory.
 */
export type PullMiss = {
  requested: string;
  suggested: string[];
};

/**
 * Pull event shape used by Ghost observability. The CLI appends these events
 * to `.ghost/.events`; library consumers may construct the same shapes for
 * their own telemetry, but must never write into a fingerprint package
 * directory.
 */
export type PullObservabilityEvent = {
  ts: string;
  event: "pull";
  ids: string[];
  wildIds?: string[];
  missed?: PullMiss[];
  inlinedMaterials?: number;
  omittedMaterials?: number;
};

/**
 * Timestamped Ghost observability event. The CLI appends these events to
 * `.ghost/.events`; library consumers may construct the same shapes for their
 * own telemetry, but must never write into a fingerprint package directory.
 */
export type GhostObservabilityEvent =
  | GatherObservabilityEvent
  | PullObservabilityEvent;

/**
 * Untimestamped Ghost observability event input. The CLI timestamps and appends
 * these events to `.ghost/.events`; library consumers may construct the same
 * shapes for their own telemetry, but must never write into a fingerprint
 * package directory.
 */
export type NewGhostObservabilityEvent =
  | Omit<GatherObservabilityEvent, "ts">
  | Omit<PullObservabilityEvent, "ts">;

export function stampGhostEvent(
  event: NewGhostObservabilityEvent,
): GhostObservabilityEvent {
  return { ts: new Date().toISOString(), ...event };
}

export async function appendGhostEvent(
  packageDir: string,
  event: NewGhostObservabilityEvent,
): Promise<void> {
  const line = `${JSON.stringify(stampGhostEvent(event))}\n`;
  const tapePath = join(packageDir, GHOST_EVENTS_FILENAME);
  try {
    const isFirstWrite = await access(tapePath).then(
      () => false,
      () => true,
    );
    await appendFile(tapePath, line, "utf8");
    if (isFirstWrite) {
      // One-time notice on tape creation. Stderr so piped gather/pull
      // output stays clean; silent on every subsequent write.
      process.stderr.write(`${FIRST_WRITE_NOTICE}\n`);
    }
  } catch {
    // Local observability is advisory. It must never break gather/pull.
  }
}

export async function readGhostEvents(
  packageDir: string,
): Promise<GhostObservabilityEvent[]> {
  let raw: string;
  try {
    raw = await readFile(join(packageDir, GHOST_EVENTS_FILENAME), "utf8");
  } catch {
    return [];
  }

  const events: GhostObservabilityEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as unknown;
      if (isGhostEvent(parsed)) events.push(parsed);
    } catch {
      // Ignore malformed events tape lines; pulse should still be useful.
    }
  }
  return events;
}

function isGhostEvent(value: unknown): value is GhostObservabilityEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Record<string, unknown>;
  if (typeof event.ts !== "string") return false;
  if (event.event === "gather") return Array.isArray(event.menu);
  if (event.event === "pull") return Array.isArray(event.ids);
  return false;
}
