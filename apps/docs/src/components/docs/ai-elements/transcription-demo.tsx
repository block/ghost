"use client";

import { Button, Transcription, TranscriptionSegment } from "ghost-ui";
import { useState } from "react";

const mockSegments = [
  { text: "Welcome to the demo.", startSecond: 0, endSecond: 2 },
  { text: " Today we are looking at", startSecond: 2, endSecond: 4 },
  { text: " the transcription component,", startSecond: 4, endSecond: 6 },
  { text: " which highlights words", startSecond: 6, endSecond: 8 },
  { text: " as audio plays.", startSecond: 8, endSecond: 10 },
  { text: " Each segment is clickable", startSecond: 10, endSecond: 12 },
  { text: " and can seek to", startSecond: 12, endSecond: 14 },
  { text: " the corresponding position", startSecond: 14, endSecond: 16 },
  { text: " in the audio track.", startSecond: 16, endSecond: 18 },
];

export function TranscriptionDemo() {
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentTime((t) => Math.max(0, t - 2))}
        >
          -2s
        </Button>
        <span className="min-w-16 text-center text-sm tabular-nums">
          {currentTime.toFixed(1)}s
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentTime((t) => Math.min(18, t + 2))}
        >
          +2s
        </Button>
      </div>

      <Transcription
        segments={mockSegments}
        currentTime={currentTime}
        onSeek={setCurrentTime}
      >
        {(segment, index) => (
          <TranscriptionSegment key={index} segment={segment} index={index} />
        )}
      </Transcription>
    </div>
  );
}
