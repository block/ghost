"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { SectionWrapper } from "@/components/docs/wrappers";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────── Chapter wrapper ─────────────────────────── */

function Chapter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const items = el.querySelectorAll(".reveal");
    if (items.length === 0) return;

    gsap.set(items, { y: 40, opacity: 0 });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(items, {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.1,
          ease: "power2.out",
          onComplete: () => {
            gsap.set(items, { clearProps: "transform,opacity" });
          },
        });
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section
      ref={ref}
      className={cn("relative py-16 md:py-24 lg:py-32", className)}
    >
      {children}
    </section>
  );
}

function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="reveal font-display uppercase text-muted-foreground mb-3"
      style={{
        fontSize: "var(--label-font-size)",
        letterSpacing: "var(--label-letter-spacing)",
      }}
    >
      {children}
    </p>
  );
}

function ChapterTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="reveal font-display font-black tracking-[-0.04em] leading-[0.92] mb-4"
      style={{ fontSize: "var(--heading-sub-font-size)" }}
    >
      {children}
    </h2>
  );
}

function ChapterLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="reveal max-w-[52ch] text-muted-foreground leading-relaxed text-lg mb-10">
      {children}
    </p>
  );
}

/* ─────────────────────── 1. The Problem ──────────────────────────────── */

function DriftSpotlight() {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="reveal">
      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {/* "Parent" button */}
        <div className="rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8 flex flex-col items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground">
            Parent registry
          </span>
          <div className="w-full flex justify-center">
            <div className="h-11 px-6 rounded-[8px] bg-foreground text-background flex items-center justify-center text-sm font-semibold">
              Submit
            </div>
          </div>
          <code className="text-xs text-muted-foreground font-mono">
            radius: 8px · padding: 24px
          </code>
        </div>

        {/* "Consumer" button — subtly drifted */}
        <div className="rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8 flex flex-col items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground">
            Your app
          </span>
          <div className="w-full flex justify-center">
            <div className="h-11 px-5 rounded-[6px] bg-foreground text-background flex items-center justify-center text-sm font-semibold">
              Submit
            </div>
          </div>
          <code className="text-xs text-muted-foreground font-mono">
            radius: 6px · padding: 20px
          </code>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        {revealed ? "Hide difference" : "Spot the difference?"}
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-500",
          revealed ? "max-h-24 opacity-100 mt-3" : "max-h-0 opacity-0",
        )}
      >
        <div className="rounded-lg bg-muted/50 border border-border-card px-4 py-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">border-radius</span>{" "}
          changed from <code className="font-mono">8px</code> to{" "}
          <code className="font-mono">6px</code>. Tiny? Yes. But multiply this
          by 50 components across 3 apps, and your design system dissolves.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 2. The Fingerprint — Radar ─────────────────────── */

const RADAR_CATEGORIES = [
  { label: "Palette", angle: -90 },
  { label: "Spacing", angle: -18 },
  { label: "Typography", angle: 54 },
  { label: "Surfaces", angle: 126 },
  { label: "Decisions", angle: 198 },
];

function polarToCartesian(
  angleDeg: number,
  radius: number,
  cx: number,
  cy: number,
) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
}

