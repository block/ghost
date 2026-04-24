"use client";

import { Image } from "ghost-ui";

// A tiny 1x1 transparent PNG placeholder
const PLACEHOLDER_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

export function ImageDemo() {
  return (
    <div className="flex w-full flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Renders an AI-generated image from base64 data. The component
        automatically constructs a data URI from the provided media type and
        base64 string.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Image
            base64={PLACEHOLDER_BASE64}
            uint8Array={new Uint8Array()}
            mediaType="image/png"
            alt="AI-generated landscape placeholder"
            className="aspect-video w-full object-cover"
          />
          <span className="text-xs text-muted-foreground">
            PNG, landscape aspect ratio
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Image
            base64={PLACEHOLDER_BASE64}
            uint8Array={new Uint8Array()}
            mediaType="image/png"
            alt="AI-generated portrait placeholder"
            className="aspect-square w-full object-cover"
          />
          <span className="text-xs text-muted-foreground">
            PNG, square aspect ratio
          </span>
        </div>
      </div>
    </div>
  );
}
