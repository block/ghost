"use client";

import { BookOpen, Fingerprint, Rocket, Server } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useStaggerReveal } from "@/hooks/use-scroll-reveal";

const hero = {
  name: "Core Concepts",
  href: "/tools/drift/concepts",
  description:
    "Fingerprints, drift detection, evolution tracking, and fleet observability — the ideas behind Ghost.",
  hook: "Start here",
  icon: <Fingerprint className="size-8" strokeWidth={1.5} />,
};

const sections: {
  name: string;
  href: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    name: "Getting Started",
    href: "/tools/drift/getting-started",
    description:
      "Install Ghost, profile your first system, and gate a PR against the expression — in under five minutes.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI Reference",
    href: "/tools/drift/cli",
    description:
      "Every command — profile, compare, review (files · project · suite), emit, generate, lint, ack, adopt, diverge, viz.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Self-Hosting",
    href: "/tools/drift/self-hosting",
    description:
      "Run Ghost UI as your own design system documentation site with your registry and tokens.",
    icon: <Server className="size-8" strokeWidth={1.5} />,
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
        kicker="Drift Engine"
        title="Drift Engine"
        description="Ghost fingerprints design systems into human-readable expressions, tracks their evolution, gates AI-generated UI against them, and surfaces divergence before it compounds."
      />

      <div ref={ref} className="pb-16 overflow-visible space-y-4">
        {/* Hero card — full-width */}
        <Link
          to={hero.href}
          className="doc-card group relative rounded-[var(--radius-card)] border border-border-card hover:border-foreground/25 bg-card p-10 md:p-12 flex flex-col md:flex-row md:items-center gap-6 transition-colors duration-300 overflow-hidden"
        >
          <div className="flex-1">
            <span
              className="font-display uppercase text-muted-foreground"
              style={{
                fontSize: "var(--label-font-size)",
                letterSpacing: "var(--label-letter-spacing)",
              }}
            >
              {hero.hook}
            </span>
            <h3
              className="font-display font-black tracking-[-0.04em] leading-[0.92] mt-2"
              style={{ fontSize: "var(--heading-card-font-size)" }}
            >
              <span className="relative inline-block">
                <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                  {hero.name}
                </span>
                <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
              </span>
            </h3>
            <p className="mt-3 max-w-[48ch] text-muted-foreground leading-relaxed">
              {hero.description}
            </p>
          </div>
          <div className="text-muted-foreground group-hover:text-foreground transition-colors duration-200 md:mr-4">
            <Fingerprint className="size-16 md:size-20" strokeWidth={0.75} />
          </div>
        </Link>

        {/* Rest of the grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </div>
    </SectionWrapper>
  );
}
