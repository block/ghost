import type { ComponentProps } from "react";
import { Link } from "react-router";
import { Callout } from "@/components/docs/callout";
import { CliHelp } from "@/components/docs/cli-help";
import { DocSection } from "@/components/docs/docs-page-layout";

function InternalOrExternalLink({
  href,
  children,
  ...rest
}: ComponentProps<"a">) {
  if (!href) return <a {...rest}>{children}</a>;
  const isInternal = href.startsWith("/") || href.startsWith("#");
  if (isInternal) {
    return (
      <Link to={href} className={rest.className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" {...rest}>
      {children}
    </a>
  );
}

function SuppressedH1(_: ComponentProps<"h1">) {
  return null;
}

// Cast as `any` because @types/mdx pins a different @types/react copy
// transitively, which mismatches this app's React types.
// biome-ignore lint/suspicious/noExplicitAny: upstream type mismatch
export const mdxComponents: Record<string, any> = {
  h1: SuppressedH1,
  a: InternalOrExternalLink,
  DocSection,
  Link,
  Callout,
  CliHelp,
};
