import type { WorkbenchTraceGraph, WorkbenchTraceLane } from "../shared";

export interface WorkbenchTraceLayout {
  height: number;
  lanes: WorkbenchTraceLane[];
  lanePositions: Map<string, { x: number }>;
  positions: Map<string, { x: number; y: number }>;
  width: number;
}

export function buildTraceLayout(
  trace: WorkbenchTraceGraph,
): WorkbenchTraceLayout {
  const lanes = trace.lanes.filter((lane) =>
    trace.nodes.some((node) => node.lane === lane.id),
  );
  const laneGap = 172;
  const laneGutter = 92;
  const width = Math.max(
    900,
    laneGutter * 2 + Math.max(0, lanes.length - 1) * laneGap,
  );
  const nodesByLane = new Map(
    lanes.map((lane) => [
      lane.id,
      trace.nodes
        .filter((node) => node.lane === lane.id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)),
    ]),
  );
  const maxRows = Math.max(
    1,
    ...[...nodesByLane.values()].map((nodes) => nodes.length),
  );
  const height = 170 + maxRows * 118;
  const lanePositions = new Map<string, { x: number }>();
  const positions = new Map<string, { x: number; y: number }>();

  lanes.forEach((lane, laneIndex) => {
    const x = laneGutter + laneIndex * laneGap;
    lanePositions.set(lane.id, { x });
    const nodes = nodesByLane.get(lane.id) ?? [];
    nodes.forEach((node, rowIndex) => {
      positions.set(node.id, {
        x,
        y: 144 + rowIndex * 118,
      });
    });
  });

  return { height, lanes, lanePositions, positions, width };
}
