import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const log = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/log" }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
  }),
});

export const collections = { log };
