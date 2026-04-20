import { z } from "zod";

export const DocsFrontmatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  kicker: z.string().default("Docs"),
  section: z.enum(["drift", "ui"]).default("drift"),
  order: z.number(),
  slug: z.string().min(1),
  route: z.string().optional(),
  draft: z.boolean().default(false),
  updated: z.string().optional(),
});

export type DocsFrontmatter = z.infer<typeof DocsFrontmatterSchema>;

export function routeFor(fm: DocsFrontmatter): string {
  if (fm.route) return fm.route;
  const prefix = fm.section === "drift" ? "/tools/drift" : "/ui";
  return `${prefix}/${fm.slug}`;
}
