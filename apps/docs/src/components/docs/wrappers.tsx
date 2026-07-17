import { cn } from "@design-intelligence/vessel-react";
import type { ComponentProps } from "react";

interface SectionWrapperProps extends ComponentProps<"div"> {
  withCane?: boolean;
}

function SectionWrapper({
  children,
  className,
  withCane: _withCane = false,
  ...props
}: SectionWrapperProps) {
  return (
    <div
      className={cn("doc-frame relative px-[2ch] py-4 sm:px-[4ch]", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface ContainerWrapperProps extends ComponentProps<"div"> {
  withCane?: boolean;
  inverse?: boolean;
}

function ContainerWrapper({
  children,
  className,
  withCane: _withCane = false,
  inverse = false,
  ...props
}: ContainerWrapperProps) {
  return (
    <div
      className={cn(
        "doc-frame relative w-full px-[2ch] sm:px-[4ch]",
        inverse ? "bg-foreground text-background" : "",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { ContainerWrapper, SectionWrapper };
