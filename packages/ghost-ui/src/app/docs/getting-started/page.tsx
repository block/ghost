"use client";

import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { DocProse } from "@/components/docs/doc-prose";
import { DocSection, DocsPageLayout } from "@/components/docs/docs-page-layout";

export default function GettingStartedPage() {
  return (
    <DocsPageLayout>
      <AnimatedPageHeader
        kicker="Docs"
        title="Getting Started"
        description="Profile a design system, emit an expression, and gate generated UI against it — in under five minutes."
      />

      <DocProse>
        <DocSection title="Installation">
          <p>Add the core library and CLI to your project:</p>
          <pre>
            <code>pnpm add -D @ghost/core @ghost/cli</code>
          </pre>
          <p>
            Or install globally to use <code>ghost</code> from anywhere:
          </p>
          <pre>
            <code>pnpm add -g @ghost/cli</code>
          </pre>
          <p>
            AI-powered commands (<code>profile --ai</code>, <code>comply</code>,{" "}
            <code>discover</code>, <code>generate</code>, <code>verify</code>)
            need <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code>{" "}
            in your environment. Ghost auto-loads <code>.env</code> and{" "}
            <code>.env.local</code> from the working directory.
          </p>
        </DocSection>

        <DocSection title="Profile Your First System">
          <p>
            Ghost is zero-config for profiling. Point it at any target — a
            directory, GitHub repo, npm package, URL, or shadcn registry — and
            it produces an <code>expression.md</code>: the canonical fingerprint
            artifact.
          </p>
          <pre>
            <code>
              {`# The current directory — writes ./expression.md
ghost profile . --emit

# A GitHub repo with AI enrichment
ghost profile github:shadcn-ui/ui --ai --output shadcn.expression.md

# A shadcn registry directly
ghost profile --registry https://ui.shadcn.com/registry.json`}
            </code>
          </pre>
          <p>
            An <strong>expression</strong> is a Markdown file with YAML
            frontmatter (the machine layer: 49-dim vector, palette, spacing,
            typography, surfaces) plus a prose body in three layers: Character,
            Signature / Observation, Decisions, Values. Humans can read it. LLMs
            can consume it. Deterministic tools can diff it.
          </p>
        </DocSection>

        <DocSection title="Compare Two Systems">
          <p>
            Once you have two expressions, compare them to see exactly where
            they diverge:
          </p>
          <pre>
            <code>
              ghost compare parent.expression.md consumer.expression.md
            </code>
          </pre>
          <p>
            <code>compare</code> weights palette, spacing, typography, surfaces,
            and embedded decisions, and returns a scalar distance plus
            per-dimension deltas. Add <code>--temporal</code> for velocity and
            trajectory (requires <code>.ghost/history.jsonl</code>).
          </p>
        </DocSection>

        <DocSection title="Check Compliance Against a Parent">
          <p>
            <code>comply</code> profiles a target, compares to a parent
            expression, and exits non-zero if drift exceeds a threshold. Drop-in
            for CI:
          </p>
          <pre>
            <code>
              {`ghost comply . --against parent.expression.md
ghost comply . --against parent.expression.md --format sarif`}
            </code>
          </pre>
          <p>
            SARIF output plugs into GitHub code scanning and most CI platforms.
          </p>
        </DocSection>

        <DocSection title="Review UI Against an Expression">
          <p>
            <code>ghost review</code> checks files for visual language drift —
            hardcoded colors outside the palette, spacing values off the scale,
            typography choices that violate the expression's decisions.
            Zero-config: it reads <code>./expression.md</code> in the current
            directory and only flags changed lines by default.
          </p>
          <pre>
            <code>
              {`# Review uncommitted changes
ghost review

# Review staged changes only, emit GitHub PR comments
ghost review --staged --format github

# Check specific files against a different expression
ghost review src/app/page.tsx -f design.expression.md`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="The Generation Loop">
          <p>
            Ghost doubles as pipeline infrastructure for AI-generated UI. Three
            commands wire it together:
          </p>
          <ol>
            <li>
              <code>ghost context</code> — emit a grounding bundle from an
              expression (skill, prompt, or full bundle) that any generator can
              consume
            </li>
            <li>
              Run any generator (<code>ghost generate</code>, Cursor, v0, or
              in-house) with the bundle in context
            </li>
            <li>
              <code>ghost review</code> gates the output.{" "}
              <code>ghost verify</code> runs the whole loop across a standard
              prompt suite and aggregates per-dimension drift.
            </li>
          </ol>
          <pre>
            <code>
              {`# Emit a Claude Code skill bundle from an expression
ghost context expression.md --format skill --out skills/my-design

# Reference generator with self-review
ghost generate "pricing page with three tiers" --out pricing.html

# Verify the expression against the standard prompt suite
ghost verify`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Advanced: Config-Driven Scanning">
          <p>
            For long-lived projects, <code>scan</code> and <code>diff</code>{" "}
            read a <code>ghost.config.ts</code> that describes your parent
            registry, scan modes, and rule severity:
          </p>
          <pre>
            <code>
              {`import { defineConfig } from "@ghost/core";

export default defineConfig({
  parent: { type: "github", value: "shadcn-ui/ui" },
  targets: [{ type: "path", value: "./packages/my-ui" }],

  scan: {
    values: true,      // detect token overrides & hardcoded colors
    structure: true,   // diff component files against registry
    visual: false,     // pixel-level comparison (Playwright)
    analysis: false,   // LLM-aided interpretation
  },
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },

  // Optional: LLM and embedding providers
  llm: { provider: "anthropic" },
  // embedding: { provider: "openai" },
});`}
            </code>
          </pre>
          <p>
            With a config in place, <code>ghost scan</code> runs all enabled
            scanners and prints a report. Pass <code>--format json</code> for
            machine-readable output.
          </p>

          <hr />

          <p>
            Next:{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the three-layer fingerprint model and the generation-loop
            architecture. Or jump to the{" "}
            <Link to="/tools/drift/cli" className="font-semibold">
              CLI Reference
            </Link>{" "}
            for every command and flag.
          </p>
        </DocSection>
      </DocProse>
    </DocsPageLayout>
  );
}
