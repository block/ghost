"use client";

import { useStaggerReveal } from "ghost-ui";
import { Compass, FileText, Network, Orbit, Palette } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { WorkflowContent } from "@/components/docs/workflow-content";
import { SectionWrapper } from "@/components/docs/wrappers";

const tools: {
  name: string;
  href: string;
  blurb: string;
  icon: ReactNode;
}[] = [
  {
    name: "ghost-map",
    href: "/tools/map",
    blurb: "Topology — map.md",
    icon: <Compass className="size-5" strokeWidth={1.5} />,
  },
  {
    name: "ghost-expression",
    href: "/tools/expression",
    blurb: "Authoring — expression.md",
    icon: <FileText className="size-5" strokeWidth={1.5} />,
  },
  {
    name: "ghost-drift",
    href: "/tools/drift",
    blurb: "Detection — compare, ack, track",
    icon: <Orbit className="size-5" strokeWidth={1.5} />,
  },
  {
    name: "ghost-fleet",
    href: "/tools/fleet",
    blurb: "Elevation — fleet.md",
    icon: <Network className="size-5" strokeWidth={1.5} />,
  },
  {
    name: "ghost-ui",
    href: "/tools/ui",
    blurb: "Reference UI library",
    icon: <Palette className="size-5" strokeWidth={1.5} />,
  },
];

function ToolStrip() {
  const ref = useStaggerReveal<HTMLDivElement>(".tool-chip", {
    stagger: 0.05,
    y: 16,
    duration: 0.5,
  });

  return (
    <div
      ref={ref}
      className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4 overflow-visible"
    >
      {tools.map((tool) => (
        <Link
          key={tool.href}
          to={tool.href}
          className="tool-chip group flex flex-col gap-1.5 rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/30 bg-card p-4 transition-colors duration-300"
        >
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition-colors duration-200">
            {tool.icon}
            <span className="font-display text-sm font-bold tracking-tight text-foreground">
              {tool.name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {tool.blurb}
          </p>
        </Link>
      ))}
    </div>
  );
}

export default function ToolsIndex() {
  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Tools"
        title="Working with Ghost"
        description="Map your project, profile its design language, compare it, review drift, evolve with intent, zoom out to the org."
      />

      <ToolStrip />

      <WorkflowContent />
    </SectionWrapper>
  );
}
