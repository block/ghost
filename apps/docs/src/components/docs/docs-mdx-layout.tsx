import { MDXProvider } from "@mdx-js/react";
import type { ComponentType, ReactNode } from "react";
import type { DocsFrontmatter } from "@/content/docs-frontmatter";
import { mdxComponents } from "@/mdx-components";
import { AnimatedPageHeader } from "./animated-page-header";
import { DocProse } from "./doc-prose";
import { DocsPageLayout } from "./docs-page-layout";

interface DocsMdxRouteProps {
  frontmatter: DocsFrontmatter;
  Content: ComponentType;
}

export function DocsMdxRoute({ frontmatter, Content }: DocsMdxRouteProps) {
  return (
    <DocsPageLayout>
      <AnimatedPageHeader
        kicker={frontmatter.kicker}
        title={frontmatter.title}
        description={frontmatter.description}
      />
      <DocProse>
        <MDXProvider components={mdxComponents}>
          <Content />
        </MDXProvider>
      </DocProse>
    </DocsPageLayout>
  );
}

export function DocsMdxShell({ children }: { children: ReactNode }) {
  return (
    <DocsPageLayout>
      <DocProse>
        <MDXProvider components={mdxComponents}>{children}</MDXProvider>
      </DocProse>
    </DocsPageLayout>
  );
}
