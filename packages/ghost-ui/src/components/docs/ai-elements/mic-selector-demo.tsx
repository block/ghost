"use client";

import {
  MicSelector,
  MicSelectorContent,
  MicSelectorEmpty,
  MicSelectorInput,
  MicSelectorItem,
  MicSelectorLabel,
  MicSelectorList,
  MicSelectorTrigger,
  MicSelectorValue,
} from "@/components/ai-elements/mic-selector";

export function MicSelectorDemo() {
  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Opens a popover listing available audio input devices. Requires
        microphone permission to show device names.
      </p>
      <MicSelector>
        <MicSelectorTrigger className="w-full max-w-sm justify-start">
          <MicSelectorValue />
        </MicSelectorTrigger>
        <MicSelectorContent>
          <MicSelectorInput />
          <MicSelectorList>
            {(devices) =>
              devices.length === 0 ? (
                <MicSelectorEmpty />
              ) : (
                devices.map((device) => (
                  <MicSelectorItem
                    key={device.deviceId}
                    value={device.deviceId}
                  >
                    <MicSelectorLabel device={device} />
                  </MicSelectorItem>
                ))
              )
            }
          </MicSelectorList>
        </MicSelectorContent>
      </MicSelector>
    </div>
  );
}
