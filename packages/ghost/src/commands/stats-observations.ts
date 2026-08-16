import type { GhostObservabilityEvent } from "../observability-events.js";

export type StatsObservation = {
  kind: "pull-without-gather";
  run?: string;
  ts: string;
  detail: string;
};

type Group = {
  run?: string;
  events: GhostObservabilityEvent[];
};

export function buildStatsObservations(
  events: GhostObservabilityEvent[],
): StatsObservation[] {
  const observations: StatsObservation[] = [];
  for (const group of partitionByRun(events)) {
    observations.push(...observeGroup(group));
  }
  return observations;
}

function partitionByRun(events: GhostObservabilityEvent[]): Group[] {
  const groups = new Map<string, Group>();
  for (const event of events) {
    const key = event.run ?? "";
    let group = groups.get(key);
    if (!group) {
      group = { ...(event.run ? { run: event.run } : {}), events: [] };
      groups.set(key, group);
    }
    group.events.push(event);
  }
  return [...groups.values()];
}

function observeGroup(group: Group): StatsObservation[] {
  const observations: StatsObservation[] = [];
  let sawGather = false;

  for (const event of group.events) {
    if (event.event === "gather") {
      sawGather = true;
      continue;
    }

    if (event.event === "pull" && !sawGather) {
      observations.push({
        kind: "pull-without-gather",
        ...runPart(group),
        ts: event.ts,
        detail: "pull had no prior gather in this run",
      });
    }
  }

  return observations;
}

function runPart(group: Group): { run?: string } {
  return group.run ? { run: group.run } : {};
}

export function formatStatsObservation(observation: StatsObservation): string {
  const run = observation.run ? `run \`${observation.run}\`: ` : "";
  return `${run}pull at ${observation.ts} had no prior gather in this run.`;
}
