"use client";

import { Checkpoint, CheckpointIcon, CheckpointTrigger } from "ghost-ui";

export function CheckpointDemo() {
  return (
    <div className="space-y-6">
      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Restore to this checkpoint">
          Checkpoint 1 — Initial draft
        </CheckpointTrigger>
      </Checkpoint>

      <div className="rounded-lg bg-muted/50 p-4 text-muted-foreground text-sm">
        Some conversation content between checkpoints...
      </div>

      <Checkpoint>
        <CheckpointIcon />
        <CheckpointTrigger tooltip="Restore to this checkpoint">
          Checkpoint 2 — After revisions
        </CheckpointTrigger>
      </Checkpoint>
    </div>
  );
}
