import { cn } from "@design-intelligence/vessel-react";
import type { ComponentProps, ReactNode } from "react";

export function Mark({ className, ...props }: ComponentProps<"mark">) {
  return (
    <mark
      className={cn(
        "bg-[var(--doc-mark)] text-[var(--doc-on-mark)] px-[0.5ch]",
        className,
      )}
      {...props}
    />
  );
}

export function Flag({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "bg-[var(--doc-flag)] px-[0.5ch] line-through decoration-1",
        className,
      )}
      {...props}
    />
  );
}

export function FileFigure({
  caption,
  className,
  children,
}: {
  caption: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn("doc-figure", className)}>
      <figcaption className="doc-figure-caption">{caption}</figcaption>
      <div className="[&_pre]:!m-0 [&_pre]:!max-w-none [&_pre]:!overflow-x-auto [&_pre]:!border-0 [&_pre]:p-4 [&_pre]:px-[2ch]">
        {children}
      </div>
    </figure>
  );
}

export function Listing({
  caption,
  className,
  children,
}: {
  caption?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <figure className={cn("doc-figure", className)}>
      {caption ? (
        <figcaption className="doc-figure-caption">{caption}</figcaption>
      ) : null}
      <div>{children}</div>
    </figure>
  );
}

export function ListingRow({
  id,
  picked = false,
  skipped = false,
  className,
  children,
}: {
  id: ReactNode;
  picked?: boolean;
  skipped?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("doc-figure-row", className)}
      data-picked={picked || undefined}
      data-skipped={skipped || undefined}
    >
      <div className="font-bold">{id}</div>
      <div>
        {children}
        {skipped ? (
          <span className="ml-[1ch] text-[var(--doc-middle)]">· skipped</span>
        ) : null}
      </div>
    </div>
  );
}

export function Steps({ className, children }: ComponentProps<"div">) {
  return (
    <div className={cn("my-8 max-w-[76ch] border-t", className)}>
      {children}
    </div>
  );
}

export function Step({
  n,
  label,
  children,
}: {
  n: string | number;
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-[2ch] border-b py-4 sm:grid-cols-[12ch_1fr]">
      <div className="font-bold">
        <span className="font-normal text-[var(--doc-middle)]">[{n}] </span>
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Split({ className, children }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "my-8 grid max-w-[76ch] grid-cols-1 border [&>*]:p-4 [&>*+*]:border-t md:grid-cols-2 md:[&>*+*]:border-l md:[&>*+*]:border-t-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Repair({ className, children }: ComponentProps<"div">) {
  return <Split className={className}>{children}</Split>;
}
