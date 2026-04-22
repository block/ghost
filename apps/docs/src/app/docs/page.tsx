"use client";

import { useStaggerReveal } from "ghost-ui";
import { BookOpen, Fingerprint, Rocket } from "lucide-react";
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
    name: "Workflow",
    href: "/tools/drift/workflow",
    description:
      "The five moves: profile, compare, review, evolve, and zoom out to the org fingerprint — with examples for each.",
    icon: <Fingerprint className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Getting Started",
    href: "/tools/drift/getting-started",
    description:
      "Install the skill bundle, write your first fingerprint.md, and track drift against a parent — in under five minutes.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI Reference",
    href: "/tools/drift/cli",
    description:
      "Six deterministic primitives — compare, lint, ack, adopt, diverge, emit. Plus the skill recipes the host agent runs.",
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
        kicker="Drift"
        title="Drift"
        description="Ghost profiles design languages into human-readable fingerprints, tracks their evolution, gates AI-generated UI against them, and surfaces divergence before it compounds."
      />

      <div
        ref={ref}
        className="pb-16 pt-8 overflow-visible grid gap-4 md:grid-cols-3"
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
