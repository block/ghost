import { appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GHOST_EVENTS_FILENAME } from "./scan/constants.js";

export type GatherObservabilityEvent = {
  ts: string;
  event: "gather";
  ask?: string;
  menu: string[];
  materials?: string[];
  wild?: boolean;
  wildIds?: string[];
};

export type PullMiss = {
  requested: string;
  suggested: string[];
};

export type PullObservabilityEvent = {
  ts: string;
  event: "pull";
  ids: string[];
  wildIds?: string[];
  missed?: PullMiss[];
  inlinedMaterials?: number;
  omittedMaterials?: number;
};

export type GhostObservabilityEvent =
  | GatherObservabilityEvent
  | PullObservabilityEvent;

export type NewGhostObservabilityEvent =
  | Omit<GatherObservabilityEvent, "ts">
  | Omit<PullObservabilityEvent, "ts">;

export async function appendGhostEvent(
  packageDir: string,
  event: NewGhostObservabilityEvent,
): Promise<void> {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...event })}\n`;
  try {
    await appendFile(join(packageDir, GHOST_EVENTS_FILENAME), line, "utf8");
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
