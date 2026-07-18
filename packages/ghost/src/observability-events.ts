import { access, appendFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { GHOST_EVENTS_FILENAME } from "./scan/constants.js";

const FIRST_WRITE_NOTICE = `ghost: logging selection events locally to .ghost/${GHOST_EVENTS_FILENAME} (gitignored; never leaves your machine). Summarize with \`ghost pulse\`.`;

export type GatherObservabilityEvent = {
  ts: string;
  event: "gather";
  /** Caller-supplied run identifier (--run or GHOST_RUN_ID); attribution only. */
  run?: string;
  ask?: string;
  menu: string[];
  materials?: string[];
};

export type PullMiss = {
  requested: string;
  suggested: string[];
};

export type PullObservabilityEvent = {
  ts: string;
  event: "pull";
  /** Caller-supplied run identifier (--run or GHOST_RUN_ID); attribution only. */
  run?: string;
  ids: string[];
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

/**
 * Resolve the run identifier for event attribution: explicit --run flag
 * wins, then GHOST_RUN_ID from the environment. Returns undefined when
 * neither is set — the tape line then looks exactly as it does today.
 */
export function resolveRunId(flagValue?: unknown): string | undefined {
  const fromFlag = typeof flagValue === "string" ? flagValue.trim() : "";
  if (fromFlag) return fromFlag;
  const fromEnv = process.env.GHOST_RUN_ID?.trim();
  return fromEnv || undefined;
}

export function stampGhostEvent(
  event: NewGhostObservabilityEvent,
  now: Date = new Date(),
): GhostObservabilityEvent {
  return { ts: now.toISOString(), ...event } as GhostObservabilityEvent;
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
