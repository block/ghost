"use client";

import { cn } from "ghost-ui";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

/* ─────────────────────────── Step wrapper ─────────────────────────── */

function Step({
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

function StepLabel({ children }: { children: React.ReactNode }) {
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

function StepTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="reveal font-display font-black tracking-[-0.04em] leading-[0.92] mb-4"
      style={{ fontSize: "var(--heading-sub-font-size)" }}
    >
      {children}
    </h2>
  );
}

function StepLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="reveal max-w-[52ch] text-muted-foreground leading-relaxed text-lg mb-10">
      {children}
    </p>
  );
}

/* ─────────────────────── 1. Map — map.md excerpt ────────────────── */

function MapExcerpt() {
  return (
    <div className="reveal rounded-[var(--radius-card-sm)] border border-border-card bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-card bg-muted/30">
        <code className="text-xs font-mono text-muted-foreground">map.md</code>
        <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
          excerpt
        </span>
      </div>
      <pre className="px-5 py-5 text-xs md:text-[13px] font-mono leading-relaxed overflow-x-auto">
        <code>
          <span className="text-muted-foreground">{"---\n"}</span>
          <span className="text-foreground">schema</span>
          <span className="text-muted-foreground">: ghost.map/v1{"\n"}</span>
          <span className="text-foreground">id</span>
          <span className="text-muted-foreground">: ghost{"\n"}</span>
          <span className="text-foreground">repo</span>
          <span className="text-muted-foreground">: block/ghost{"\n"}</span>
          <span className="text-foreground">composition</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  frameworks:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            {'{ name: react, version: "19" }'}
            {"\n"}
          </span>
          <span className="text-muted-foreground">{"  styling:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">tailwind{"\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">css-vars{"\n"}</span>
          <span className="text-foreground">registry</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  path: "}</span>
          <span className="text-foreground">
            packages/ghost-ui/registry.json{"\n"}
          </span>
          <span className="text-muted-foreground">{"  components: "}</span>
          <span className="text-foreground">97{"\n"}</span>
          <span className="text-foreground">design_system</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  paths:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            packages/ghost-ui/src/components{"\n"}
          </span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            packages/ghost-ui/src/styles{"\n"}
          </span>
          <span className="text-muted-foreground">{"  entry_files:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            packages/ghost-ui/src/styles/tokens.css{"\n"}
          </span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            packages/ghost-ui/expression.md{"\n"}
          </span>
          <span className="text-foreground">ui_surface</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  include:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            packages/ghost-ui/src/components/**{"\n"}
          </span>
          <span className="text-muted-foreground">{"  exclude:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">&quot;**/dist/**&quot;{"\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            &quot;**/node_modules/**&quot;{"\n"}
          </span>
          <span className="text-muted-foreground">{"---\n"}</span>
        </code>
      </pre>
    </div>
  );
}

/* ─────────────────────── 2. Profile — expression.md excerpt ─────── */

function ExpressionExcerpt() {
  return (
    <div className="reveal rounded-[var(--radius-card-sm)] border border-border-card bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border-card bg-muted/30">
        <code className="text-xs font-mono text-muted-foreground">
          packages/ghost-ui/expression.md
        </code>
        <span className="text-[10px] font-mono uppercase text-muted-foreground tracking-widest">
          excerpt
        </span>
      </div>
      <pre className="px-5 py-5 text-xs md:text-[13px] font-mono leading-relaxed overflow-x-auto">
        <code>
          <span className="text-muted-foreground">{"---\n"}</span>
          <span className="text-foreground">id</span>
          <span className="text-muted-foreground">: ghost-ui{"\n"}</span>
          <span className="text-foreground">observation</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  personality:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">monochromatic{"\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">editorial{"\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">pill-shaped{"\n"}</span>
          <span className="text-muted-foreground">{"  resembles:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">Vercel Geist{"\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">Linear{"\n"}</span>
          <span className="text-foreground">decisions</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">
            {"  - dimension: color-strategy\n"}
          </span>
          <span className="text-muted-foreground">
            {"  - dimension: shape-language\n"}
          </span>
          <span className="text-muted-foreground">
            {"  - dimension: typography-voice\n"}
          </span>
          <span className="text-muted-foreground">{"  …\n"}</span>
          <span className="text-foreground">palette</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">{"  dominant:\n"}</span>
          <span className="text-muted-foreground">{"    - "}</span>
          <span className="text-foreground">
            role: primary, value: &quot;#1a1a1a&quot;{"\n"}
          </span>
          <span className="text-muted-foreground">{"  neutrals:\n"}</span>
          <span className="text-muted-foreground">
            {"    count: 12  # 12-step monochromatic ramp\n"}
          </span>
          <span className="text-foreground">surfaces</span>
          <span className="text-muted-foreground">:{"\n"}</span>
          <span className="text-muted-foreground">
            {"  borderRadii: [10, 14, 16, 20, 24, 999]\n"}
          </span>
          <span className="text-muted-foreground">{"---\n\n"}</span>
          <span className="text-foreground font-semibold"># Character</span>
          <span className="text-muted-foreground">
            {
              "\n\nA monochromatic, magazine-inspired design language that treats color\nas communication rather than decoration. The default palette is entirely\nachromatic. Pill-shaped interactive elements contrast with moderately\nrounded containers…\n\n"
            }
          </span>
          <span className="text-foreground font-semibold"># Decisions</span>
          <span className="text-foreground font-semibold">
            {"\n\n### color-strategy"}
          </span>
          <span className="text-muted-foreground">
            {
              "\n\nTreat hue as opt-in communication, not ambient decoration — the default\ntheme is pure achromatic, so every bit of chromatic color that appears\ncarries semantic meaning…\n"
            }
          </span>
        </code>
      </pre>
    </div>
  );
}

/* ─────────────────────── 2. Compare — Radar + delta ─────────────── */

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
  referenceValues,
  localValues,
  animated,
}: {
  referenceValues: number[];
  localValues: number[];
  animated: boolean;
}) {
  const cx = 150;
  const cy = 150;
  const maxR = 110;

  return (
    <svg viewBox="-20 0 340 300" className="w-full max-w-[320px] mx-auto">
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

      <path
        d={radarPath(referenceValues, maxR, cx, cy)}
        className="fill-foreground/5 stroke-foreground"
        strokeWidth={1.5}
        style={{
          transition: animated ? "d 0.8s ease-out" : "none",
        }}
      />

      <path
        d={radarPath(localValues, maxR, cx, cy)}
        className="fill-muted-foreground/8 stroke-muted-foreground"
        strokeWidth={1.5}
        strokeDasharray="4 3"
        style={{
          transition: animated ? "d 0.8s ease-out" : "none",
        }}
      />

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

function CompareSection() {
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

  const reference = [0.85, 0.7, 0.8, 0.65, 0.75];
  const localTarget = [0.78, 0.6, 0.75, 0.5, 0.7];
  const local = animated ? localTarget : reference;

  const deltas = [
    { dim: "palette", delta: 0.05, status: "aligned" },
    { dim: "spacing", delta: 0.22, status: "drifting" },
    { dim: "typography", delta: 0.09, status: "aligned" },
    { dim: "surfaces", delta: 0.41, status: "diverged" },
    { dim: "decisions", delta: 0.17, status: "drifting" },
  ];

  return (
    <div ref={ref} className="reveal">
      <div className="grid md:grid-cols-2 gap-8 items-center">
        <RadarChart
          referenceValues={reference}
          localValues={local}
          animated={animated}
        />
        <div>
          <div className="space-y-2">
            {deltas.map((d) => (
              <div
                key={d.dim}
                className="flex items-center gap-3 font-mono text-xs"
              >
                <span className="w-24 text-muted-foreground">{d.dim}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      d.status === "aligned" && "bg-foreground/40",
                      d.status === "drifting" && "bg-foreground/70",
                      d.status === "diverged" && "bg-foreground",
                    )}
                    style={{
                      width: animated
                        ? `${Math.min(d.delta * 200, 100)}%`
                        : "0%",
                    }}
                  />
                </div>
                <span
                  className={cn(
                    "w-20 text-right text-[10px] uppercase tracking-wider",
                    d.status === "aligned" && "text-muted-foreground",
                    d.status === "drifting" && "text-foreground/70",
                    d.status === "diverged" && "text-foreground",
                  )}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            <span className="inline-block w-3 h-0.5 bg-foreground mr-2 translate-y-[-2px]" />
            Reference&nbsp;&nbsp;
            <span className="inline-block w-3 h-0.5 bg-muted-foreground mr-2 translate-y-[-2px] border-t border-dashed border-muted-foreground" />
            Local
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-border-card bg-muted/20 p-4 font-mono text-xs">
        <div className="text-muted-foreground mb-2 uppercase tracking-wider text-[10px]">
          Decisions — semantic match (cosine ≥ 0.75)
        </div>
        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
          <div className="text-foreground italic">
            &ldquo;achromatic chrome with chromatic accents&rdquo;
          </div>
          <div className="text-muted-foreground text-center">
            ≈ <span className="text-foreground">0.84</span> →
          </div>
          <div className="text-foreground italic">
            &ldquo;neutral UI, color reserved for data&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── 3. Review — three scopes ─────────────────── */

type ReviewScope = "files" | "project" | "suite";

const REVIEW_SCOPES: {
  id: ReviewScope;
  name: string;
  what: string;
  catches: string;
  visual: React.ReactNode;
}[] = [
  {
    id: "files",
    name: "Files",
    what: "The host agent diffs changed files against the local expression.md. Zero-config; flags changed lines by default.",
    catches:
      "Hardcoded colors outside the palette, off-scale spacing, type choices that violate the expression's decisions, wrong-radius interactive surfaces.",
    visual: (
      <div className="font-mono text-[11px] leading-relaxed space-y-1">
        <div className="text-muted-foreground">
          <span className="text-foreground">apps/web/src/UpgradeCard.tsx</span>
        </div>
        <div className="pl-2 border-l-2 border-red-400/40 text-red-400/80 mt-2">
          + className=&quot;rounded-md&quot;
        </div>
        <div className="pl-2 text-muted-foreground">
          &nbsp;&nbsp;
          <span className="italic">
            shape-language: buttons are pill (999px), not 6px
          </span>
        </div>
        <div className="pl-2 border-l-2 border-red-400/40 text-red-400/80 mt-2">
          + padding: 13px
        </div>
        <div className="pl-2 text-muted-foreground">
          &nbsp;&nbsp;
          <span className="italic">off-scale — nearest: 12, 16</span>
        </div>
        <div className="pl-2 border-l-2 border-red-400/40 text-red-400/80 mt-2">
          + background: #fafafa
        </div>
        <div className="pl-2 text-muted-foreground">
          &nbsp;&nbsp;
          <span className="italic">hardcoded — use --background-alt</span>
        </div>
        <div className="pl-2 border-l-2 border-yellow-400/40 text-yellow-400/80 mt-2">
          ~ fontFamily: &quot;Inter&quot;
        </div>
        <div className="pl-2 text-muted-foreground">
          &nbsp;&nbsp;
          <span className="italic">
            typography-voice: ships system-ui, no bundled fonts
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "project",
    name: "Project",
    what: "The agent profiles the whole target, then ghost-drift compare returns per-dimension deltas against a reference expression. CI-friendly via --format json.",
    catches:
      "Cumulative drift across an entire system: per-dimension deltas and a scalar distance you can fail builds on.",
    visual: (
      <div className="font-mono text-xs space-y-1">
        <div className="text-muted-foreground">
          Overall drift: <span className="text-foreground">0.17</span> / 0.30
          threshold
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground mt-2">
          palette{" "}
          <span className="text-green-400/80">= 0.05 &nbsp; aligned</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          spacing{" "}
          <span className="text-yellow-400/80">~ 0.22 &nbsp; drifting</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          surfaces{" "}
          <span className="text-red-400/80">≠ 0.41 &nbsp; diverged</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          decisions{" "}
          <span className="text-yellow-400/80">~ 0.17 &nbsp; drifting</span>
        </div>
      </div>
    ),
  },
  {
    id: "suite",
    name: "Suite",
    what: "The verify recipe drives the generate → review loop across a prompt suite. Classifies each dimension as tight, leaky, or uncaptured.",
    catches:
      "Gaps in the expression itself: dimensions the generator drifts on because Decisions under-specify them.",
    visual: (
      <div className="font-mono text-xs space-y-1">
        <div className="text-muted-foreground">18 prompts · 14 passed</div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground mt-2">
          palette <span className="text-green-400/80">tight (0.4)</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          spacing <span className="text-yellow-400/80">leaky (2.1)</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          surfaces <span className="text-yellow-400/80">leaky (1.6)</span>
        </div>
        <div className="pl-3 border-l-2 border-border-card text-muted-foreground">
          motion <span className="text-red-400/80">uncaptured (3.7)</span>
        </div>
      </div>
    ),
  },
];

function ReviewSection() {
  const [active, setActive] = useState<ReviewScope>("files");
  const lens = REVIEW_SCOPES.find((l) => l.id === active)!;

  return (
    <div className="reveal">
      <div className="flex gap-1 rounded-full bg-muted/50 border border-border-card p-1 w-fit mb-8">
        {REVIEW_SCOPES.map((l) => (
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

      <div className="rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h4 className="font-display font-semibold text-foreground mb-2">
              review: {lens.name.toLowerCase()}
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

/* ──────────────── 4. Evolve — Stances + history ──────────────────── */

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

type Stance = "aligned" | "drifting" | "accepted" | "diverging";
type ActiveStance = "aligned" | "accepted" | "diverging";

const STANCE_FILL: Record<Stance, string> = {
  aligned: "fill-foreground/40",
  drifting: "fill-foreground/70",
  accepted: "fill-foreground",
  diverging: "fill-foreground",
};

function HistoryRibbon() {
  const points: { t: string; v: number; stance: Stance }[] = [
    { t: "Jan", v: 0.08, stance: "aligned" },
    { t: "Feb", v: 0.12, stance: "aligned" },
    { t: "Mar", v: 0.18, stance: "drifting" },
    { t: "Apr", v: 0.22, stance: "accepted" },
    { t: "May", v: 0.24, stance: "accepted" },
    { t: "Jun", v: 0.31, stance: "diverging" },
    { t: "Jul", v: 0.36, stance: "diverging" },
  ];
  const [playhead, setPlayhead] = useState<number | null>(null);
  const [hypothesis, setHypothesis] = useState<ActiveStance>("aligned");

  const max = 0.5;
  const w = 420;
  const h = 80;
  const stepX = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * stepX;
      const y = h - (p.v / max) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const effectiveStance = (i: number): Stance =>
    playhead !== null && i >= playhead ? hypothesis : points[i].stance;

  const setPlayheadFromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const local = pt.matrixTransform(ctm.inverse());
    const ratio = Math.max(0, Math.min(1, local.x / w));
    const idx = Math.round(ratio * (points.length - 1));
    setPlayhead(idx);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlayheadFromPointer(e);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!(e.buttons & 1)) return;
    setPlayheadFromPointer(e);
  };

  const playheadX = playhead !== null ? playhead * stepX : null;
  const monthsAffected = playhead !== null ? points.length - playhead : 0;

  return (
    <div className="reveal mt-10 rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6">
      <div className="flex items-baseline justify-between mb-3">
        <div className="font-display text-sm font-semibold">
          distance to tracked expression, over time
        </div>
        <code className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
          .ghost/history.jsonl
        </code>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-[10px] font-mono uppercase tracking-wider">
        <span className="text-muted-foreground">if stance from playhead =</span>
        {(["aligned", "accepted", "diverging"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setHypothesis(s)}
            className={cn(
              "px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
              hypothesis === s
                ? "bg-foreground text-background border-foreground"
                : "border-border-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "aligned"
              ? "= aligned"
              : s === "accepted"
                ? "* accepted"
                : "~ diverging"}
          </button>
        ))}
        {playhead !== null && (
          <button
            type="button"
            onClick={() => setPlayhead(null)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            reset
          </button>
        )}
      </div>

      <svg
        viewBox={`-8 -12 ${w + 16} ${h + 36}`}
        className="w-full max-w-[480px] cursor-ew-resize touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        <line
          x1={0}
          y1={h - (0.3 / max) * h}
          x2={w}
          y2={h - (0.3 / max) * h}
          className="stroke-border-card"
          strokeDasharray="3 3"
          strokeWidth={0.75}
        />
        <text
          x={w}
          y={h - (0.3 / max) * h - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[9px] font-mono"
        >
          threshold 0.30
        </text>
        <path
          d={path}
          fill="none"
          className="stroke-foreground"
          strokeWidth={1.5}
        />
        {playheadX !== null && (
          <g>
            <line
              x1={playheadX}
              y1={-10}
              x2={playheadX}
              y2={h + 6}
              className="stroke-foreground"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
            <rect
              x={playheadX - 4}
              y={-12}
              width={8}
              height={5}
              className="fill-foreground"
            />
          </g>
        )}
        {points.map((p, i) => {
          const x = i * stepX;
          const y = h - (p.v / max) * h;
          const stance = effectiveStance(i);
          return (
            <g key={p.t}>
              <circle
                cx={x}
                cy={y}
                r={3}
                className={cn(
                  STANCE_FILL[stance],
                  "transition-colors duration-300",
                )}
              />
              <text
                x={x}
                y={h + 14}
                textAnchor="middle"
                className={cn(
                  "text-[9px] font-mono transition-colors duration-200",
                  playhead !== null && i === playhead
                    ? "fill-foreground"
                    : "fill-muted-foreground",
                )}
              >
                {p.t}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-4 text-xs text-muted-foreground leading-relaxed max-w-[52ch]">
        {playhead === null ? (
          <>
            Crossing the threshold in March could have been noise. The{" "}
            <em>accepted</em> stance in April said &ldquo;yes, on
            purpose.&rdquo; The <em>diverging</em> stance in June said &ldquo;we
            own this now.&rdquo; The curve hasn&apos;t changed shape — but the
            meaning of every point after it has.{" "}
            <span className="text-foreground/70">
              Drag the chart to scrub a decision moment.
            </span>
          </>
        ) : (
          <>
            From{" "}
            <strong className="text-foreground">{points[playhead].t}</strong>{" "}
            forward — {monthsAffected}{" "}
            {monthsAffected === 1 ? "month" : "months"} re-classified as{" "}
            <em>{hypothesis}</em>.{" "}
            {hypothesis === "aligned" &&
              "A bug to fix on every point past the playhead."}
            {hypothesis === "accepted" &&
              "Reviewed and OK — known, intentional drift."}
            {hypothesis === "diverging" &&
              "This dimension is ours now; the parent no longer measures it."}
          </>
        )}
      </p>
    </div>
  );
}

/* ─────────────────── 5. Org — the org expression ────────────────── */

function OrgExpression() {
  const systems = [
    { x: 105, y: 85, label: "Core", size: 8, cluster: "A" },
    { x: 140, y: 105, label: "Marketing", size: 5, cluster: "A" },
    { x: 115, y: 135, label: "Mobile", size: 5, cluster: "A" },
    { x: 85, y: 120, label: "Docs", size: 4, cluster: "A" },
    { x: 245, y: 90, label: "Checkout", size: 7, cluster: "B" },
    { x: 275, y: 115, label: "Admin", size: 5, cluster: "B" },
    { x: 225, y: 140, label: "Receipts", size: 4, cluster: "B" },
    { x: 180, y: 190, label: "Legacy", size: 4, cluster: "—" },
  ];

  const connections: [number, number][] = [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [4, 5],
    [4, 6],
    [5, 6],
  ];

  return (
    <svg viewBox="0 0 340 230" className="w-full max-w-[480px] mx-auto">
      <ellipse
        cx={115}
        cy={115}
        rx={65}
        ry={45}
        className="fill-foreground/[0.03] stroke-border-card"
        strokeWidth={0.5}
        strokeDasharray="2 3"
      />
      <ellipse
        cx={250}
        cy={117}
        rx={50}
        ry={40}
        className="fill-foreground/[0.03] stroke-border-card"
        strokeWidth={0.5}
        strokeDasharray="2 3"
      />

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

      <text
        x={115}
        y={55}
        textAnchor="middle"
        className="fill-muted-foreground/60 text-[9px] font-mono uppercase"
      >
        Cluster A · core
      </text>
      <text
        x={250}
        y={65}
        textAnchor="middle"
        className="fill-muted-foreground/60 text-[9px] font-mono uppercase"
      >
        Cluster B · commerce
      </text>
      <text
        x={180}
        y={215}
        textAnchor="middle"
        className="fill-muted-foreground/60 text-[9px] font-mono uppercase"
      >
        outlier
      </text>

      {systems.map((s) => (
        <g key={s.label}>
          <circle
            cx={s.x}
            cy={s.y}
            r={s.size}
            className={cn(
              s.cluster === "—"
                ? "fill-muted-foreground"
                : "fill-foreground/80",
            )}
          />
          <circle
            cx={s.x}
            cy={s.y}
            r={s.size + 6}
            className="fill-foreground/5 stroke-foreground/20"
            strokeWidth={0.5}
          />
          <text
            x={s.x}
            y={s.y + s.size + 14}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px] font-mono"
          >
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════ Public component ═════════════════════════ */

export function WorkflowContent() {
  return (
    <>
      {/* ── Step 1: Map ─────────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 01 · Map</StepLabel>
        <StepTitle>Map the project</StepTitle>
        <StepLead>
          Before profiling can happen, the host agent needs to know{" "}
          <em>where the design system actually lives</em> in your repo.{" "}
          <code>ghost-map</code> walks the project — manifests, language
          histogram, component registry, styling system — and writes a{" "}
          <code>map.md</code> at the repo root: a navigation card every other
          Ghost tool reads.
        </StepLead>
        <MapExcerpt />
        <div className="reveal mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              layer: "Topology",
              name: "Where",
              desc: "design_system.paths and entry_files — the folders and files that own the look.",
            },
            {
              layer: "Composition",
              name: "How",
              desc: "Frameworks, styling system, build manifest. The shape of the codebase, not the look.",
            },
            {
              layer: "Surface",
              name: "What counts",
              desc: "ui_surface globs — what's user-facing UI vs. tooling, tests, dist artifacts.",
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
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          The map is short on purpose — pointers, not contents. It tells{" "}
          <code>ghost-expression</code> which folders to read when profiling,
          and tells <code>ghost-fleet</code> which surfaces to count when
          aggregating. The success gate is <code>ghost-map lint</code>, which
          validates against <code>ghost.map/v1</code>.
        </p>
      </Step>

      {/* ── Step 2: Profile ─────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 02 · Profile</StepLabel>
        <StepTitle>Write an expression.md</StepTitle>
        <StepLead>
          With <code>map.md</code> in place, open the project in a host agent
          with the <code>ghost-expression</code> skill installed and ask it to{" "}
          <em>profile this design language</em>. The recipe follows the map to
          your theme CSS, tailwind config, and component primitives, resolves
          variable chains, and writes a single <code>expression.md</code> at the
          repo root — YAML frontmatter for machines, Markdown body for humans.
        </StepLead>
        <ExpressionExcerpt />
        <div className="reveal mt-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              layer: "Perspective 1",
              name: "Observation",
              desc: "A holistic read: personality, distinctive traits, closest reference systems.",
            },
            {
              layer: "Perspective 2",
              name: "Decisions",
              desc: "Abstract, implementation-agnostic choices, stated in words — not hex codes.",
            },
            {
              layer: "Perspective 3",
              name: "Tokens",
              desc: "Concrete values: palette, spacing, typography, surfaces, roles.",
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
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          The agent writes the expression. The CLI is the calculator it reaches
          for: lint, compare, diff — same answer every time. The final step of
          every profile is <code>ghost-expression lint</code>, which validates
          the schema and flags body/frontmatter incoherence before anything else
          touches it.
        </p>
      </Step>

      {/* ── Step 3: Compare ────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 03 · Compare</StepLabel>
        <StepTitle>Measure the distance</StepTitle>
        <StepLead>
          Two expressions in, one answer out: an overall distance, a
          per-dimension delta, and — with <code>--semantic</code> — a
          paraphrase-robust pairing of decisions. Similar systems produce
          similar expressions; different ones don&apos;t.
        </StepLead>
        <CompareSection />
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
          Palette weighs heaviest — color is the first thing anyone notices.
          Decisions contribute only when both expressions have embedded them;
          otherwise they&apos;re reported qualitatively and excluded from the
          scalar so unscored prose doesn&apos;t pollute the number.
        </p>
      </Step>

      {/* ── Step 4: Review ──────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 04 · Review</StepLabel>
        <StepTitle>Catch drift in a PR</StepTitle>
        <StepLead>
          <em>Review</em> is a skill recipe your host agent runs, not a CLI
          verb. It answers three scopes of drift question — tight (this PR),
          medium (a target snapshot), broad (the whole expression&apos;s schema
          discipline). Same answer shape every time.
        </StepLead>
        <ReviewSection />
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          The agent reaches for the CLI as it needs reproducible answers:{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost-drift compare
          </code>{" "}
          for distance,{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost-expression lint
          </code>{" "}
          for validation. For a per-project, pre-baked review command, run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost-expression emit review-command
          </code>{" "}
          and the agent will pick it up the next time you open a PR.
        </p>
      </Step>

      {/* ── Step 5: Evolve ─────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 05 · Evolve</StepLabel>
        <StepTitle>Turn drift into signal</StepTitle>
        <StepLead>
          Not every drift is a bug. Sometimes you changed that radius on
          purpose. Ghost tracks your intent through stances: a way for the local
          team to say &ldquo;yes, I know, and here&apos;s why&rdquo; —
          per-dimension, with reasoning attached.
        </StepLead>
        <div className="space-y-4">
          <StanceBubble
            symbol="="
            label="Aligned"
            speaker="ghost-drift ack --stance aligned"
            message="We're tracking this expression. If this drifted, it's a bug. Fix it."
            align="left"
          />
          <StanceBubble
            symbol="*"
            label="Accepted"
            speaker="ghost-drift ack --stance accepted"
            message="We know this is different. We've reviewed it. It's a known trade-off, not an oversight."
            align="right"
          />
          <StanceBubble
            symbol="~"
            label="Diverging"
            speaker="ghost-drift diverge <dimension>"
            message="This is ours now. We own it. Stop measuring this dimension against the tracked expression."
            align="left"
          />
        </div>
        <HistoryRibbon />
        <p className="reveal mt-6 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Stances are stored per-dimension in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            .ghost-sync.json
          </code>
          ; the distance curve lives in{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            .ghost/history.jsonl
          </code>
          . Ghost separates &ldquo;what is happening&rdquo; from &ldquo;what it
          means,&rdquo; and hands the second answer to the team that lives in
          the code.
        </p>
      </Step>

      {/* ── Step 6: Org ────────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Step 06 · Org</StepLabel>
        <StepTitle>Zoom out to the org expression</StepTitle>
        <StepLead>
          Most orgs don&apos;t have one design language — they have several
          product expressions, a legacy surface still in production, and an
          acquired product finding its voice. The composite is an expression of
          its own: the org&apos;s expression, made of the expressions inside it.
          Feed three or more to <code>compare</code> and Ghost returns the
          pairwise matrix, natural clusters, a centroid, and an outlier list.
        </StepLead>
        <div className="reveal rounded-[var(--radius-card-sm)] border border-border-card bg-card p-6 md:p-8">
          <OrgExpression />
          <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-border-card">
            <div>
              <div className="font-mono text-sm font-bold text-foreground">
                Find twins
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Expressions that cluster tightly are candidates to share a
                reference — or to fold together outright.
              </p>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-foreground">
                Name the outlier
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                One expression drifting alone is either a legacy to retire or an
                intentional fork worth naming as its own reference.
              </p>
            </div>
            <div>
              <div className="font-mono text-sm font-bold text-foreground">
                Watch the centroid
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                The org expression&apos;s centroid over time tells you whether
                the house style is holding or quietly sliding.
              </p>
            </div>
          </div>
        </div>
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Run{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            ghost-drift compare *.expression.md
          </code>{" "}
          for the full matrix plus a 3D PCA projection you can render in
          Three.js. This is the view that replaces &ldquo;which repo
          drifted?&rdquo; with &ldquo;here&apos;s where the fleet clusters and
          where it spreads this quarter.&rdquo;
        </p>
      </Step>

      {/* ── Close the loop: Generation ──────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Closing the loop · Generation</StepLabel>
        <StepTitle>Feed the expression forward</StepTitle>
        <StepLead>
          An expression isn&apos;t only a measurement; it&apos;s a grounding
          artifact. Pipe it into whatever generator you already use — your host
          agent, Cursor, v0, an in-house tool — and use the review recipe as the
          gate on its output. Drift you can see is drift you can steer.
        </StepLead>
        <div className="reveal grid sm:grid-cols-4 gap-4">
          {[
            {
              step: "ghost-expression emit context-bundle",
              name: "Ground",
              desc: "Write SKILL.md + tokens.css + prompt.md from expression.md. Whatever the generator consumes.",
            },
            {
              step: "generate (recipe)",
              name: "Produce",
              desc: "Your host agent, Cursor, v0, or in-house tool. The bundle rides in context.",
            },
            {
              step: "review (recipe)",
              name: "Gate",
              desc: "Hardcoded colors, off-scale spacing, off-brand type — flagged line-by-line by the agent.",
            },
            {
              step: "verify (recipe)",
              name: "Audit",
              desc: "Loop over a prompt suite. Per-dimension drift tells you where the expression leaks.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="group rounded-[var(--radius-card-sm)] border border-border-card hover:border-foreground/25 bg-card p-5 transition-colors duration-300"
            >
              <code className="font-mono text-xs uppercase text-muted-foreground">
                {s.step}
              </code>
              <div className="relative inline-block font-display text-base font-semibold mt-2">
                <span className="relative z-10 transition-colors duration-300 group-hover:text-background">
                  {s.name}
                </span>
                <span className="absolute inset-0 bg-foreground origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
        <p className="reveal mt-8 text-sm text-muted-foreground max-w-[52ch] leading-relaxed">
          Only{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
            emit context-bundle
          </code>{" "}
          is a CLI verb. <em>Generate</em>, <em>review</em>, and <em>verify</em>{" "}
          are skill recipes: instructions your host agent follows, calling the
          CLI when it needs a reproducible answer. <em>Verify</em> is the
          schema-discipline mechanism: each dimension gets classified as{" "}
          <em>tight</em>, <em>leaky</em>, or <em>uncaptured</em> — a map of
          where the expression needs sharpening.
        </p>
      </Step>

      {/* ── Closing files ────────────────────────────────────────────── */}
      <Step className="border-t border-border/40">
        <StepLabel>Artifacts</StepLabel>
        <StepTitle>What Ghost leaves behind</StepTitle>
        <StepLead>
          Six moves, five files. Everything Ghost knows is checked into your
          repo; nothing lives in a service you have to log into.
        </StepLead>
        <div className="reveal grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            {
              file: "map.md",
              desc: "Where the design system lives — folders, registry, surface.",
            },
            {
              file: "expression.md",
              desc: "What the system looks like, in three layers.",
            },
            {
              file: ".ghost-sync.json",
              desc: "How you intend to diverge, per dimension.",
            },
            {
              file: ".ghost/history.jsonl",
              desc: "How the system evolved, scan by scan.",
            },
            {
              file: "ghost.config.ts",
              desc: "Parent reference for compare (optional).",
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
      </Step>

      <div className="h-24" />
    </>
  );
}
