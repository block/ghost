"use client";

import { useStaggerReveal } from "ghost-ui";
import { BookOpen, FileText, Rocket } from "lucide-react";
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
    name: "Get started",
    href: "/docs/getting-started",
    description:
      "Install the skill bundle and ask your agent to write .ghost/fingerprint.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI reference",
    href: "/docs/cli#ghost-fingerprint--authoring--validation",
    description: "Validate, describe, diff, and emit agent-ready context.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Format spec",
    href: "https://github.com/block/ghost/blob/main/docs/fingerprint-format.md",
    description:
      "The full package format for map, survey, profile, and checks.",
    icon: <FileText className="size-8" strokeWidth={1.5} />,
  },
];

export default function GhostFingerprintLanding() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="ghost-fingerprint"
        title="Fingerprint"
        description="The repo-local design memory package agents read before they generate UI. ghost-fingerprint helps your agent scan the repo, write .ghost/fingerprint, validate it against source evidence, and emit context from it."
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
