import { cn } from "@design-intelligence/vessel-react";
import type { ReactNode } from "react";

type Variant = "info" | "warning" | "wip" | "flag";

interface CalloutProps {
  variant?: Variant;
  title?: string;
  hideTitle?: boolean;
  children: ReactNode;
}

const defaultTitle: Record<Variant, string> = {
  info: "note",
  warning: "warning",
  wip: "work in progress",
  flag: "caught in review",
};

const variants: Record<Variant, string> = {
  info: "bg-transparent",
  warning: "bg-[var(--doc-mark-soft)]",
  wip: "bg-[var(--doc-mark-soft)]",
  flag: "bg-[var(--doc-flag)]",
};

export function Callout({
  variant = "info",
  title,
  hideTitle = false,
  children,
}: CalloutProps) {
  const displayTitle = hideTitle ? null : (title ?? defaultTitle[variant]);

  return (
    <aside
      className={cn(
        "my-6 max-w-[54ch] border border-[var(--doc-line)] px-[2ch] py-4 [&_p]:mb-0 [&_p:not(:last-child)]:mb-3",
        variants[variant],
      )}
    >
      {displayTitle ? (
        <div className="mb-4 font-mono text-[0.8125rem] font-normal lowercase leading-5 text-[var(--doc-middle)]">
          {displayTitle}
        </div>
      ) : null}
      <div className="text-foreground">{children}</div>
    </aside>
  );
}
