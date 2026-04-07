"use client";

import {
  type EdgeTypes,
  type NodeTypes,
  ReactFlowProvider,
} from "@xyflow/react";
import { useMemo } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import { Edge } from "@/components/ai-elements/edge";
import { Node, NodeHeader, NodeTitle } from "@/components/ai-elements/node";

const SimpleNode = ({ data }: { data: { label: string } }) => (
  <Node handles={{ target: true, source: true }}>
    <NodeHeader>
      <NodeTitle>{data.label}</NodeTitle>
    </NodeHeader>
  </Node>
);

const initialNodes = [
  {
    id: "a1",
    type: "simple",
    position: { x: 0, y: 0 },
    data: { label: "Start" },
  },
  {
    id: "a2",
    type: "simple",
    position: { x: 450, y: 0 },
    data: { label: "Animated" },
  },
  {
    id: "b1",
    type: "simple",
    position: { x: 0, y: 150 },
    data: { label: "Draft" },
  },
  {
    id: "b2",
    type: "simple",
    position: { x: 450, y: 150 },
    data: { label: "Temporary" },
  },
];

const initialEdges = [
  { id: "e-animated", source: "a1", target: "a2", type: "animated" },
  { id: "e-temporary", source: "b1", target: "b2", type: "temporary" },
];

export function EdgeDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      simple: SimpleNode,
    }),
    [],
  );

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      animated: Edge.Animated,
      temporary: Edge.Temporary,
    }),
    [],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Two edge variants: <strong>Animated</strong> (top, with a traveling dot)
        and <strong>Temporary</strong> (bottom, dashed line).
      </p>
      <ReactFlowProvider>
        <div className="h-[350px] w-full overflow-hidden rounded-md border">
          <Canvas
            nodes={initialNodes}
            edges={initialEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
          />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
