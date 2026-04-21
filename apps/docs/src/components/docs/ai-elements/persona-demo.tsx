"use client";

import type { PersonaState } from "ghost-ui";
import { Button, Persona } from "ghost-ui";
import { useState } from "react";

const variants = [
  "obsidian",
  "glint",
  "halo",
  "command",
  "mana",
  "opal",
] as const;
const states: PersonaState[] = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "asleep",
];

export function PersonaDemo() {
  const [currentState, setCurrentState] = useState<PersonaState>("idle");

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {states.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={currentState === s ? "default" : "outline"}
            onClick={() => setCurrentState(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-col items-center gap-2">
            <Persona
              variant={variant}
              state={currentState}
              className="size-24"
            />
            <span className="text-xs text-muted-foreground">{variant}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
