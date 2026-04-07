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
    href: "/foundations/colors",
    description:
      "A pure monochromatic scale with selective semantic color for status and utility.",
    visual: <ColorsVisual />,
  },
  {
    name: "Typography",
    href: "/foundations/typography",
    description:
      "Magazine-grade hierarchy with HK Grotesk. Display for headers, Regular for body, Mono for data.",
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
            className="foundation-card group rounded-[var(--radius-card-sm)] border border-border-card bg-card p-10 transition-all duration-200 hover:scale-[1.03] hover:shadow-elevated"
          >
            <div className="mb-6">{item.visual}</div>
            <span className="font-display text-lg font-bold tracking-tight">
              {item.name}
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
