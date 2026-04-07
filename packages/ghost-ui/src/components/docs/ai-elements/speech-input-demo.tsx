"use client";

import { useState } from "react";
import { SpeechInput } from "@/components/ai-elements/speech-input";

export function SpeechInputDemo() {
  const [transcript, setTranscript] = useState("");

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <p className="text-sm text-muted-foreground">
        Click the microphone button to begin recording. Uses the Web Speech API
        when available, with a MediaRecorder fallback.
      </p>

      <SpeechInput
        size="lg"
        onTranscriptionChange={(text) =>
          setTranscript((prev) => (prev ? `${prev} ${text}` : text))
        }
      />

      <div className="w-full max-w-md rounded-md border p-4 text-sm">
        <p className="mb-1 font-medium">Transcription output</p>
        <p className="text-muted-foreground">
          {transcript || "Transcribed text will appear here..."}
        </p>
      </div>
    </div>
  );
}
