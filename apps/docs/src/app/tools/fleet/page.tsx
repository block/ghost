"use client";

import { useStaggerReveal } from "ghost-ui";
import { BookOpen, Network, Rocket } from "lucide-react";
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
      "Install the ghost-fleet skill bundle and run members + view across a directory of registered members.",
    icon: <Rocket className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "CLI reference",
    href: "/docs/cli#ghost-fleet--elevation-across-members",
    description:
      "members (list + freshness), view (pairwise distances + group-by tables, emits fleet.md + fleet.json), emit skill.",
    icon: <BookOpen className="size-8" strokeWidth={1.5} />,
  },
  {
    name: "Skill bundle",
    href: "https://github.com/block/ghost/tree/main/packages/ghost-fleet/src/skill-bundle",
    description:
      "The target recipe — synthesize the fleet.md prose narrative from the deterministic view output.",
    icon: <Network className="size-8" strokeWidth={1.5} />,
  },
];

export default function GhostFleetLanding() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-card", {
    stagger: 0.06,
    y: 30,
    duration: 0.7,
  });

  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="ghost-fleet"
        title="Elevation"
        description="A read-only elevation view across many (map.md, expression.md) members. Pairwise distances, group-by tables (platform, build system, design-system status), tracks-graph — the orthogonal axis pure expression-comparison can't see. Emits fleet.md + fleet.json into a reports directory."
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
