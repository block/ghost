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
            AI-powered commands (<code>profile --ai</code>,{" "}
            <code>review project</code>, <code>verify</code>,{" "}
            <code>discover</code>, <code>generate</code>) need{" "}
            <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code> in
            your environment. Ghost auto-loads <code>.env</code> and{" "}
            <code>.env.local</code> from the working directory.
          </p>
        </DocSection>

        <DocSection title="Profile Your First System">
          <p>
            Ghost is zero-config for profiling. Point it at any target — a
            directory, GitHub repo, npm package, URL, or shadcn registry — and
            it produces an <code>expression.md</code>: the canonical design
            expression artifact.
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

        <DocSection title="Review Drift — One Verb, Three Scopes">
          <p>
            <code>ghost review</code> is the unified drift-detection verb. The
            first positional argument picks the scope; it defaults to{" "}
            <code>files</code>.
          </p>
          <ul>
            <li>
              <code>ghost review</code> (files scope, default) — checks files in
              a PR for visual language drift: hardcoded colors outside the
              palette, spacing off the scale, typography that violates
              decisions. Reads <code>./expression.md</code>; flags changed lines
              only by default.
            </li>
            <li>
              <code>ghost review project [target] --against parent.md</code> —
              target-level compliance. Profiles the target, compares to the
              parent, exits non-zero if drift exceeds <code>--max-drift</code>.
              Emits CLI, JSON, or SARIF for CI.
            </li>
            <li>
              <code>ghost verify [expression]</code> — drives the
              generate→review loop across a bundled prompt suite (~18 prompts)
              and classifies each dimension as <em>tight</em>, <em>leaky</em>,
              or <em>uncaptured</em>. The schema-discipline mechanism for
              expressions.
            </li>
          </ul>
          <pre>
            <code>
              {`# files — review uncommitted changes
ghost review
ghost review --staged --format github
ghost review src/app/page.tsx -f design.expression.md

# project — drop-in CI gate against a parent
ghost review project . --against parent.expression.md
ghost review project . --against parent.expression.md --format sarif

# suite — drive the loop across the bundled prompt suite
ghost verify
ghost verify -n 5
ghost verify --out suite-report.json`}
            </code>
          </pre>
          <p>
            SARIF output from <code>review project</code> plugs into GitHub code
            scanning and most CI platforms.
          </p>
        </DocSection>

        <DocSection title="The Generation Loop">
          <p>Ghost doubles as pipeline infrastructure for AI-generated UI:</p>
          <ol>
            <li>
              <code>ghost emit context-bundle</code> — emit a grounding bundle
              from an expression (SKILL.md + tokens.css + optional prompt.md)
              that any generator can consume
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
ghost emit context-bundle --out skills/my-design

# Reference generator with self-review
ghost generate "pricing page with three tiers" --out pricing.html

# Drive the suite against the standard prompt set
ghost verify`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Advanced: Config-Driven Component Diff">
          <p>
            For projects consuming a shadcn-style registry,{" "}
            <code>ghost drift</code> reads a <code>ghost.config.ts</code> that
            points at the parent registry and compares local component files
            against it:
          </p>
          <pre>
            <code>
              {`import { defineConfig } from "@ghost/core";

export default defineConfig({
  parent: { type: "github", value: "shadcn-ui/ui" },
  targets: [{ type: "path", value: "./packages/my-ui" }],

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
            With a config in place, <code>ghost drift</code> surfaces structural
            drift against the parent registry. Pass <code>--format json</code>{" "}
            for machine-readable output.
          </p>

          <hr />

          <p>
            Next:{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the three-layer expression model and the generation-loop
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
