import { cn } from "@ghost/ui";
import type { ReactNode } from "react";

type Variant = "info" | "warning" | "wip";

interface CalloutProps {
  variant?: Variant;
  title?: string;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  info: "border-border-card bg-muted/40 text-foreground",
  warning:
    "border-yellow-200 bg-yellow-100/20 text-foreground dark:bg-yellow-200/10",
  wip: "border-yellow-200 bg-yellow-100/20 text-foreground dark:bg-yellow-200/10",
};

const titleStyles: Record<Variant, string> = {
  info: "text-muted-foreground",
  warning: "text-yellow-200 dark:text-yellow-100",
  wip: "text-yellow-200 dark:text-yellow-100",
};

const defaultTitle: Record<Variant, string> = {
  info: "Note",
  warning: "Warning",
  wip: "Work in progress",
};

export function Callout({ variant = "info", title, children }: CalloutProps) {
  return (
    <aside
      className={cn(
        "my-6 rounded-lg border px-5 py-4 [&_p]:mb-0 [&_p:not(:last-child)]:mb-3",
        styles[variant],
      )}
    >
      <div
        className={cn(
          "font-display text-xs font-semibold uppercase tracking-wide mb-2",
          titleStyles[variant],
        )}
      >
        {title ?? defaultTitle[variant]}
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </aside>
  );
}
