"use client";

import { useStaggerReveal } from "ghost-ui";
import { BookOpen, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";

const sections: {
  name: string;
  href: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    name: "Getting Started",
    href: "/docs/getting-started",
    description:
      "Install Ghost, scan a repo, and learn the loop around .ghost/fingerprint.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI Reference",
    href: "/docs/cli",
    description:
      "Commands for checks and comparison, plus the skill recipes your agent runs.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
];

export default function DocsIndex() {
  const ref = useStaggerReveal<HTMLDivElement>(".doc-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Docs"
        title="Documentation"
        description="Start with the simple loop, then reach for the command reference when you need exact flags and outputs."
      />

      <div
        ref={ref}
        className="pb-16 pt-8 overflow-visible grid gap-4 md:grid-cols-2"
      >
        {sections.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="doc-card group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-10 transition-colors duration-300"
          >
            <div className="mb-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {item.icon}
            </div>
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