function radarPath(
  values: number[],
  maxRadius: number,
  cx: number,
  cy: number,
) {
  return values
    .map((v, i) => {
      const { x, y } = polarToCartesian(
        RADAR_CATEGORIES[i].angle,
        v * maxRadius,
        cx,
        cy,
      );
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ")
    .concat(" Z");
}

function RadarChart({
  parentValues,
  childValues,
  animated,
}: {
  parentValues: number[];
  childValues: number[];
  animated: boolean;
}) {
  const cx = 150;
  const cy = 150;
  const maxR = 110;

  return (
    <svg viewBox="-20 0 340 300" className="w-full max-w-[320px] mx-auto">
      {/* Grid rings */}
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon
          key={s}
          points={RADAR_CATEGORIES.map((c) => {
            const { x, y } = polarToCartesian(c.angle, s * maxR, cx, cy);
            return `${x},${y}`;
          }).join(" ")}
          fill="none"
          className="stroke-border-card"
          strokeWidth={0.5}
        />
      ))}

      {/* Axis lines */}
      {RADAR_CATEGORIES.map((c) => {
        const { x, y } = polarToCartesian(c.angle, maxR, cx, cy);
        return (
          <line
            key={c.label}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            className="stroke-border-card"
            strokeWidth={0.5}
          />
        );
      })}

      {/* Parent shape */}
      <path
        d={radarPath(parentValues, maxR, cx, cy)}
        className="fill-foreground/5 stroke-foreground"
        strokeWidth={1.5}
        style={{
          transition: animated ? "d 0.8s ease-out" : "none",
        }}
      />

      {/* Child shape */}
      <path
        d={radarPath(childValues, maxR, cx, cy)}
        className="fill-muted-foreground/8 stroke-muted-foreground"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        style={{
          transition: animated ? "d 0.8s ease-out" : "none",
        }}
      />

      {/* Labels */}
      {RADAR_CATEGORIES.map((c) => {
        const { x, y } = polarToCartesian(c.angle, maxR + 18, cx, cy);
        return (
          <text
            key={c.label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            {c.label}
          </text>
        );
      })}
    </svg>
  );
}

