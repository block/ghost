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
            <code>scan</code> and <code>diff</code> still read a{" "}
            <code>ghost.config.ts</code>; everything else is zero-config and
            defaults to <code>./expression.md</code> in the current directory.
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
                flag: "--emit-legacy",
                description:
                  "Write legacy .ghost-fingerprint.json instead (deprecated escape hatch)",
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

          <CommandSection
            name="scan"
            description="Scan for design drift driven by a ghost.config.ts. Runs the configured scanners (values, structure, visual) against the parent registry."
            usage="ghost scan [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
              { flag: "--no-color", description: "Disable colored output" },
            ]}
            example={`# Scan with default config
ghost scan

# JSON output for CI
ghost scan --format json`}
          />

          <CommandSection
            name="diff"
            description="Compare local component implementations against the parent registry, showing line-level changes and drift classification."
            usage="ghost diff [component] [options]"
            flags={[
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Diff all components
ghost diff

# Diff a specific component
ghost diff button`}
          />
        </DocSection>

        <DocSection title="Comparison & Compliance">
          <CommandSection
            name="compare"
            description="Compare two expressions with weighted distance across palette, spacing, typography, surfaces, and embedded decisions. Optionally include temporal analysis (velocity, trajectory, ack status)."
            usage="ghost compare <source> <target> [options]"
            flags={[
              {
                flag: "--temporal",
                description:
                  "Include temporal data: velocity, trajectory, ack status",
              },
              {
                flag: "--history-dir",
                description:
                  "Directory containing .ghost/history.jsonl (default: cwd)",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Compare two expressions
ghost compare parent.expression.md consumer.expression.md

# With temporal drift analysis
ghost compare parent.expression.md consumer.expression.md --temporal

# Legacy JSON fingerprints still work
ghost compare parent.json consumer.json`}
          />

          <CommandSection
            name="comply"
            description="Check a target's compliance against a parent expression and threshold. Profiles the target, compares, and exits non-zero if drift exceeds --max-drift. Emits CLI, JSON, or SARIF for CI."
            usage="ghost comply [target] [options]"
            flags={[
              {
                flag: "--against <path>",
                description:
                  "Path to parent expression.md or JSON to check drift against",
              },
              {
                flag: "--max-drift <n>",
                description: "Maximum overall drift distance (default: 0.3)",
              },
              {
                flag: "-c, --config <path>",
                description: "Path to ghost config file",
              },
              {
                flag: "--format",
                description: 'Output format: "cli", "json", or "sarif"',
              },
              {
                flag: "-v, --verbose",
                description: "Show agent reasoning",
              },
            ]}
            example={`# Check current directory against a parent
ghost comply . --against parent.expression.md

# Emit SARIF for GitHub code scanning
ghost comply . --against parent.expression.md --format sarif`}
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

          <CommandSection
            name="fleet"
            description="Compare multiple expressions for ecosystem-wide observability. Computes pairwise distances, centroid, and optional k-means clustering."
            usage="ghost fleet <fp1> <fp2> [fp3...] [options]"
            flags={[
              {
                flag: "--cluster",
                description: "Enable k-means clustering analysis",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Compare three design systems
ghost fleet ds-a.expression.md ds-b.expression.md ds-c.expression.md

# With clustering
ghost fleet *.expression.md --cluster`}
          />
        </DocSection>

        <DocSection title="Generation Loop">
          <p>
            Ghost sits as pipeline infrastructure for AI-driven UI generation.{" "}
            <code>context</code> emits a grounding bundle, any generator
            produces, <code>review</code> gates the output, and{" "}
            <code>verify</code> runs the whole loop over a standard prompt suite
            to aggregate drift. See{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the shape of the loop.
          </p>

          <CommandSection
            name="context"
            description="Emit a grounding skill bundle from an expression — for Claude Code, MCP clients, v0, Cursor, or any in-house generator."
            usage="ghost context [expression] [options]"
            flags={[
              {
                flag: "-o, --out <dir>",
                description: "Output directory (default: ./ghost-context)",
              },
              {
                flag: "--format <fmt>",
                description:
                  'Output format: "skill" (default), "prompt", or "bundle"',
              },
              {
                flag: "--name <name>",
                description:
                  "Override the skill name (default: fingerprint id)",
              },
            ]}
            example={`# Emit a Claude Code skill bundle
ghost context expression.md

# Emit a single prompt.md for plain-text LLM context
ghost context expression.md --format prompt

# Full Arcade-style bundle: SKILL.md + expression.md + tokens.css + README
ghost context expression.md --format bundle --out dist/context`}
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
            description="Review files for visual language drift against an expression. Zero-config: reads ./expression.md by default. Used both as a CI gate and as the self-review step inside ghost generate."
            usage="ghost review [files] [options]"
            flags={[
              {
                flag: "-f, --fingerprint <path>",
                description:
                  "Path to expression or fingerprint (default: ./expression.md)",
              },
              {
                flag: "--staged",
                description: "Review staged changes only",
              },
              {
                flag: "-b, --base <ref>",
                description: "Base ref for git diff (default: HEAD)",
              },
              {
                flag: "--dimensions <list>",
                description:
                  "Comma-separated: palette, spacing, typography, surfaces",
              },
              {
                flag: "--all",
                description:
                  "Report issues on all lines, not just changed lines",
              },
              {
                flag: "--format <fmt>",
                description: 'Output format: "cli" (default), "json", "github"',
              },
            ]}
            example={`# Review uncommitted changes in the current repo
ghost review

# Review specific files against a different expression
ghost review src/components/hero.tsx -f design.expression.md

# Emit GitHub PR review comments for the Action
ghost review --staged --format github`}
          />

          <CommandSection
            name="verify"
            description="Run the generate → review loop across a versioned prompt suite and aggregate per-dimension drift. Classifies each dimension as tight, leaky, or uncaptured — the schema-discipline mechanism for expressions."
            usage="ghost verify [expression] [options]"
            flags={[
              {
                flag: "--suite <path>",
                description:
                  "Path to a prompt suite JSON (default: bundled v0.1)",
              },
              {
                flag: "-n, --n <count>",
                description: "Subsample first N prompts (default: run all)",
              },
              {
                flag: "--concurrency <n>",
                description: "Max in-flight generate+review calls (default: 3)",
              },
              {
                flag: "--retries <n>",
                description: "Self-review retries per prompt (default: 1)",
              },
              {
                flag: "-o, --out <file>",
                description: "Write JSON report to file",
              },
              {
                flag: "--json",
                description: "Emit JSON report to stdout",
              },
              {
                flag: "--verbose",
                description: "Show per-prompt results",
              },
            ]}
            example={`# Run the full bundled suite against ./expression.md
ghost verify

# Quick sample of 5 prompts
ghost verify -n 5

# Save a full JSON report
ghost verify --out verify-report.json`}
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
