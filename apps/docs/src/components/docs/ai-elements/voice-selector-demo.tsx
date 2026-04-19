"use client";

import {
  Button,
  VoiceSelector,
  VoiceSelectorAccent,
  VoiceSelectorAge,
  VoiceSelectorAttributes,
  VoiceSelectorBullet,
  VoiceSelectorContent,
  VoiceSelectorDescription,
  VoiceSelectorEmpty,
  VoiceSelectorGender,
  VoiceSelectorGroup,
  VoiceSelectorInput,
  VoiceSelectorItem,
  VoiceSelectorList,
  VoiceSelectorName,
  VoiceSelectorPreview,
  VoiceSelectorSeparator,
  VoiceSelectorTrigger,
} from "@ghost/ui";
import { useState } from "react";

const voices = [
  {
    id: "alloy",
    name: "Alloy",
    gender: "non-binary" as const,
    accent: "american" as const,
    age: "Young Adult",
    description: "Versatile, balanced tone",
  },
  {
    id: "echo",
    name: "Echo",
    gender: "male" as const,
    accent: "american" as const,
    age: "Adult",
    description: "Warm, resonant baritone",
  },
  {
    id: "fable",
    name: "Fable",
    gender: "female" as const,
    accent: "british" as const,
    age: "Adult",
    description: "Expressive storyteller",
  },
  {
    id: "onyx",
    name: "Onyx",
    gender: "male" as const,
    accent: "american" as const,
    age: "Mature",
    description: "Deep, authoritative",
  },
  {
    id: "nova",
    name: "Nova",
    gender: "female" as const,
    accent: "australian" as const,
    age: "Young Adult",
    description: "Bright, energetic",
  },
  {
    id: "shimmer",
    name: "Shimmer",
    gender: "female" as const,
    accent: "irish" as const,
    age: "Adult",
    description: "Soft, calming presence",
  },
];

export function VoiceSelectorDemo() {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        A dialog-based voice picker with search, gender, accent, and preview
        controls.
      </p>

      <VoiceSelector value={selected} onValueChange={setSelected}>
        <VoiceSelectorTrigger asChild>
          <Button variant="outline">
            {selected
              ? (voices.find((v) => v.id === selected)?.name ?? "Select voice")
              : "Select a voice..."}
          </Button>
        </VoiceSelectorTrigger>

        <VoiceSelectorContent title="Choose a Voice">
          <VoiceSelectorInput placeholder="Search voices..." />
          <VoiceSelectorList>
            <VoiceSelectorEmpty>No voices found.</VoiceSelectorEmpty>
            <VoiceSelectorGroup heading="Available Voices">
              {voices.map((voice) => (
                <VoiceSelectorItem
                  key={voice.id}
                  value={voice.id}
                  onSelect={() => setSelected(voice.id)}
                >
                  <div className="flex w-full items-center gap-3">
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <VoiceSelectorName>{voice.name}</VoiceSelectorName>
                        <VoiceSelectorAttributes>
                          <VoiceSelectorGender value={voice.gender} />
                          <VoiceSelectorBullet />
                          <VoiceSelectorAccent value={voice.accent} />
                          <VoiceSelectorBullet />
                          <VoiceSelectorAge>{voice.age}</VoiceSelectorAge>
                        </VoiceSelectorAttributes>
                      </div>
                      <VoiceSelectorDescription>
                        {voice.description}
                      </VoiceSelectorDescription>
                    </div>
                    <VoiceSelectorPreview
                      onPlay={() => {
                        /* no-op in demo */
                      }}
                    />
                  </div>
                </VoiceSelectorItem>
              ))}
            </VoiceSelectorGroup>
            <VoiceSelectorSeparator />
          </VoiceSelectorList>
        </VoiceSelectorContent>
      </VoiceSelector>
    </div>
  );
}
