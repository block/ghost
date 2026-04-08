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
        description="Install Ghost, create a config, and run your first drift scan."
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
        </DocSection>

        <DocSection title="Create a Config">
          <p>
            Create a <code>ghost.config.ts</code> file in your project root.
            This tells Ghost where your design system lives and what to scan:
          </p>
          <pre>
            <code>
              {`import { defineConfig } from "@ghost/core";

export default defineConfig({
  designSystems: [
    {
      name: "my-ds",
      registry: "https://ui.example.com/registry.json",
      componentDir: "src/components/ui",
      styleEntry: "src/styles/globals.css",
    },
  ],
  scan: {
    values: true,      // detect token overrides & hardcoded colors
    structure: true,   // diff component files against registry
    visual: false,     // pixel-level comparison (requires Playwright)
    analysis: false,   // LLM-aided interpretation
  },
  rules: {
    "hardcoded-color": "error",
    "token-override": "warn",
    "missing-token": "warn",
    "structural-divergence": "error",
    "missing-component": "warn",
  },
});`}
            </code>
          </pre>
        </DocSection>

        <DocSection title="Configuration Reference">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th>Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>designSystems</code>
                </td>
                <td>array</td>
                <td>
                  One or more design systems to scan. Each needs a name,
                  registry URL or path, component directory, and style entry
                  point.
                </td>
              </tr>
              <tr>
                <td>
                  <code>parent</code>
                </td>
                <td>object</td>
                <td>
                  Parent baseline source. Type can be{" "}
                  <code>&quot;default&quot;</code>, <code>&quot;url&quot;</code>
                  , <code>&quot;path&quot;</code>, or{" "}
                  <code>&quot;package&quot;</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>scan</code>
                </td>
                <td>object</td>
                <td>
                  Toggle scan modes: <code>values</code>, <code>structure</code>
                  , <code>visual</code>, <code>analysis</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>rules</code>
                </td>
                <td>object</td>
                <td>
                  Set severity per rule: <code>&quot;error&quot;</code>,{" "}
                  <code>&quot;warn&quot;</code>, or <code>&quot;off&quot;</code>
                  .
                </td>
              </tr>
              <tr>
                <td>
                  <code>ignore</code>
                </td>
                <td>string[]</td>
                <td>Glob patterns for files to skip during scans.</td>
              </tr>
              <tr>
                <td>
                  <code>visual</code>
                </td>
                <td>object</td>
                <td>
                  Visual scan settings: <code>threshold</code>,{" "}
                  <code>viewport</code>, <code>timeout</code>,{" "}
                  <code>outputDir</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>llm</code>
                </td>
                <td>object</td>
                <td>
                  LLM provider config for analysis: <code>provider</code> (
                  <code>&quot;anthropic&quot;</code> |{" "}
                  <code>&quot;openai&quot;</code>), <code>model</code>,{" "}
                  <code>apiKey</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>embedding</code>
                </td>
                <td>object</td>
                <td>
                  Embedding provider for semantic fingerprints:{" "}
                  <code>provider</code>, <code>model</code>, <code>apiKey</code>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </DocSection>

        <DocSection title="Run Your First Scan">
          <p>
            With your config in place, run a drift scan to see how your local
            components compare to the registry:
          </p>
          <pre>
            <code>ghost scan</code>
          </pre>
          <p>
            Ghost will check your values and structure against the parent
            registry and print a report. Pass <code>--format json</code> for
            machine-readable output.
          </p>
        </DocSection>

        <DocSection title="Generate a Fingerprint">
          <p>
            A fingerprint is a 64-dimensional vector that captures your design
            system's identity — palette, spacing, typography, surfaces, and
            architecture:
          </p>
          <pre>
            <code>ghost profile</code>
          </pre>
          <p>
            This writes a fingerprint to stdout. Add <code>--emit</code> to save
            a <code>.ghost-fingerprint.json</code> file for later comparison.
          </p>
        </DocSection>

        <DocSection title="Compare Two Systems">
          <p>
            Once you have two fingerprint files, compare them to see exactly
            where they diverge:
          </p>
          <pre>
            <code>ghost compare parent.json consumer.json</code>
          </pre>

          <hr />

          <p>
            Next:{" "}
            <Link to="/tools/drift/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            to understand fingerprints, drift, and evolution in depth. Or jump
            to the{" "}
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
