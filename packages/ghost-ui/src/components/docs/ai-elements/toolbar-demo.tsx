"use client";

import { type NodeTypes, ReactFlowProvider } from "@xyflow/react";
import { CopyIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import { Canvas } from "@/components/ai-elements/canvas";
import {
  Node,
  NodeContent,
  NodeHeader,
  NodeTitle,
} from "@/components/ai-elements/node";
import { Toolbar } from "@/components/ai-elements/toolbar";
import { Button } from "@/components/ui/button";

const ToolbarNode = () => (
  <Node handles={{ target: false, source: false }}>
    <NodeHeader>
      <NodeTitle>Select this node</NodeTitle>
    </NodeHeader>
    <NodeContent>
      <p className="text-xs text-muted-foreground">
        Click to select and reveal the toolbar below.
      </p>
    </NodeContent>
    <Toolbar>
      <Button size="icon-sm" variant="ghost">
        <PencilIcon className="size-3.5" />
      </Button>
      <Button size="icon-sm" variant="ghost">
        <CopyIcon className="size-3.5" />
      </Button>
      <Button size="icon-sm" variant="ghost">
        <Trash2Icon className="size-3.5" />
      </Button>
    </Toolbar>
  </Node>
);

const initialNodes = [
  {
    id: "1",
    type: "toolbar",
    position: { x: 100, y: 60 },
    data: {},
    selected: true,
  },
];

export function ToolbarDemo() {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      toolbar: ToolbarNode,
    }),
    [],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        A floating toolbar that appears below a selected node, providing
        contextual actions.
      </p>
      <ReactFlowProvider>
        <div className="h-[300px] w-full overflow-hidden rounded-md border">
          <Canvas nodes={initialNodes} edges={[]} nodeTypes={nodeTypes} />
        </div>
      </ReactFlowProvider>
    </div>
  );
}
