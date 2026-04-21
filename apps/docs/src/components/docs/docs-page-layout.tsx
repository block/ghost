"use client";

import { cn } from "ghost-ui";
import type { ReactNode } from "react";

/**
 * Wrapper for doc pages that use the two-column section layout.
 * Provides page-level padding matching SectionWrapper.
 */
export function DocsPageLayout({ children }: { children: ReactNode }) {
  return <div className="relative py-6 md:py-8 px-6 lg:px-8">{children}</div>;
}

/**
 * A single documentation section rendered as a two-column row on lg+.
 *
 * Left column: sticky section title (replaces inline <h2>).
 * Right column: section content with DocProse-compatible styling.
 */
export function DocSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid grid-cols-1 lg:grid-cols-[12rem_1fr] xl:grid-cols-[14rem_1fr] gap-x-10 gap-y-0 border-t border-border/40 pt-8 pb-2 first:border-t-0 first:pt-0",
        className,
      )}
    >
      {/* Left: sticky title */}
      <div className="lg:sticky lg:top-8 lg:self-start mb-4 lg:mb-0 lg:pt-0.5">
        <p className="font-display text-sm tracking-tight !text-foreground">
          {title}
        </p>
      </div>

      {/* Right: content */}
      <div className="min-w-0 max-w-[72ch]">{children}</div>
    </section>
  );
}
