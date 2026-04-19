"use client";

import { useStaggerReveal } from "@ghost/ui";
import { Fingerprint } from "lucide-react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";

const tools = [
  {
    name: "Drift Engine",
    href: "/tools/drift",
    description:
      "Express design systems, track their evolution, and surface divergence before it compounds.",
    icon: <Fingerprint className="size-8" strokeWidth={1.5} />,
  },
];

export default function ToolsIndex() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Platform"
        title="Tools"
        description="The engines that power your design infrastructure. Each tool solves a distinct problem in the design system lifecycle."
      />

      <div
        ref={ref}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-16 overflow-visible"
      >
        {tools.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="tool-card group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-10 transition-colors duration-300"
          >
            <div className="mb-6 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
              {tool.icon}
            </div>
            <span className="relative inline-block font-display text-lg font-bold tracking-tight">
              <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                {tool.name}
              </span>
              <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
            </span>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </SectionWrapper>
  );
}
