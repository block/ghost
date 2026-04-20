#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { z } from "zod";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "apps/docs/src/content/docs");
const SAMPLES_DIR = join(ROOT, "apps/docs/src/content/fingerprint-samples");

const Schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  kicker: z.string().optional(),
  section: z.enum(["drift", "ui"]).optional(),
  order: z.number(),
  slug: z.string().min(1),
  route: z.string().optional(),
  draft: z.boolean().optional(),
  updated: z.string().optional(),
});

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".mdx")) out.push(full);
  }
  return out;
}

function routeFor(fm) {
  if (fm.route) return fm.route;
  const prefix = (fm.section ?? "drift") === "drift" ? "/tools/drift" : "/ui";
  return `${prefix}/${fm.slug}`;
}

const files = walk(DOCS_DIR);
const errors = [];
const routes = new Set();
const parsed = [];

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const fm = matter(raw).data;
  const result = Schema.safeParse(fm);
  if (!result.success) {
    errors.push(
      `${relative(ROOT, file)}:\n  ${result.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("\n  ")}`,
    );
    continue;
  }
  parsed.push({ file, fm: result.data });
  routes.add(routeFor(result.data));
}

const INTERNAL_LINK = /\]\((\/[a-z0-9\-/]+)\)/gi;
for (const { file, fm: _fm } of parsed) {
  const raw = readFileSync(file, "utf8");
  const body = matter(raw).content;
  for (const match of body.matchAll(INTERNAL_LINK)) {
    const target = match[1].split("#")[0].replace(/\/$/, "");
    if (!target) continue;
    // Routes still owned by React pages (anything MDX-authored is
    // already in `routes` via the manifest).
    const KNOWN = [
      "/",
      "/tools",
      "/tools/drift",
      "/tools/drift/concepts",
      "/ui",
      "/ui/foundations",
      "/ui/foundations/colors",
      "/ui/foundations/typography",
      "/ui/components",
    ];
    if (KNOWN.includes(target)) continue;
    if (target.startsWith("/ui/components/")) continue;
    if (routes.has(target)) continue;
    errors.push(`${relative(ROOT, file)}: broken internal link -> ${match[1]}`);
  }
}

if (existsSync(SAMPLES_DIR)) {
  const coreDist = join(ROOT, "packages/ghost-core/dist/browser.js");
  if (existsSync(coreDist)) {
    const { lintFingerprint } = await import(pathToFileURL(coreDist).href);
    const samples = readdirSync(SAMPLES_DIR).filter((n) => n.endsWith(".md"));
    for (const name of samples) {
      const path = join(SAMPLES_DIR, name);
      const raw = readFileSync(path, "utf8");
      const report = lintFingerprint(raw);
      const errs = report.issues.filter((i) => i.severity === "error");
      if (errs.length) {
        errors.push(
          `${relative(ROOT, path)}:\n  ${errs
            .map((i) => `${i.code}: ${i.message}`)
            .join("\n  ")}`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error("check-docs-frontmatter failed:\n");
  for (const e of errors) console.error(e + "\n");
  process.exit(1);
}

console.log(
  `check-docs-frontmatter: ${parsed.length} docs OK${
    existsSync(SAMPLES_DIR) ? " + samples linted" : ""
  }`,
);
