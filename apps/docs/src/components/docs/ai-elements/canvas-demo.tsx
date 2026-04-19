"use client";

import {
  Canvas,
  Controls,
  Node,
  NodeContent,
  NodeDescription,
  NodeHeader,
  NodeTitle,
} from "@ghost/ui";
import { type NodeTypes, ReactFlowProvider } from "@xyflow/react";
import { useMemo } from "react";

const InputNode = () => (
  <Node handles={{ target: false, source: true }}>
    <NodeHeader>
      <NodeTitle>User Input</NodeTitle>
      <NodeDescription>Text prompt</NodeDescription>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Accepts a natural language query from the user.
      </p>
    </NodeContent>
  </Node>
);

const ProcessNode = () => (
  <Node handles={{ target: true, source: true }}>
    <NodeHeader>
      <NodeTitle>LLM Processing</NodeTitle>
      <NodeDescription>GPT-4o</NodeDescription>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Processes the input and generates a response.
      </p>
    </NodeContent>
  </Node>
);

const OutputNode = () => (
  <Node handles={{ target: true, source: false }}>
    <NodeHeader>
      <NodeTitle>Response</NodeTitle>
      <NodeDescription>Markdown output</NodeDescription>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Displays the generated response to the user.
      </p>
    </NodeContent>
  </Node>
);

const initialNodes = [
  { id: "1", type: "input", position: { x: 0, y: 100 }, data: {} },
  { id: "2", type: "process", position: { x: 500, y: 100 }, data: {} },
  { id: "3", type: "output", position: { x: 1000, y: 100 }, data: {} },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e2-3", source: "2", target: "3" },
];

export function CanvasDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      input: InputNode,
      output: OutputNode,
      process: ProcessNode,
    }),
    [],
  );

  return (
    <ReactFlowProvider>
      <div className="h-[400px] w-full overflow-hidden rounded-md border">
        <Canvas nodes={initialNodes} edges={initialEdges} nodeTypes={nodeTypes}>
          <Controls />
        </Canvas>
      </div>
    </ReactFlowProvider>
  );
}
