"use client";

import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { DocProse } from "@/components/docs/doc-prose";
import { DocSection, DocsPageLayout } from "@/components/docs/docs-page-layout";

function CommandSection({
  name,
  description,
  usage,
  flags,
  example,
}: {
  name: string;
  description: string;
  usage: string;
  flags: { flag: string; description: string }[];
  example?: string;
}) {
  return (
    <>
      <h3>
        <code>ghost {name}</code>
      </h3>
      <p>{description}</p>
      <pre>
        <code>{usage}</code>
      </pre>
      {flags.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Flag</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f.flag}>
                <td>
                  <code>{f.flag}</code>
                </td>
                <td>{f.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {example && (
        <pre>
          <code>{example}</code>
        </pre>
      )}
    </>
  );
}

export default function CLIReferencePage() {
  return (
    <DocsPageLayout>
      <AnimatedPageHeader
        kicker="Docs"
        title="CLI Reference"
        description="Every Ghost command, its flags, and example usage."
      />

      <DocProse>
        <DocSection title="Overview">
          <p>
            Ghost's canonical artifact is <code>expression.md</code> — a
            Markdown file with YAML frontmatter (machine layer) and a
            three-layer prose body. Most commands accept a path to an{" "}
            <code>expression.md</code> or legacy{" "}
            <code>.ghost-fingerprint.json</code>; readers dispatch on extension.
          </p>
          <p>
            Commands are zero-config and default to <code>./expression.md</code>{" "}
            in the current directory. <code>compare --components</code> is the
            one exception — it still reads a <code>ghost.config.ts</code> for
            the registry target.
          </p>
        </DocSection>

        <DocSection title="Profiling">
          <CommandSection
            name="profile"
            description="Generate a design fingerprint from one or more targets — a directory, URL, npm package, GitHub repo, or shadcn registry. Produces a 49-dimensional vector plus a three-layer prose expression (Character, Signature, Decisions, Values)."
            usage="ghost profile [...targets] [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "-r, --registry <path>",
                description:
                  "Path or URL to a registry.json (profiles registry directly)",
              },
              {
                flag: "-o, --output <file>",
                description:
                  "Write fingerprint to a file (.md → expression, else JSON)",
              },
              {
                flag: "--emit",
                description:
                  "Write expression.md to project root (publishable artifact)",
              },
              {
                flag: "--ai",
                description:
                  "Enable AI-powered enrichment (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)",
              },
              {
                flag: "--max-iterations <n>",
                description: "Cap agent exploration iterations (default: 99)",
              },
              {
                flag: "-v, --verbose",
                description: "Show agent reasoning, confidence, and warnings",
              },
              {
                flag: "--format <fmt>",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Profile the current directory, save expression.md
ghost profile . --emit

# Profile a GitHub repo with AI enrichment
ghost profile github:shadcn-ui/ui --ai --verbose

# Profile multiple sources into a single fingerprint
ghost profile github:anthropics/claude-code https://claude.ai --output claude.expression.md

# Profile a remote shadcn registry directly
ghost profile -r https://ui.shadcn.com/registry.json`}
          />
        </DocSection>

        <DocSection title="Comparison">
          <CommandSection
            name="compare"
            description="Unified comparison verb. Mode is flag-dispatched: pairwise (N=2), fleet (N≥3 or --cluster), semantic diff (--semantic), temporal (--temporal), or local-components-vs-registry (--components)."
            usage="ghost compare [...fingerprints] [options]"
            flags={[
              {
                flag: "--temporal",
                description:
                  "Include temporal data: velocity, trajectory, ack status (N=2 only)",
              },
              {
                flag: "--history-dir <dir>",
                description:
                  "Directory containing .ghost/history.jsonl (default: cwd)",
              },
              {
                flag: "--semantic",
                description:
                  "Semantic diff of decisions/values/palette (N=2 only)",
              },
              {
                flag: "--cluster",
                description: "Include cluster analysis (N≥3)",
              },
              {
                flag: "--components",
                description:
                  "Compare local components against registry (reads ghost.config.ts; ignores fingerprint args)",
              },
              {
                flag: "--component <name>",
                description: "Limit --components to one component",
              },
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file (for --components)",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Pairwise (N=2)
ghost compare parent.expression.md consumer.expression.md

# With temporal drift analysis
ghost compare parent.expression.md consumer.expression.md --temporal

# Semantic diff (decisions / values / palette)
ghost compare a.expression.md b.expression.md --semantic

# Fleet (N≥3) with clustering
ghost compare *.expression.md --cluster

# Local components vs registry
ghost compare --components

# Single component diff
ghost compare --components --component button`}
          />

          <CommandSection
            name="discover"
            description="Find public design systems matching a query via AI-powered discovery. Useful for bootstrapping comparisons or browsing the ecosystem."
            usage="ghost discover [query] [options]"
            flags={[
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Find brutalist-leaning systems
ghost discover "brutalist editorial"

# List systems near a reference
ghost discover "similar to shadcn"`}
          />
        </DocSection>

        <DocSection title="Generation Loop">
          <p>
            Ghost sits as pipeline infrastructure for AI-driven UI generation.{" "}
            <code>ghost emit context-bundle</code> produces a grounding bundle,
            any generator (including <code>ghost generate</code>) produces,{" "}
            <code>ghost review</code> gates the output, and{" "}
            <code>ghost review suite</code> runs the whole loop over a standard
            prompt suite to aggregate drift. See{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the shape of the loop.
          </p>

          <CommandSection
            name="emit"
            description="Derive artifacts from expression.md. Kinds: review-command (a per-project drift-review slash command at .claude/commands/design-review.md) and context-bundle (SKILL.md + tokens.css + optional prompt.md for Claude Code, MCP, v0, Cursor, or any in-house generator)."
            usage="ghost emit <kind> [options]"
            flags={[
              {
                flag: "-e, --expression <path>",
                description:
                  "Source expression file (default: ./expression.md)",
              },
              {
                flag: "-o, --out <path>",
                description:
                  "Output path (review-command → .claude/commands/design-review.md; context-bundle → ./ghost-context/)",
              },
              {
                flag: "--stdout",
                description:
                  "Write to stdout instead of a file (review-command only)",
              },
              {
                flag: "--no-tokens",
                description: "Skip tokens.css output (context-bundle)",
              },
              {
                flag: "--readme",
                description: "Include README.md (context-bundle)",
              },
              {
                flag: "--prompt-only",
                description:
                  "Emit only prompt.md — skips SKILL.md / expression.md / tokens.css (context-bundle)",
              },
              {
                flag: "--name <name>",
                description:
                  "Override the skill name — default: fingerprint id (context-bundle)",
              },
            ]}
            example={`# Emit a per-project design-review slash command
ghost emit review-command

# Emit a Claude Code / MCP skill bundle
ghost emit context-bundle

# Single prompt.md for plain-text LLM context
ghost emit context-bundle --prompt-only

# Custom output directory
ghost emit context-bundle --out dist/context`}
          />

          <CommandSection
            name="generate"
            description="Reference generator. Loads an expression, builds a system prompt from Character/Signature/Decisions/Values + tokens, calls the LLM, and (by default) runs ghost review against its own output, injecting drift feedback and retrying."
            usage="ghost generate <prompt> [options]"
            flags={[
              {
                flag: "-e, --expression <path>",
                description: "Path to expression.md (default: ./expression.md)",
              },
              {
                flag: "-o, --out <file>",
                description: "Write artifact to file (default: stdout)",
              },
              {
                flag: "--format <fmt>",
                description: 'Output format: "html" (default)',
              },
              {
                flag: "--retries <n>",
                description:
                  "Max self-review retries after initial attempt (default: 2, cap 3)",
              },
              {
                flag: "--no-review",
                description: "Skip self-review gate (faster, drift-blind)",
              },
              {
                flag: "--json",
                description:
                  "Emit structured JSON {artifact, attempts, passed}",
              },
            ]}
            example={`# Generate a pricing page against the current expression
ghost generate "pricing page with three tiers" --out pricing.html

# Fast path: skip the self-review loop
ghost generate "hero section" --no-review --out hero.html

# Machine-readable: per-attempt drift counts
ghost generate "dashboard" --json`}
          />

          <CommandSection
            name="review"
            description="Unified drift detection with three scopes: files (default, code-level PR review), project (target-level compliance against a parent), suite (drive the generate→review loop across a prompt suite, classifying each dimension as tight, leaky, or uncaptured). First positional arg picks the scope; otherwise defaults to files."
            usage="ghost review [scope] [positional] [options]"
            flags={[
              // files
              {
                flag: "-f, --fingerprint <path>",
                description:
                  "[files] Path to expression or fingerprint (default: ./expression.md)",
              },
              {
                flag: "--staged",
                description: "[files] Review staged changes only",
              },
              {
                flag: "-b, --base <ref>",
                description: "[files] Base ref for git diff (default: HEAD)",
              },
              {
                flag: "--dimensions <list>",
                description:
                  "[files] Comma-separated: palette, spacing, typography, surfaces",
              },
              {
                flag: "--all",
                description:
                  "[files] Report issues on all lines, not just changed lines",
              },
              // project
              {
                flag: "--against <path>",
                description:
                  "[project] Parent expression path to check drift against",
              },
              {
                flag: "--max-drift <n>",
                description:
                  "[project] Maximum overall drift distance (default: 0.3)",
              },
              {
                flag: "-c, --config <path>",
                description: "[project] Path to ghost config file",
              },
              // suite
              {
                flag: "--suite <path>",
                description:
                  "[suite] Path to a prompt suite JSON (default: bundled v0.1)",
              },
              {
                flag: "-n, --n <count>",
                description:
                  "[suite] Subsample first N prompts (default: run all)",
              },
              {
                flag: "--concurrency <n>",
                description:
                  "[suite] Max in-flight generate+review calls (default: 3)",
              },
              {
                flag: "--retries <n>",
                description:
                  "[suite] Self-review retries per prompt (default: 1)",
              },
              {
                flag: "-o, --out <file>",
                description: "[suite] Write JSON report to file",
              },
              // shared
              {
                flag: "--format <fmt>",
                description:
                  'Output format: "cli" (default), "json", "github" (files only), "sarif" (project only)',
              },
              {
                flag: "-v, --verbose",
                description: "Verbose output",
              },
            ]}
            example={`# files scope (default) — review uncommitted changes
ghost review
ghost review --staged --format github
ghost review src/components/hero.tsx -f design.expression.md

# project scope — target-level compliance against a parent
ghost review project . --against parent.expression.md
ghost review project . --against parent.expression.md --format sarif

# suite scope — drive generate→review across a prompt suite
ghost review suite
ghost review suite -n 5
ghost review suite --out suite-report.json`}
          />
        </DocSection>

        <DocSection title="Evolution & Intent">
          <CommandSection
            name="ack"
            description="Acknowledge current drift by recording your intentional stance — aligned (tracking parent), accepted (known divergence), or diverging (intentional split). Updates .ghost-sync.json."
            usage="ghost ack [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "-d, --dimension",
                description:
                  "Specific dimension to acknowledge (e.g. palette, spacing)",
              },
              {
                flag: "--stance",
                description: '"aligned", "accepted", or "diverging"',
              },
              {
                flag: "--reason",
                description: "Explanation for this acknowledgment",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Acknowledge all dimensions as aligned
ghost ack --stance aligned --reason "Initial baseline"

# Mark typography as intentionally diverging
ghost ack -d typography --stance diverging --reason "Brand refresh requires different type scale"`}
          />

          <CommandSection
            name="adopt"
            description="Shift the parent baseline to a new expression. Use this when the parent design system has been updated and you want to re-anchor your drift measurements."
            usage="ghost adopt <source> [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "-d, --dimension",
                description: "Only adopt a specific dimension",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Adopt a new parent expression
ghost adopt new-parent.expression.md`}
          />

          <CommandSection
            name="diverge"
            description="Mark a specific dimension as intentionally diverging. Shorthand for ack --stance diverging that also records a reason."
            usage="ghost diverge <dimension> [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "-r, --reason",
                description: "Why this dimension is diverging",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`ghost diverge palette --reason "Dark-mode-first palette for this product"`}
          />
        </DocSection>

        <DocSection title="Visualization">
          <CommandSection
            name="viz"
            description="Launch an interactive 3D visualization of fingerprint embeddings using Three.js. Projects the 49-dimensional vectors into 3D space via PCA."
            usage="ghost viz <fp1> <fp2> [fp3...] [options]"
            flags={[
              {
                flag: "--port",
                description: "HTTP server port (default: 3333)",
              },
              {
                flag: "--no-open",
                description: "Don't auto-open the browser",
              },
            ]}
            example={`# Visualize two expressions
ghost viz parent.expression.md consumer.expression.md

# Visualize a fleet on a custom port
ghost viz *.expression.md --port 8080`}
          />

          <hr />

          <p>
            See{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the ideas behind these commands, or{" "}
            <Link to="/tools/drift/getting-started" className="font-semibold">
              Getting Started
            </Link>{" "}
            for a guided walkthrough.
          </p>
        </DocSection>
      </DocProse>
    </DocsPageLayout>
  );
}
