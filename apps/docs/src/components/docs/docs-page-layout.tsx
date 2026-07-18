"use client";

import { cn } from "@design-intelligence/vessel-react";
import type { ReactNode } from "react";

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
  children,
  className,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "doc-section scroll-mt-8 grid grid-cols-1 gap-x-[4ch] border-t border-[var(--doc-line)] py-8 first:border-t-0 first:pt-0 lg:grid-cols-[18ch_1fr]",
        className,
      )}
    >
      <div className="mb-4 lg:sticky lg:top-8 lg:mb-0 lg:self-start">
        <p className="doc-section-label font-mono text-[0.8125rem] font-bold leading-5 lowercase text-foreground">
          {title}
        </p>
      </div>
      <div className="min-w-0 max-w-[76ch]">{children}</div>
    </section>
  );
}
