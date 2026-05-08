"use client";

import { useStaggerReveal } from "ghost-ui";
import { Box, Component, Layers } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { getAllComponents } from "@/lib/component-registry";

const componentCount = getAllComponents().length;

const cards: {
  name: string;
  href: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    name: "Foundations",
    href: "/ui/foundations",
    description:
      "Color, typography, and the design tokens that underpin every Ghost UI component.",
    icon: <Layers className="size-8" strokeWidth={1.5} />,
  },
  {
    name: `Components (${componentCount})`,
    href: "/ui/components",
    description:
      "Production-ready primitives + AI elements. Distributed via the shadcn registry.json — installed component-by-component, never wholesale.",
    icon: <Component className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "MCP server",
    href: "https://github.com/block/ghost/tree/main/packages/ghost-ui#mcp-server",
    description:
      "ghost-mcp re-exposes the registry to AI assistants — five tools, two resources, so an agent can search components and pull source.",
    icon: <Box className="size-8" strokeWidth={1.5} />,
  },
];

export default function GhostUiLanding() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="ghost-ui"
        title="Reference design system"
        description="The design language Ghost dogfoods. 49 UI primitives + 48 AI elements, monochromatic-by-default, pill-first, distributed via the shadcn registry — and an MCP server that re-exposes the registry to AI assistants. Not on npm; the catalogue lives here."
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
