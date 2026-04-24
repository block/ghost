"use client";

import { type NodeTypes, ReactFlowProvider } from "@xyflow/react";
import {
  Canvas,
  Connection,
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "ghost-ui";
import { useMemo } from "react";

const SourceNode = () => (
  <Node handles={{ target: false, source: true }}>
    <NodeHeader>
      <NodeTitle>Source</NodeTitle>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Drag from the handle to see the custom connection line.
      </p>
    </NodeContent>
  </Node>
);

const TargetNode = () => (
  <Node handles={{ target: true, source: false }}>
    <NodeHeader>
      <NodeTitle>Target</NodeTitle>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">Drop a connection here.</p>
    </NodeContent>
  </Node>
);

const initialNodes = [
  { id: "1", type: "source", position: { x: 0, y: 80 }, data: {} },
  { id: "2", type: "target", position: { x: 500, y: 80 }, data: {} },
];

export function ConnectionDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      source: SourceNode,
      target: TargetNode,
    }),
    [],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Drag from the source handle to see the animated bezier connection line
        with a circular endpoint indicator.
      </p>
      <ReactFlowProvider>
        <div className="h-[300px] w-full overflow-hidden rounded-md border">
          <Canvas
            nodes={initialNodes}
            edges={[]}
            nodeTypes={nodeTypes}
            connectionLineComponent={Connection}
          />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
