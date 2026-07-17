import { z } from "zod";

export const DocsFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  kicker: z.string().default("Docs"),
  section: z.literal("guide").default("guide"),
  order: z.number(),
  slug: z.string().min(1),
  route: z.string().optional(),
  draft: z.boolean().default(false),
  updated: z.string().optional(),
});

export type DocsFrontmatter = z.infer<typeof DocsFrontmatterSchema>;

export function routeFor(fm: DocsFrontmatter): string {
  if (fm.route) return fm.route;
  return `/docs/${fm.slug}`;
}
