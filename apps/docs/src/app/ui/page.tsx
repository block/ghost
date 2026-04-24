"use client";

import { useStaggerReveal } from "ghost-ui";
import { type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { getAllComponents } from "@/lib/component-registry";

function ColorsVisual() {
  return (
    <div className="flex items-end gap-1.5 h-16">
      {[
        "bg-foreground",
        "bg-foreground/80",
        "bg-foreground/60",
        "bg-foreground/40",
        "bg-foreground/20",
        "bg-foreground/10",
      ].map((bg, i) => (
        <div
          key={i}
          className={`${bg} rounded-sm flex-1 transition-all duration-300`}
          style={{ height: `${100 - i * 14}%` }}
        />
      ))}
    </div>
  );
}

function TypographyVisual() {
  return (
    <div className="flex flex-col gap-1.5 h-16 justify-center">
      <div className="h-3 w-3/4 rounded-full bg-foreground" />
      <div className="h-2 w-full rounded-full bg-foreground/40" />
      <div className="h-2 w-5/6 rounded-full bg-foreground/20" />
      <div className="h-2 w-2/3 rounded-full bg-foreground/20" />
    </div>
  );
}

function ComponentsVisual() {
  const count = getAllComponents().length;
  return (
    <div className="flex flex-wrap gap-1.5 h-16 items-end content-end">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-full bg-foreground/20 h-5 transition-all duration-300"
          style={{ width: `${40 + (i % 3) * 20}px`, opacity: 1 - i * 0.08 }}
        />
      ))}
      <span className="text-xs text-muted-foreground mt-1">
        {count} components
      </span>
    </div>
  );
}

const sections: {
  name: string;
  href: string;
  description: string;
  visual: ReactNode;
}[] = [
  {
    name: "Foundations",
    href: "/ui/foundations",
    description:
      "Color, typography, and the design tokens that underpin every Ghost UI component.",
    visual: (
      <div className="flex gap-6">
        <div className="flex-1">
          <ColorsVisual />
        </div>
        <div className="flex-1">
          <TypographyVisual />
        </div>
      </div>
    ),
  },
  {
    name: "Components",
    href: "/ui/components",
    description:
      "Production-ready building blocks. Every component follows Ghost UI — pill-first, monochromatic, accessible.",
    visual: <ComponentsVisual />,
  },
];

export default function DesignLanguageIndex() {
  const ref = useStaggerReveal<HTMLDivElement>(".dl-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Design Language"
        title="Ghost UI"
        description="The shared design language across Ghost — foundations, primitives, and AI-native components."
      />

      <div
        ref={ref}
        className="grid gap-4 sm:grid-cols-2 pb-16 overflow-visible"
      >
        {sections.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="dl-card group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-10 transition-colors duration-300"
          >
            <div className="mb-6">{item.visual}</div>
            <span className="relative inline-block font-display text-lg font-bold tracking-tight">
              <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                {item.name}
              </span>
              <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
            </span>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}
