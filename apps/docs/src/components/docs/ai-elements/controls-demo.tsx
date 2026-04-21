"use client";

import { type NodeTypes, ReactFlowProvider } from "@xyflow/react";
import {
  Canvas,
  Controls,
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "ghost-ui";
import { useMemo } from "react";

const SampleNode = () => (
  <Node handles={{ target: false, source: false }}>
    <NodeHeader>
      <NodeTitle>Sample Node</NodeTitle>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Use the controls in the bottom-left to zoom, fit view, and lock
        interactions.
      </p>
    </NodeContent>
  </Node>
);

const initialNodes = [
  { id: "1", type: "sample", position: { x: 0, y: 0 }, data: {} },
  { id: "2", type: "sample", position: { x: 400, y: 150 }, data: {} },
];

export function ControlsDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      sample: SampleNode,
    }),
    [],
  );

  return (
    <ReactFlowProvider>
      <div className="h-[350px] w-full overflow-hidden rounded-md border">
        <Canvas nodes={initialNodes} edges={[]} nodeTypes={nodeTypes}>
          <Controls />
        </Canvas>
      </div>
    </ReactFlowProvider>
  );
}
