import * as React from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
export function ScrollAreaDemo() {
  return (
    <div className="flex flex-col gap-6">
      <ScrollAreaVertical />
      <ScrollAreaHorizontalDemo />
    </div>
  );
}

const tags = Array.from({ length: 50 }).map(
  (_, i, a) => `v1.2.0-beta.${a.length - i}`,
);

function ScrollAreaVertical() {
  return (
    <div className="flex flex-col gap-6">
      <ScrollArea className="h-72 w-48 rounded-md border">
        <div className="p-4">
          <h4 className="mb-4 text-sm font-display font-semibold leading-none">
            Tags
          </h4>
          {tags.map((tag) => (
            <React.Fragment key={tag}>
              <div className="text-sm">{tag}</div>
              <Separator className="my-2" />
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export const works = [
  {
    artist: "Placeholder Name",
  },
  {
    artist: "Placeholder Name",
  },
  {
    artist: "Placeholder Name",
  },
] as const;

function ScrollAreaHorizontalDemo() {
  return (
    <ScrollArea className="w-full max-w-96 rounded-md border p-4">
      <div className="flex gap-4">
        {works.map((artwork, index) => (
          <figure key={index} className="shrink-0">
            <div className="overflow-hidden rounded-md">
              <img
                src="/placeholder.svg"
                alt="placeholder"
                className="aspect-[3/4] h-fit w-fit object-cover"
              />
            </div>
            <figcaption className="text-muted-foreground pt-2 text-xs">
              Photo by{" "}
              <span className="text-foreground font-medium">
                {artwork.artist}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
