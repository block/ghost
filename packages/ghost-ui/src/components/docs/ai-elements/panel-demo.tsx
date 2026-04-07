"use client";

import { type NodeTypes, ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import {
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Panel } from "@/components/ai-elements/panel";

const PlaceholderNode = () => (
  <Node handles={{ target: false, source: false }}>
    <NodeHeader>
      <NodeTitle>Workflow Node</NodeTitle>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Panels float above the canvas at fixed positions.
      </p>
    </NodeContent>
  </Node>
);

const initialNodes = [
  { id: "1", type: "placeholder", position: { x: 100, y: 80 }, data: {} },
];

export function PanelDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      placeholder: PlaceholderNode,
    }),
    [],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Panels are floating overlays positioned at the edges of the canvas.
      </p>
      <ReactFlowProvider>
        <div className="h-[350px] w-full overflow-hidden rounded-md border">
          <Canvas nodes={initialNodes} edges={[]} nodeTypes={nodeTypes}>
            <Panel position="top-left">
              <span className="text-xs font-medium">Top Left Panel</span>
            </Panel>
            <Panel position="top-right">
              <span className="text-xs font-medium">Top Right Panel</span>
            </Panel>
            <Panel position="bottom-center">
              <span className="text-xs font-medium">Bottom Center Panel</span>
            </Panel>
          </Canvas>
        </div>
      </ReactFlowProvider>
    </div>
  );
}
