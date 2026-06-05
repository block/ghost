"use client";

import { useStaggerReveal } from "ghost-ui";
import {
  BookOpen,
  Boxes,
  GitCompare,
  PenLine,
  RadioTower,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
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
    description: "Install Ghost and run the first fingerprint lifecycle loop.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Fingerprint Package",
    href: "/docs/fingerprint-package",
    description:
      "Understand the portable contract: prose, inventory, composition, checks, memory, and cache.",
    icon: <Boxes className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Authoring",
    href: "/docs/authoring",
    description:
      "Create, inspect, gather source material, and validate fingerprint layers.",
    icon: <PenLine className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Generation",
    href: "/docs/generation",
    description:
      "Use `ghost emit context-bundle` before an agent writes or revises UI.",
    icon: <Sparkles className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Governance",
    href: "/docs/governance",
    description:
      "Run checks and advisory review after generated or changed surfaces land.",
    icon: <ShieldCheck className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Comparison",
    href: "/docs/comparison",
    description:
      "Compare packages, inspect stacks, and reason across many systems.",
    icon: <GitCompare className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Host Adapters",
    href: "/docs/adapters",
    description:
      "Connect Ghost to agents, CI, and review surfaces without changing the package contract.",
    icon: <RadioTower className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI Reference",
    href: "/docs/cli",
    description:
      "Find exact command flags and generated help for the full lifecycle.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
];

export default function DocsIndex() {
  const ref = useStaggerReveal<HTMLDivElement>(".doc-card", {
    stagger: 0.05,
    y: 24,
    duration: 0.65,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Docs"
        title="Fingerprint Lifecycle"
        description="Start with the portable contract, then move through authoring, generation, governance, comparison, and host integration."
      />

      <div
        ref={ref}
        className="grid gap-4 pb-16 pt-8 overflow-visible md:grid-cols-2 xl:grid-cols-4"
      >
        {sections.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="doc-card group rounded-[var(--radius-card-sm)] border border-border-card bg-card p-7 transition-colors duration-300 hover:border-foreground/25"
          >
            <div className="mb-5 text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
              {item.icon}
            </div>
            <span className="relative inline-block font-display text-base font-bold tracking-tight">
              <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                {item.name}
              </span>
              <span className="absolute inset-0 origin-left scale-x-0 bg-foreground transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </span>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}
