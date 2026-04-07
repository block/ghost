import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function DocProse({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "pb-24",
        // Headings
        "[&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:mt-12 [&_h2]:mb-4",
        "[&_h3]:font-display [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mt-8 [&_h3]:mb-3",
        // Paragraphs
        "[&_p]:text-muted-foreground [&_p]:leading-relaxed [&_p]:mb-4",
        // Links
        "[&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-border-strong hover:[&_a]:decoration-foreground",
        // Lists
        "[&_ul]:text-muted-foreground [&_ul]:leading-relaxed [&_ul]:mb-4 [&_ul]:pl-6 [&_ul]:list-disc",
        "[&_ol]:text-muted-foreground [&_ol]:leading-relaxed [&_ol]:mb-4 [&_ol]:pl-6 [&_ol]:list-decimal",
        "[&_li]:mb-1.5",
        // Code inline
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:text-sm [&_:not(pre)>code]:font-mono",
        // Code blocks
        "[&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border-card [&_pre]:bg-muted/50 [&_pre]:p-4 [&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:font-mono",
        // Tables
        "[&_table]:w-full [&_table]:mb-4 [&_table]:text-sm",
        "[&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground [&_th]:border-b [&_th]:border-border-strong [&_th]:pb-2 [&_th]:pr-4",
        "[&_td]:text-muted-foreground [&_td]:border-b [&_td]:border-border-card [&_td]:py-2.5 [&_td]:pr-4 [&_td]:align-top",
        // Horizontal rules
        "[&_hr]:my-8 [&_hr]:border-border-card",
        // Strong
        "[&_strong]:text-foreground [&_strong]:font-semibold",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
