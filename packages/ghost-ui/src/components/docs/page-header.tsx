import { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function PageHeader({
  className,
  children,
  ...props
}: ComponentProps<"section">) {
  return (
    <section className={cn("", className)} {...props}>
      <div className="flex justify-between items-end gap-1">{children}</div>
    </section>
  );
}

function PageHeaderHeading({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "pb-4 font-display font-black tracking-[-0.05em] leading-[0.88]",
        className,
      )}
      style={{ fontSize: "var(--heading-display-font-size)" }}
      {...props}
    />
  );
}

function PageHeaderDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-muted-foreground max-w-3xl text-sm font-light text-balance sm:text-base",
        className,
      )}
      {...props}
    />
  );
}

function PageActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-start gap-2 pt-2",
        className,
      )}
      {...props}
    />
  );
}

export { PageActions, PageHeader, PageHeaderDescription, PageHeaderHeading };
