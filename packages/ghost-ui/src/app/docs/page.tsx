"use client";

import {
  BookOpen,
  Compass,
  Fingerprint,
  Layers,
  Rocket,
  Server,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useStaggerReveal } from "@/hooks/use-scroll-reveal";

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
      "Install Ghost, create your first config, and run your first drift scan in under five minutes.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Core Concepts",
    href: "/docs/concepts",
    description:
      "Fingerprints, drift detection, evolution tracking, and fleet observability — the ideas behind Ghost.",
    icon: <Fingerprint className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI Reference",
    href: "/docs/cli",
    description:
      "All nine commands — scan, profile, compare, diff, ack, adopt, diverge, fleet, and viz.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Self-Hosting",
    href: "/docs/self-hosting",
    description:
      "Run Ghost UI as your own design system documentation site with your registry and tokens.",
    icon: <Server className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Ghost UI",
    href: "/components",
    description:
      "Browse the component catalogue — 49 primitives and 48 AI-native elements ready to use.",
    icon: <Layers className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Foundations",
    href: "/foundations",
    description:
      "Color, typography, and the design tokens that underpin every Ghost UI component.",
    icon: <Compass className="size-8" strokeWidth={1.5} />,
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
        kicker="Documentation"
        title="Ghost"
        description="Autonomous design drift detection for decentralised design ecosystems. Ghost fingerprints design systems, tracks their evolution, and surfaces divergence before it compounds."
      />

      <div
        ref={ref}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16 overflow-visible"
      >
        {sections.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="doc-card group rounded-[var(--radius-card-sm)] border border-border-card bg-card p-10 transition-all duration-200 hover:scale-[1.03] hover:shadow-elevated"
          >
            <div className="mb-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {item.icon}
            </div>
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
