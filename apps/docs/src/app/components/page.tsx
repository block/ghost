"use client";

import { useStaggerReveal } from "@ghost/ui";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import {
  categories,
  getAllComponents,
  getComponentsByCategory,
} from "@/lib/component-registry";

/* ── Fuzzy match ─────────────────────────────────────────────────────── */

function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // exact substring match scores highest
  if (t.includes(q)) return 1;

  // character-by-character fuzzy: every query char must appear in order
  let qi = 0;
  let score = 0;
  let lastIdx = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      // bonus for consecutive matches
      score += ti === lastIdx + 1 ? 2 : 1;
      lastIdx = ti;
      qi++;
    }
  }

  // all query characters must be found
  if (qi < q.length) return 0;

  // normalise to 0–1 range (below 1 so substring match always wins)
  return (score / (q.length * 2)) * 0.9;
}

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function ComponentsIndex() {
  const [query, setQuery] = useState("");
  const allComponents = useMemo(() => getAllComponents(), []);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    return allComponents
      .map((c) => ({ ...c, score: fuzzyMatch(query, c.name) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [query, allComponents]);

  const isSearching = query.trim().length > 0;

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Registry"
        title="Components"
        description="Production-ready building blocks. Every component follows Ghost UI — pill-first, monochromatic, accessible."
      />

      {/* Search */}
      <div className="mb-10">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search components…"
          className="w-full max-w-md rounded-full border border-border-card bg-card px-5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/25 transition-colors duration-200"
        />
      </div>

      {/* Search results */}
      {isSearching && (
        <div className="pb-16">
          {filtered && filtered.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {filtered.map((item) => (
                <ComponentPill
                  key={item.slug}
                  slug={item.slug}
                  name={item.name}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No components match "{query}"
            </p>
          )}
        </div>
      )}

      {/* Category sections */}
      {!isSearching && (
        <div className="grid gap-10 pb-16">
          {categories.map((cat) => {
            const items = getComponentsByCategory(cat.slug);
            if (items.length === 0) return null;
            return (
              <CategorySection
                key={cat.slug}
                name={cat.name}
                description={cat.description}
                items={items}
              />
            );
          })}
        </div>
      )}
    </SectionWrapper>
  );
}

/* ── Pill ─────────────────────────────────────────────────────────────── */

function ComponentPill({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      to={`/ui/components/${slug}`}
      className="component-card group relative inline-block overflow-hidden rounded-full border border-border-card hover:border-foreground/25 bg-card px-4 py-1.5 transition-colors duration-300"
    >
      <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
      <span className="relative z-10 text-sm font-medium transition-colors duration-300 group-hover:text-background">
        {name}
      </span>
    </Link>
  );
}

/* ── Category section ─────────────────────────────────────────────────── */

function CategorySection({
  name,
  description,
  items,
}: {
  name: string;
  description: string;
  items: { slug: string; name: string }[];
}) {
  const ref = useStaggerReveal<HTMLDivElement>(".component-card", {
    stagger: 0.04,
    y: 24,
    duration: 0.6,
  });

  return (
    <div ref={ref}>
      <h2
        className="font-display font-bold tracking-[-0.02em] mb-1"
        style={{ fontSize: "var(--heading-sub-font-size)" }}
      >
        {name}
      </h2>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <ComponentPill key={item.slug} slug={item.slug} name={item.name} />
        ))}
      </div>
    </div>
  );
}
