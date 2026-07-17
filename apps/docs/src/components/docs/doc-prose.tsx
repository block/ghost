import { cn } from "@design-intelligence/vessel-react";
import type { ComponentProps } from "react";

export function DocProse({
  children,
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "doc-prose doc-section-stack pb-28 font-mono text-[0.8125rem] leading-5 text-foreground",
        // Headings: hierarchy through weight and rhythm, not scale.
        "[&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:font-mono [&_h2]:text-[0.8125rem] [&_h2]:font-bold [&_h2]:leading-5 [&_h2]:lowercase",
        "[&_h3]:mt-8 [&_h3]:mb-4 [&_h3]:max-w-[54ch] [&_h3]:font-mono [&_h3]:text-[0.8125rem] [&_h3]:font-bold [&_h3]:leading-5",
        // Reading measure.
        "[&_p]:mb-4 [&_p]:max-w-[54ch] [&_p]:text-foreground",
        // Links use the single highlighter gesture.
        "[&_a]:text-inherit [&_a]:underline [&_a]:underline-offset-[0.24ch] [&_a]:[text-decoration-skip-ink:none] hover:[&_a]:bg-[var(--doc-mark)] hover:[&_a]:text-[var(--doc-on-mark)] hover:[&_a]:no-underline",
        // Hanging bullets and compact ordered lists.
        "[&_ul]:mb-4 [&_ul]:max-w-[54ch] [&_ul]:list-none [&_ul]:pl-[2ch]",
        "[&_ul_li]:relative [&_ul_li]:before:absolute [&_ul_li]:before:-ml-[2ch] [&_ul_li]:before:content-['•_']",
        "[&_ol]:mb-4 [&_ol]:max-w-[54ch] [&_ol]:list-decimal [&_ol]:pl-[4ch]",
        "[&_li]:mb-1",
        // Inline code is a soft annotation, not a pill.
        "[&_:not(pre)>code]:bg-[var(--doc-mark-soft)] [&_:not(pre)>code]:px-[0.5ch] [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[inherit]",
        // Machine artifacts: square, transparent, hairline-bound.
        "[&_pre]:mb-6 [&_pre]:max-w-[76ch] [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-[var(--doc-line)] [&_pre]:bg-transparent [&_pre]:p-4 [&_pre]:px-[2ch] [&_pre]:font-mono [&_pre]:text-[0.8125rem] [&_pre]:leading-5",
        // Tables read as listings, with rows instead of containers.
        "[&_table]:mb-6 [&_table]:w-full [&_table]:max-w-[76ch] [&_table]:border-collapse [&_table]:text-[0.8125rem]",
        "[&_th]:border-b [&_th]:border-[var(--doc-line)] [&_th]:py-2 [&_th]:pr-[2ch] [&_th]:text-left [&_th]:font-bold [&_th]:text-foreground",
        "[&_td]:border-b [&_td]:border-[var(--doc-line)] [&_td]:py-2 [&_td]:pr-[2ch] [&_td]:align-top [&_td]:text-foreground",
        "[&_hr]:my-8 [&_hr]:border-[var(--doc-line)]",
        "[&_strong]:font-bold [&_strong]:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
