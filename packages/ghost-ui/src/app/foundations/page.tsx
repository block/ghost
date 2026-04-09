"use client";

import { type ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useStaggerReveal } from "@/hooks/use-scroll-reveal";

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

const foundations: {
  name: string;
  href: string;
  description: string;
  visual: ReactNode;
}[] = [
  {
    name: "Colors",
    href: "/ui/foundations/colors",
    description:
      "A pure monochromatic scale with selective semantic color for status and utility.",
    visual: <ColorsVisual />,
  },
  {
    name: "Typography",
    href: "/ui/foundations/typography",
    description:
      "Magazine-grade hierarchy. Display for headers, Regular for body, Mono for data.",
    visual: <TypographyVisual />,
  },
];

export default function FoundationsIndex() {
  const ref = useStaggerReveal<HTMLDivElement>(".foundation-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Foundations"
        title="Foundations"
        description="The building blocks that underpin every component. Color, type, and iconography — tuned for Ghost UI."
      />

      <div
        ref={ref}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16 overflow-visible"
      >
        {foundations.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="foundation-card group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-10 transition-colors duration-300"
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
