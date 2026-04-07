"use client";

import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useStaggerReveal } from "@/hooks/use-scroll-reveal";
import { categories, getComponentsByCategory } from "@/lib/component-registry";

export default function ComponentsIndex() {
  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Registry"
        title="Components"
        description="Production-ready building blocks. Every component follows Ghost UI — pill-first, monochromatic, accessible."
      />

      <div className="grid gap-12 pb-16">
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
    </SectionWrapper>
  );
}

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
      <p className="text-sm text-muted-foreground mb-5">{description}</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {items.map((item) => (
          <Link
            key={item.slug}
            to={`/components/${item.slug}`}
            className="component-card group rounded-[var(--radius-card-sm)] border border-border-card bg-card p-4 transition-all duration-200 hover:scale-[1.03] hover:shadow-elevated"
          >
            <span className="text-sm font-medium">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