function FingerprintSection() {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 75%",
      once: true,
      onEnter: () => setAnimated(true),
    });

    return () => trigger.kill();
  }, []);

  const parent = [0.85, 0.7, 0.8, 0.65, 0.75];
  const child = animated ? [0.78, 0.6, 0.75, 0.5, 0.7] : parent;

  return (
    <div ref={ref} className="reveal">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <RadarChart
          parentValues={parent}
          childValues={child}
          animated={animated}
        />
        <div>
          <div className="space-y-3">
            {RADAR_CATEGORIES.map((c, i) => {
              const delta = Math.abs(
                parent[i] - (animated ? child[1] : parent[i]),
              );
              return (
                <div key={c.label} className="flex items-center gap-3">
                  <span className="text-sm font-mono w-28 text-muted-foreground">
                    {c.label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-1000"
                      style={{
                        width: `${(animated ? [0.78, 0.6, 0.75, 0.5, 0.7][i] : parent[i]) * 100}%`,
                      }}
                    />
                  </div>
                  {animated && (
                    <span className="text-xs font-mono text-muted-foreground w-8 text-right">
                      {Math.round([0.78, 0.6, 0.75, 0.5, 0.7][i] * 100)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            <span className="inline-block w-3 h-0.5 bg-foreground mr-2 translate-y-[-2px]" />
            Parent&nbsp;&nbsp;
            <span className="inline-block w-3 h-0.5 bg-muted-foreground mr-2 translate-y-[-2px] border-t border-dashed border-muted-foreground" />
            Your system
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────── 3. The Scan — Three lenses ─────────────────────── */

type ScanLens = "values" | "structure" | "visual";

const SCAN_LENSES: {
  id: ScanLens;
  name: string;
  what: string;
  catches: string;
  visual: React.ReactNode;
}[] = [
  {
    id: "values",
    name: "Values",
    what: "Compares design tokens against the parent registry.",
    catches:
      "Hardcoded colors, overridden tokens, missing tokens — the invisible constants that quietly diverge.",
    visual: (
      <div className="space-y-2 font-mono text-xs">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-foreground border border-border-card" />
          <span className="text-muted-foreground">
            --primary:{" "}
            <span className="line-through opacity-50">oklch(0.7 0.15 250)</span>
          </span>
          <span className="text-foreground">oklch(0.65 0.12 245)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-red-200 border border-border-card" />
          <span className="text-red-400">
            #ef4444 ← hardcoded, should be a token
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded border border-dashed border-muted-foreground" />
          <span className="text-muted-foreground">
            --accent: <span className="italic">missing</span>
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "structure",
    name: "Structure",
    what: "Diffs component files between your code and the parent.",
    catches:
      "Added props, removed variants, altered APIs — changes to what components can do.",
    visual: (
      <div className="font-mono text-xs space-y-1">
        <div className="text-muted-foreground">Button.tsx</div>
        <div className="pl-3 border-l-2 border-green-400/50 text-green-400/80">
          + variant: "ghost" | "outline" |{" "}
          <span className="font-bold">"brand"</span>
        </div>
        <div className="pl-3 border-l-2 border-muted-foreground/30 text-muted-foreground/50">
          &nbsp; size: "sm" | "md" | "lg"
        </div>
        <div className="pl-3 border-l-2 border-red-400/50 text-red-400/80">
          - loading?: boolean
        </div>
      </div>
    ),
  },
  {
    id: "visual",
    name: "Visual",
    what: "Renders components and performs pixel-level comparison.",
    catches:
      "Subtle rendering differences from CSS specificity, font rendering, or layout shifts — things code diffs miss.",
    visual: (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-20 rounded-lg bg-muted/50 border border-border-card flex items-center justify-center text-xs text-muted-foreground">
          Expected
        </div>
        <div className="text-muted-foreground text-lg">→</div>
        <div className="flex-1 h-20 rounded-lg bg-muted/50 border border-border-card flex items-center justify-center relative overflow-hidden">
          <span className="text-xs text-muted-foreground">Actual</span>
          <div className="absolute inset-0 bg-red-400/10 mix-blend-multiply" />
          <div className="absolute top-3 right-4 w-8 h-3 rounded bg-red-400/30" />
        </div>
      </div>
    ),
  },
];

function ScanSection() {
  const [active, setActive] = useState<ScanLens>("values");
  const lens = SCAN_LENSES.find((l) => l.id === active)!;

  return (
    <div className="reveal">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-full bg-muted/50 border border-border-card p-1 w-fit mb-8">
        {SCAN_LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => setActive(l.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
              active === l.id
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-display font-semibold text-foreground mb-2">
              {lens.name} scan
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed mb-3">
              {lens.what}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Catches: </span>
              {lens.catches}
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 border border-border-card p-4">
            {lens.visual}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── 4. The Conversation — Stances ──────────────────────── */

function StanceBubble({
  symbol,
  label,
  speaker,
  message,
  align,
}: {
  symbol: string;
  label: string;
  speaker: string;
  message: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "reveal flex gap-4 max-w-lg",
        align === "right" && "ml-auto flex-row-reverse",
      )}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-border-card bg-card flex items-center justify-center font-mono text-lg">
        {symbol}
      </div>
      <div
        className={cn(
          "rounded-[var(--radius-card-sm)] border border-border-card bg-card px-5 py-4",
          align === "right" && "text-right",
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-display font-semibold text-sm">{label}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {speaker}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── 5. The Fleet — Constellation ────────────────────── */

function ConstellationDot({
  x,
  y,
  label,
  size,
}: {
  x: number;
  y: number;
  label: string;
  size: number;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={size} className="fill-foreground/80" />
      <circle
        cx={x}
        cy={y}
        r={size + 6}
        className="fill-foreground/5 stroke-foreground/20"
        strokeWidth={0.5}
      />
      <text
        x={x}
        y={y + size + 16}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px] font-mono"
      >
        {label}
      </text>
    </g>
  );
}

function FleetConstellation() {
  const systems = [
    { x: 100, y: 90, label: "Core", size: 7 },
    { x: 135, y: 110, label: "Marketing", size: 5 },
    { x: 115, y: 135, label: "Mobile", size: 5 },
    { x: 230, y: 160, label: "Legacy", size: 4 },
    { x: 250, y: 100, label: "Checkout", size: 5 },
  ];

  // Draw lines between close systems
  const connections: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 2],
    [3, 4],
  ];

  return (
    <svg viewBox="0 0 340 220" className="w-full max-w-[440px] mx-auto">
      {/* Connections */}
      {connections.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={systems[a].x}
          y1={systems[a].y}
          x2={systems[b].x}
          y2={systems[b].y}
          className="stroke-border-card"
          strokeWidth={0.75}
          strokeDasharray="3 3"
        />
      ))}

      {/* Cluster labels */}
      <text
        x={116}
        y={62}
        textAnchor="middle"
        className="fill-muted-foreground/50 text-[9px] font-mono uppercase"
      >
        Cluster A
      </text>
      <text
        x={240}
        y={80}
        textAnchor="middle"
        className="fill-muted-foreground/50 text-[9px] font-mono uppercase"
      >
        Cluster B
      </text>

      {/* Systems */}
      {systems.map((s) => (
        <ConstellationDot key={s.label} {...s} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════ Main page ════════════════════════════════ */

export default function ConceptsPage() {
  return (
    <SectionWrapper>
      <AnimatedPageHeader
        kicker="Concepts"
        title="How Ghost Works"
        description="Design systems drift silently. Ghost gives you the language — and the tools — to see it, measure it, and decide what to do about it."
      />

      {/* ── Chapter 1: The Problem ──────────────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>Chapter 1</ChapterLabel>
        <ChapterTitle>The Problem</ChapterTitle>
        <ChapterLead>
          Design systems don't break loudly. They erode — a color changed here,
          a radius tweaked there. Six months later, your "shared" system is
          three different systems wearing the same name.
        </ChapterLead>
        <DriftSpotlight />
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          This is <strong className="text-foreground">drift</strong>. It's the
          gap between what your design system says and what your apps actually
          render. Ghost exists to make that gap visible.
        </p>
      </Chapter>

      {/* ── Chapter 2: The Fingerprint ────────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>Chapter 2</ChapterLabel>
        <ChapterTitle>The Fingerprint</ChapterTitle>
        <ChapterLead>
          Ghost sends your design system through an LLM and records what it
          sees, in three layers: a holistic observation, the abstract design
          decisions behind it, and the concrete values. Similar systems produce
          similar fingerprints. Different ones don't.
        </ChapterLead>
        <div className="reveal mb-10 grid sm:grid-cols-3 gap-4">
          {[
            {
              layer: "Layer 1",
              name: "Observation",
              desc: "A holistic read: personality, distinctive traits, closest reference systems.",
            },
            {
              layer: "Layer 2",
              name: "Decisions",
              desc: "Abstract, implementation-agnostic choices — stated in words, not hex codes.",
            },
            {
              layer: "Layer 3",
              name: "Values",
              desc: "Concrete tokens: palette, spacing, typography, surfaces.",
            },
          ].map((l) => (
            <div
              key={l.name}
              className="rounded-[var(--radius-card-sm)] border border-border-card bg-card p-5"
            >
              <div className="font-mono text-xs uppercase text-muted-foreground mb-1">
                {l.layer}
              </div>
              <div className="font-display text-base font-semibold mb-2">
                {l.name}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {l.desc}
              </p>
            </div>
          ))}
        </div>
        <FingerprintSection />
        <div className="reveal mt-10 grid sm:grid-cols-5 gap-4">
          {[
            { cat: "Palette", pct: "30%", desc: "Colors, neutrals, contrast" },
            { cat: "Spacing", pct: "20%", desc: "Scale, rhythm, base unit" },
            { cat: "Typography", pct: "20%", desc: "Families, sizes, weights" },
            { cat: "Surfaces", pct: "15%", desc: "Radii, shadows, borders" },
            {
              cat: "Decisions",
              pct: "15%",
              desc: "Abstract design choices",
            },
          ].map((c) => (
            <div
              key={c.cat}
              className="group rounded-lg border border-border-card hover:border-foreground/25 bg-card p-4 text-center transition-colors duration-300"
            >
              <div className="font-mono text-lg font-bold text-foreground">
                {c.pct}
              </div>
              <div className="relative inline-block font-display text-sm font-semibold mt-1">
                <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                  {c.cat}
                </span>
                <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">{c.desc}</div>
            </div>
          ))}
        </div>
        <p className="reveal mt-6 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Palette weighs heaviest — color is the first thing people notice.
          Decisions contribute when both fingerprints have them embedded;
          otherwise they're reported qualitatively and excluded from the scalar
          so unscored text doesn't pollute the number.
        </p>
        <p className="reveal mt-4 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Decisions are matched semantically. Each one is embedded at profile
          time, and{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            compare
          </code>{" "}
          pairs them by cosine similarity above a{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            0.75
          </code>{" "}
          threshold — so{" "}
          <em>"achromatic chrome with chromatic accents"</em> matches{" "}
          <em>"neutral UI, color reserved for data"</em> without the wording
          having to line up.
        </p>
      </Chapter>

      {/* ── Chapter 3: The Scan ───────────────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>Chapter 3</ChapterLabel>
        <ChapterTitle>The Scan</ChapterTitle>
        <ChapterLead>
          Once Ghost knows what your system looks like, it can check for drift.
          Three complementary scans — like three different lenses on the same
          microscope — each catch different kinds of divergence.
        </ChapterLead>
        <ScanSection />
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Run all three with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost scan
          </code>{" "}
          or pick one with{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost scan --values
          </code>
          . Each scan produces a structured report you can pipe into CI.
        </p>
      </Chapter>

      {/* ── Chapter 4: The Conversation ───────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>Chapter 4</ChapterLabel>
        <ChapterTitle>The Conversation</ChapterTitle>
        <ChapterLead>
          Not all drift is bad. Sometimes you changed that color on purpose.
          Ghost tracks your intent through stances — a way to say "yes, I know,
          and here's why."
        </ChapterLead>
        <div className="space-y-4">
          <StanceBubble
            symbol="="
            label="Aligned"
            speaker="ghost ack --aligned"
            message="We're tracking the parent. If this drifted, it's a bug — fix it."
            align="left"
          />
          <StanceBubble
            symbol="*"
            label="Accepted"
            speaker="ghost ack --accepted"
            message="We know this is different. We've reviewed it. It's a known trade-off, not an oversight."
            align="right"
          />
          <StanceBubble
            symbol="~"
            label="Diverging"
            speaker="ghost diverge"
            message="This is ours now. We own it. Stop measuring it against the parent."
            align="left"
          />
        </div>
        <p className="reveal mt-10 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Stances are stored per-dimension in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            .ghost-sync.json
          </code>
          , with optional reasoning. Over time, Ghost tracks whether you're
          converging toward your parent, diverging away, staying stable, or
          oscillating.
        </p>
      </Chapter>

      {/* ── Chapter 5: The Fleet ──────────────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>Chapter 5</ChapterLabel>
        <ChapterTitle>The Fleet</ChapterTitle>
        <ChapterLead>
          When your org has multiple design systems — a core plus product forks
          — Ghost zooms out. It shows you who's a twin, who's the outlier, and
          how the whole family is evolving.
        </ChapterLead>
        <div className="reveal rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8">
          <FleetConstellation />
          <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border-card">
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-foreground">
                Pairwise distance
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How far apart every pair of systems is
              </p>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-foreground">
                Clustering
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Natural families that emerge from similarity
              </p>
            </div>
            <div className="text-center">
              <div className="font-mono text-sm font-bold text-foreground">
                3D projection
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                PCA down to three axes, rendered in Three.js
              </p>
            </div>
          </div>
        </div>
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost fleet
          </code>{" "}
          with multiple registries to see the full picture, or{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost viz
          </code>{" "}
          to explore it interactively in 3D.
        </p>
      </Chapter>

      {/* ── Closing ───────────────────────────────────────────────── */}
      <Chapter className="border-t border-border/40">
        <ChapterLabel>That's Ghost</ChapterLabel>
        <ChapterTitle>Fingerprint. Scan. Decide. Repeat.</ChapterTitle>
        <ChapterLead>
          Ghost doesn't tell you what to do — it gives you the information to
          decide. Align, accept, or diverge. The choice is yours. The visibility
          is Ghost's job.
        </ChapterLead>
        <div className="reveal grid sm:grid-cols-4 gap-4">
          {[
            {
              file: "ghost.config.ts",
              desc: "How to detect drift",
            },
            {
              file: ".ghost-fingerprint.json",
              desc: "What the system looks like",
            },
            {
              file: ".ghost-sync.json",
              desc: "How you intend to diverge",
            },
            {
              file: ".ghost/history.jsonl",
              desc: "How the system evolved",
            },
          ].map((a) => (
            <div
              key={a.file}
              className="group rounded-lg border border-border-card hover:border-foreground/25 bg-card p-4 transition-colors duration-300"
            >
              <span className="relative inline-block">
                <code className="relative z-10 text-xs font-mono font-semibold transition-colors duration-300 group-hover:text-background">
                  {a.file}
                </code>
                <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
              </span>
              <p className="text-xs text-muted-foreground mt-2">{a.desc}</p>
            </div>
          ))}
        </div>
      </Chapter>

      {/* bottom spacer for dock */}
      <div className="h-24" />
    </SectionWrapper>
  );
}
