"use client";

import gsap from "gsap";
import {
  Check as CheckIcon,
  Copy as CopyIcon,
  Download as DownloadIcon,
  ArrowLeft as NavigationBackIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockCopyButton,
  CodeBlockHeader,
} from "@/components/ai-elements/code-block";
import { DemoLoader } from "@/components/docs/demo-loader";
import { ComponentErrorBoundary } from "@/components/docs/error-boundary";
import { SectionWrapper } from "@/components/docs/wrappers";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { ComponentEntry } from "@/lib/component-registry";
import type { ComponentSpec } from "@/lib/component-source";
import { cn } from "@/lib/utils";

// ── Spec Row ──

function SpecRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-4 py-2.5 border-b border-border/50 last:border-b-0 items-baseline">
      <span
        className="text-muted-foreground shrink-0 font-display uppercase"
        style={{
          fontSize: "var(--label-font-size)",
          letterSpacing: "var(--label-letter-spacing)",
          fontWeight: "var(--label-font-weight)",
        }}
      >
        {label}
      </span>
      <div className={cn("text-sm", mono && "font-mono text-[13px]")}>
        {children}
      </div>
    </div>
  );
}

// ── Variant Table ──

function VariantTable({ variants }: { variants: ComponentSpec["variants"] }) {
  if (variants.length === 0) return null;

  return (
    <div className="space-y-3">
      {variants.map((v) => (
        <div key={v.name}>
          <div className="flex items-center gap-2 mb-1.5">
            <code className="text-[13px] font-mono font-medium">{v.name}</code>
            {v.defaultValue && (
              <span className="text-[11px] text-muted-foreground">
                default: <code className="font-mono">{v.defaultValue}</code>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {v.values.map((val) => (
              <span
                key={val}
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs",
                  val === v.defaultValue
                    ? "border-foreground/20 bg-foreground/5 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                {val}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Shell ──

export function ComponentPageShell({
  component,
  categoryName,
  demoSource,
  spec,
  prev,
  next,
}: {
  component: ComponentEntry;
  categoryName: string;
  demoSource: string | null;
  spec: ComponentSpec | null;
  prev: { slug: string; name: string } | null;
  next: { slug: string; name: string } | null;
}) {
  const [activeTab, setActiveTab] = useState<"preview" | "source" | "demo">(
    "preview",
  );
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      const header = shellRef.current?.querySelector(".shell-header");
      const content = shellRef.current?.querySelector(".shell-content");
      if (header) {
        gsap.set(header, { y: 24, opacity: 0 });
        tl.to(header, { y: 0, opacity: 1, duration: 0.6 });
      }
      if (content) {
        gsap.set(content, { y: 16, opacity: 0 });
        tl.to(content, { y: 0, opacity: 1, duration: 0.5 }, "-=0.25");
      }
    }, shellRef);
    return () => ctx.revert();
  }, [component.slug]);

  const installCommand = `npx shadcn@latest add ${component.slug}`;

  // Filter exports to only component names (capitalized), exclude variant exports
  const componentExports =
    spec?.exports.filter(
      (e) => /^[A-Z]/.test(e) && !e.toLowerCase().includes("variant"),
    ) ?? [];

  return (
    <SectionWrapper>
      <div ref={shellRef}>
        {/* ── Header ── */}
        <div className="shell-header pt-6 pb-4 sm:pt-8 sm:pb-6">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/components"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <NavigationBackIcon className="size-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span
                className="font-display uppercase text-muted-foreground"
                style={{
                  fontSize: "var(--label-font-size)",
                  letterSpacing: "var(--label-letter-spacing)",
                  fontWeight: "var(--label-font-weight)",
                }}
              >
                {categoryName}
              </span>
              {component.isAI && (
                <span className="inline-flex items-center rounded-full bg-foreground text-background px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                  AI
                </span>
              )}
            </div>
          </div>

          <h1
            className="font-display font-black tracking-[-0.04em] leading-[0.9]"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            {component.name}
          </h1>
        </div>

        <div className="shell-content space-y-6">
          {/* ── Install ── */}
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
            <DownloadIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <code className="flex-1 text-[13px] font-mono truncate text-muted-foreground">
              {installCommand}
            </code>
            <Button
              appearance="icon"
              variant="ghost"
              size="icon-xs"
              className="relative shrink-0 cursor-pointer"
              onClick={() => copyToClipboard(installCommand)}
            >
              <CopyIcon
                className={cn(
                  "absolute size-3.5 transition duration-200",
                  isCopied ? "scale-0" : "scale-100",
                )}
              />
              <CheckIcon
                className={cn(
                  "absolute size-3.5 transition duration-200",
                  !isCopied ? "scale-0" : "scale-100",
                )}
              />
            </Button>
          </div>

          {/* ── Tabs: Preview / Source / Demo Code ── */}
          <div>
            <div className="flex items-center gap-1 border-b mb-0">
              {(
                [
                  ["preview", "Preview"],
                  ...(spec?.source ? [["source", "Source"]] : []),
                  ...(demoSource ? [["demo", "Demo"]] : []),
                ] as [string, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as typeof activeTab)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors relative cursor-pointer",
                    activeTab === key
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  {activeTab === key && (
                    <span className="absolute bottom-0 left-0 right-0 h-px bg-foreground" />
                  )}
                </button>
              ))}
            </div>

            <div className="pt-6">
              {activeTab === "preview" && (
                <ComponentErrorBoundary name={component.slug}>
                  <DemoLoader name={component.slug} />
                </ComponentErrorBoundary>
              )}

              {activeTab === "source" && spec?.source && (
                <div className="rounded-lg border overflow-hidden">
                  <CodeBlock code={spec.source} language="tsx" showLineNumbers>
                    <CodeBlockHeader>
                      <span className="text-xs font-mono text-muted-foreground">
                        {spec.filePath}
                      </span>
                      <CodeBlockActions>
                        <CodeBlockCopyButton />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                  </CodeBlock>
                </div>
              )}

              {activeTab === "demo" && demoSource && (
                <div className="rounded-lg border overflow-hidden">
                  <CodeBlock code={demoSource} language="tsx" showLineNumbers>
                    <CodeBlockHeader>
                      <span className="text-xs font-mono text-muted-foreground">
                        {component.slug}-demo.tsx
                      </span>
                      <CodeBlockActions>
                        <CodeBlockCopyButton />
                      </CodeBlockActions>
                    </CodeBlockHeader>
                  </CodeBlock>
                </div>
              )}
            </div>
          </div>

          {/* ── Spec Sheet ── */}
          <div className="border rounded-lg divide-y divide-border/50">
            <div className="px-4 py-3">
              <h2
                className="font-display uppercase text-muted-foreground"
                style={{
                  fontSize: "var(--label-font-size)",
                  letterSpacing: "var(--label-letter-spacing)",
                  fontWeight: "var(--label-font-weight)",
                }}
              >
                Specification
              </h2>
            </div>

            <div className="px-4 py-1">
              {/* Variants */}
              {spec && spec.variants.length > 0 && (
                <SpecRow label="Variants">
                  <VariantTable variants={spec.variants} />
                </SpecRow>
              )}

              {/* Sub-components */}
              {componentExports.length > 1 && (
                <SpecRow label="Exports" mono>
                  <div className="flex flex-wrap gap-1.5">
                    {componentExports.map((exp) => (
                      <span
                        key={exp}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
                      >
                        {exp}
                      </span>
                    ))}
                  </div>
                </SpecRow>
              )}

              {/* Data slots */}
              {spec && spec.dataSlots.length > 0 && (
                <SpecRow label="Data Slots" mono>
                  <div className="flex flex-wrap gap-1.5">
                    {spec.dataSlots.map((slot) => (
                      <span
                        key={slot}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs"
                      >
                        [data-slot=&quot;{slot}&quot;]
                      </span>
                    ))}
                  </div>
                </SpecRow>
              )}

              {/* Registry dependencies */}
              {component.registryDependencies.length > 0 && (
                <SpecRow label="Built With">
                  <div className="flex flex-wrap gap-1.5">
                    {component.registryDependencies.map((dep) => (
                      <Link
                        key={dep}
                        to={`/components/${dep}`}
                        className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {dep}
                      </Link>
                    ))}
                  </div>
                </SpecRow>
              )}

              {/* npm Dependencies */}
              {component.dependencies.length > 0 && (
                <SpecRow label="Packages" mono>
                  <div className="flex flex-wrap gap-1.5">
                    {component.dependencies.map((dep) => (
                      <span
                        key={dep}
                        className="inline-flex items-center rounded-md border bg-muted/30 px-2 py-0.5 text-xs"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </SpecRow>
              )}

              {/* File path */}
              {spec?.filePath && (
                <SpecRow label="File" mono>
                  <span className="text-muted-foreground">{spec.filePath}</span>
                </SpecRow>
              )}
            </div>
          </div>

          {/* ── Prev / Next ── */}
          <div className="flex items-center justify-between border-t pt-6 pb-16">
            {prev ? (
              <Link
                to={`/components/${prev.slug}`}
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <NavigationBackIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Previous
                  </span>
                  <span className="font-medium text-foreground">
                    {prev.name}
                  </span>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {next ? (
              <Link
                to={`/components/${next.slug}`}
                className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors text-right"
              >
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">Next</span>
                  <span className="font-medium text-foreground">
                    {next.name}
                  </span>
                </div>
                <NavigationBackIcon className="size-4 rotate-180 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
