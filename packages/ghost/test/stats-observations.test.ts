import { describe, expect, it } from "vitest";
import {
  buildStatsObservations,
  formatStatsObservation,
} from "../src/commands/stats-observations.js";
import type { GhostObservabilityEvent } from "../src/observability-events.js";

function event(
  partial: Omit<GhostObservabilityEvent, "ts">,
  index: number,
): GhostObservabilityEvent {
  return {
    ts: `2026-08-15T00:00:0${index}.000Z`,
    ...partial,
  } as GhostObservabilityEvent;
}

describe("stats sequence observations", () => {
  it("reports pull-without-gather with run attribution and partitioning", () => {
    const events: GhostObservabilityEvent[] = [
      event({ event: "pull", run: "r1", ids: ["asset.tokens"] }, 1),
      event({ event: "gather", run: "r2", menu: ["voice"] }, 2),
      event({ event: "pull", run: "r2", ids: ["voice"] }, 3),
      event({ event: "pull", ids: ["brand"] }, 4),
    ];

    const observations = buildStatsObservations(events);

    expect(observations).toEqual([
      expect.objectContaining({
        kind: "pull-without-gather",
        run: "r1",
      }),
      expect.objectContaining({
        kind: "pull-without-gather",
        ts: "2026-08-15T00:00:04.000Z",
      }),
    ]);
    expect(formatStatsObservation(observations[0])).toContain("run `r1`");
  });

  it("returns no observations for gather then pull", () => {
    const events: GhostObservabilityEvent[] = [
      event({ event: "gather", menu: ["asset.tokens"] }, 1),
      event({ event: "pull", ids: ["asset.tokens"] }, 2),
    ];

    expect(buildStatsObservations(events)).toEqual([]);
  });
});
