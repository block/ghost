"use client";

import { cn } from "@design-intelligence/vessel-react";
import type { ElementType, ReactNode } from "react";

export function DocsPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="doc-frame relative px-[2ch] py-4 sm:px-[4ch]">
      {children}
    </div>
  );
}

export function DocSection({
  id,
  title,
  marker,
  labelHidden = false,
  labelAs,
  children,
  className,
}: {
  id?: string;
  title?: string;
  marker?: ReactNode;
  labelHidden?: boolean;
  labelAs?: ElementType;
  children: ReactNode;
  className?: string;
}) {
  const Label = labelAs ?? "p";

  return (
    <section
      id={id}
      className={cn(
        "doc-section scroll-mt-8 grid grid-cols-1 py-8 first:pt-0",
        className,
      )}
    >
      <div
        aria-hidden={labelHidden ? true : undefined}
        className={cn(
          "mb-4 lg:sticky lg:top-8 lg:mb-0 lg:self-start",
          labelHidden ? "hidden lg:block" : "",
        )}
      >
        {labelHidden ? null : (
          <Label
            className={cn(
              "doc-section-label font-mono text-[0.8125rem] font-bold leading-5 lowercase text-foreground",
              marker === undefined ? "" : "doc-section-label--manual",
            )}
          >
            {marker === undefined ? null : (
              <span className="doc-annotation">{marker} </span>
            )}
            {title}
          </Label>
        )}
      </div>
      <div className="doc-section-content min-w-0">{children}</div>
    </section>
  );
}
