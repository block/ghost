import type { ComponentType } from "react";
import {
  type DocsFrontmatter,
  DocsFrontmatterSchema,
  routeFor,
} from "./docs-frontmatter";

interface MdxModule {
  default: ComponentType;
  frontmatter?: unknown;
}

export interface DocsEntry {
  frontmatter: DocsFrontmatter;
  route: string;
  Content: ComponentType;
}

const modules = import.meta.glob<MdxModule>("./docs/**/*.mdx", { eager: true });

function build(): DocsEntry[] {
  const out: DocsEntry[] = [];
  for (const [path, mod] of Object.entries(modules)) {
    const parsed = DocsFrontmatterSchema.safeParse(mod.frontmatter ?? {});
    if (!parsed.success) {
      throw new Error(
        `Invalid frontmatter in ${path}: ${parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    if (parsed.data.draft) continue;
    out.push({
      frontmatter: parsed.data,
      route: routeFor(parsed.data),
      Content: mod.default,
    });
  }
  out.sort((a, b) => {
    if (a.frontmatter.section !== b.frontmatter.section) {
      return a.frontmatter.section.localeCompare(b.frontmatter.section);
    }
    return a.frontmatter.order - b.frontmatter.order;
  });
  return out;
}

export const docsEntries: DocsEntry[] = build();
