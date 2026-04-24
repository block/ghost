import { AspectRatio } from "ghost-ui";

export function AspectRatioDemo() {
  return (
    <div className="grid w-full max-w-sm items-start gap-4">
      <AspectRatio ratio={16 / 9} className="bg-muted rounded-lg">
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
          16:9
        </div>
      </AspectRatio>
      <AspectRatio ratio={1 / 1} className="bg-muted rounded-lg">
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm">
          1:1
        </div>
      </AspectRatio>
    </div>
  );
}
