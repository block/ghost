"use client";

import { cn, Tooltip, TooltipContent, TooltipTrigger } from "ghost-ui";
import { ComponentProps } from "react";
import { useShowTooltips } from "@/store/preferences-store";

export function TooltipWrapper({
  label,
  className,
  children,
  ...props
}: ComponentProps<typeof TooltipTrigger> & {
  label: string;
}) {
  const showTootips = useShowTooltips();

  return (
    <Tooltip delayDuration={500} key={label} defaultOpen={false}>
      <TooltipTrigger className={cn(className)} {...props}>
        {children}
      </TooltipTrigger>

      {showTootips && (
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}
