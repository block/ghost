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
            All commands read <code>ghost.config.ts</code> from the current
            directory by default. Override with{" "}
            <code>--config path/to/config</code>.
          </p>
        </DocSection>

        <DocSection title="Scanning & Profiling">
          <CommandSection
            name="scan"
            description="Detect design drift by comparing your local components and tokens against the parent registry."
            usage="ghost scan [options]"
            flags={[
              {
                flag: "--config, -c",
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
            name="profile"
            description="Generate a 64-dimensional fingerprint from your design system. Extracts palette, spacing, typography, surfaces, and architecture dimensions."
            usage="ghost profile [options]"
            flags={[
              {
                flag: "--config, -c",
                description: "Path to ghost config file",
              },
              {
                flag: "--registry, -r",
                description:
                  "Path or URL to a registry.json (overrides config)",
              },
              {
                flag: "--output, -o",
                description: "Write fingerprint to a file path",
              },
              {
                flag: "--emit",
                description: "Write .ghost-fingerprint.json to project root",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Profile from config
ghost profile

# Profile a remote registry directly
ghost profile -r https://ui.example.com/registry.json

# Save for later comparison
ghost profile --emit`}
          />

          <CommandSection
            name="diff"
            description="Compare local component implementations against the parent registry, showing line-level changes and drift classification."
            usage="ghost diff [component] [options]"
            flags={[
              {
                flag: "--config, -c",
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

        <DocSection title="Comparison">
          <CommandSection
            name="compare"
            description="Compare two fingerprint files with weighted distance calculation across all dimensions. Optionally includes temporal analysis showing drift velocity and trajectory."
            usage="ghost compare <source> <target> [options]"
            flags={[
              {
                flag: "--temporal",
                description: "Include temporal analysis (velocity, trajectory)",
              },
              {
                flag: "--history-dir",
                description: "Path to .ghost/ history directory",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Basic comparison
ghost compare parent.json consumer.json

# With temporal drift analysis
ghost compare parent.json consumer.json --temporal`}
          />

          <CommandSection
            name="fleet"
            description="Compare multiple fingerprints for ecosystem-wide observability. Computes pairwise distances, centroid, and optional clustering."
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
ghost fleet ds-a.json ds-b.json ds-c.json

# With clustering
ghost fleet ds-a.json ds-b.json ds-c.json ds-d.json --cluster`}
          />
        </DocSection>

        <DocSection title="Evolution & Intent">
          <CommandSection
            name="ack"
            description="Acknowledge current drift by recording your intentional stance — aligned (tracking parent), accepted (known divergence), or diverging (intentional split). Updates .ghost-sync.json."
            usage="ghost ack [options]"
            flags={[
              {
                flag: "--config, -c",
                description: "Path to ghost config file",
              },
              {
                flag: "--dimension, -d",
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
            description="Shift the parent baseline to a new fingerprint. Use this when the parent design system has been updated and you want to re-anchor your drift measurements."
            usage="ghost adopt <source> [options]"
            flags={[
              {
                flag: "--config, -c",
                description: "Path to ghost config file",
              },
              {
                flag: "--dimension, -d",
                description: "Only adopt a specific dimension",
              },
              {
                flag: "--format",
                description: 'Output format: "cli" (default) or "json"',
              },
            ]}
            example={`# Adopt a new parent fingerprint
ghost adopt new-parent.json`}
          />

          <CommandSection
            name="diverge"
            description="Mark a specific dimension as intentionally diverging. A shorthand for ack --stance diverging that also records a reason."
            usage="ghost diverge <dimension> [options]"
            flags={[
              {
                flag: "--config, -c",
                description: "Path to ghost config file",
              },
              {
                flag: "--reason, -r",
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
            description="Launch an interactive 3D visualization of fingerprint embeddings using Three.js. Projects the 64-dimensional vectors into 3D space via PCA."
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
            example={`# Visualize two fingerprints
ghost viz parent.json consumer.json

# Visualize a fleet on a custom port
ghost viz *.json --port 8080`}
          />

          <hr />

          <p>
            See{" "}
            <Link to="/docs/concepts" className="font-semibold">
              Core Concepts
            </Link>{" "}
            for the ideas behind these commands, or{" "}
            <Link to="/docs/getting-started" className="font-semibold">
              Getting Started
            </Link>{" "}
            for a guided walkthrough.
          </p>
        </DocSection>
      </DocProse>
    </DocsPageLayout>
  );
}
