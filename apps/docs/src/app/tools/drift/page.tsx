"use client";

import { useStaggerReveal } from "@design-intelligence/vessel";
import { BookOpen, Orbit, Rocket } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";

const cards: {
  name: string;
  href: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    name: "Checks and review",
    href: "/docs/checks-and-review",
    description:
      "Opt in to the checks haunt, bind assertions to nodes, and assemble advisory packets.",
    icon: <Orbit className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Get started",
    href: "/docs/getting-started",
    description:
      "Install the skill bundle and review changed work against the .ghost fingerprint.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI reference",
    href: "/docs/cli",
    description:
      "Every command around the flat fingerprint, including review flags and exit codes.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
];

export default function GhostDriftLanding() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="ghost review"
        title="Review Against The Fingerprint"
        description="Check whether a change still matches the .ghost fingerprint. ghost review reads a diff, matches touched files to node materials, offers the relevant checks, and emits an advisory packet your agent weighs — Ghost itself grades nothing."
      />

      <div
        ref={ref}
        className="grid gap-4 md:grid-cols-3 pb-16 overflow-visible"
      >
        {cards.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="tool-card group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-10 transition-colors duration-300"
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
