"use client";

import { ReactFlowProvider } from "@xyflow/react";
import {
  Badge,
  Button,
  Node,
  NodeContent,
  NodeDescription,
  NodeFooter,
  NodeHeader,
  NodeTitle,
} from "ghost-ui";

export function NodeDemo() {
  return (
    <ReactFlowProvider>
      <div className="flex w-full flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Node handles={{ target: true, source: true }}>
            <NodeHeader>
              <NodeTitle>Full Node</NodeTitle>
              <NodeDescription>
                A node with header, content, and footer
              </NodeDescription>
            </NodeHeader>
            <NodeContent>
              <p className="text-xs text-muted-foreground">
                This node demonstrates all available sub-components arranged
                together. It has both target (left) and source (right) handles.
              </p>
            </NodeContent>
            <NodeFooter>
              <Badge variant="outline">Ready</Badge>
              <Button size="sm" variant="ghost" className="ml-auto">
                Run
              </Button>
            </NodeFooter>
          </Node>

          <Node handles={{ target: false, source: true }}>
            <NodeHeader>
              <NodeTitle>Source Only</NodeTitle>
              <NodeDescription>Starting node in a workflow</NodeDescription>
            </NodeHeader>
            <NodeContent>
              <p className="text-xs text-muted-foreground">
                This node only has a source handle on the right side.
              </p>
            </NodeContent>
          </Node>

          <Node handles={{ target: true, source: false }}>
            <NodeHeader>
              <NodeTitle>Target Only</NodeTitle>
              <NodeDescription>Terminal node in a workflow</NodeDescription>
            </NodeHeader>
            <NodeContent>
              <p className="text-xs text-muted-foreground">
                This node only has a target handle on the left side.
              </p>
            </NodeContent>
          </Node>

          <Node handles={{ target: false, source: false }}>
            <NodeHeader>
              <NodeTitle>Standalone</NodeTitle>
              <NodeDescription>No handles</NodeDescription>
            </NodeHeader>
            <NodeContent>
              <p className="text-xs text-muted-foreground">
                A standalone card-style node with no connection handles.
              </p>
            </NodeContent>
            <NodeFooter>
              <Badge variant="secondary">Idle</Badge>
            </NodeFooter>
          </Node>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
