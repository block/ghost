"use client";

import { Link } from "react-router";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { DocProse } from "@/components/docs/doc-prose";
import { DocSection, DocsPageLayout } from "@/components/docs/docs-page-layout";

export default function ConceptsPage() {
  return (
    <DocsPageLayout>
      <AnimatedPageHeader
        kicker="Docs"
        title="Core Concepts"
        description="The ideas behind Ghost — fingerprints, drift detection, evolution tracking, and fleet observability."
      />

      <DocProse>
        <DocSection title="Design Fingerprints">
          <p>
            A fingerprint is a <strong>64-dimensional numeric vector</strong>{" "}
            that captures the identity of a design system. Ghost extracts this
            deterministically from a shadcn-compatible registry, or optionally
            via LLM interpretation of raw CSS and component files.
          </p>
          <p>The 64 dimensions are grouped into five categories:</p>
          <table>
            <thead>
              <tr>
                <th>Dimensions</th>
                <th>Category</th>
                <th>What it captures</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>0 &ndash; 20</td>
                <td>
                  <strong>Palette</strong>
                </td>
                <td>
                  Dominant colors (OKLCH), neutral ramp, semantic color
                  coverage, saturation profile, contrast level
                </td>
              </tr>
              <tr>
                <td>21 &ndash; 30</td>
                <td>
                  <strong>Spacing</strong>
                </td>
                <td>
                  Scale values, regularity score, base unit detection,
                  distribution pattern
                </td>
              </tr>
              <tr>
                <td>31 &ndash; 40</td>
                <td>
                  <strong>Typography</strong>
                </td>
                <td>
                  Font families, size ramp, weight distribution, line height
                  pattern
                </td>
              </tr>
              <tr>
                <td>41 &ndash; 48</td>
                <td>
                  <strong>Surfaces</strong>
                </td>
                <td>Border radii, shadow complexity, border usage frequency</td>
              </tr>
              <tr>
                <td>49 &ndash; 63</td>
                <td>
                  <strong>Architecture</strong>
                </td>
                <td>
                  Tokenization ratio, methodology (BEM, CSS-in-JS, etc.),
                  component count, naming patterns
                </td>
              </tr>
            </tbody>
          </table>
          <p>
            Fingerprints are compared using a <strong>weighted distance</strong>{" "}
            metric: palette contributes 30%, spacing and typography 20% each,
            surfaces 15%, and architecture 15%. This weighting reflects how
            strongly each dimension affects the perceived identity of a design
            system.
          </p>
        </DocSection>

        <DocSection title="Drift Detection">
          <p>
            Drift is what happens when a consumer design system diverges from
            its parent. Ghost detects drift through three complementary scan
            modes:
          </p>

          <h3>Values Scan</h3>
          <p>
            Parses your CSS and compares design tokens against the parent
            registry. Detects three kinds of issues:
          </p>
          <ul>
            <li>
              <strong>Hardcoded colors</strong> &mdash; raw hex/rgb values that
              should be tokens
            </li>
            <li>
              <strong>Token overrides</strong> &mdash; tokens whose values
              differ from the parent
            </li>
            <li>
              <strong>Missing tokens</strong> &mdash; tokens the parent defines
              that you don&rsquo;t have
            </li>
          </ul>

          <h3>Structure Scan</h3>
          <p>
            Diffs component files between your implementation and the parent
            registry. Changes are classified as:
          </p>
          <ul>
            <li>
              <strong>Cosmetic</strong> &mdash; formatting, whitespace,
              non-functional
            </li>
            <li>
              <strong>Additive</strong> &mdash; new props, variants, or features
              added on top
            </li>
            <li>
              <strong>Breaking</strong> &mdash; removed or altered behaviour
              that diverges from the parent API
            </li>
          </ul>

          <h3>Visual Scan</h3>
          <p>
            Renders components using Playwright and performs pixel-level
            comparison with pixelmatch. This catches drift that token and
            structure scans miss — subtle rendering differences from CSS
            specificity, font rendering, or layout shifts. Requires Playwright
            to be installed.
          </p>
        </DocSection>

        <DocSection title="Evolution Tracking">
          <p>
            Not all drift is bad. Ghost distinguishes between{" "}
            <strong>accidental drift</strong> (bugs, oversight) and{" "}
            <strong>intentional divergence</strong> (brand requirements, product
            needs). The evolution system tracks this through{" "}
            <strong>stances</strong>:
          </p>
          <table>
            <thead>
              <tr>
                <th>Stance</th>
                <th>Symbol</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Aligned</strong>
                </td>
                <td>
                  <code>=</code>
                </td>
                <td>
                  Tracking the parent. Any drift in this dimension is
                  unintentional and should be fixed.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Accepted</strong>
                </td>
                <td>
                  <code>*</code>
                </td>
                <td>
                  Known divergence that has been reviewed and acknowledged. Not
                  ideal, but understood.
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Diverging</strong>
                </td>
                <td>
                  <code>~</code>
                </td>
                <td>
                  Intentionally different. This dimension is owned locally and
                  should not be measured against the parent.
                </td>
              </tr>
            </tbody>
          </table>

          <p>
            Stances are stored in <code>.ghost-sync.json</code> per dimension,
            with optional reasoning. Use{" "}
            <Link to="/docs/cli" className="font-semibold">
              <code>ghost ack</code>
            </Link>{" "}
            to record a stance and <code>ghost diverge</code> as a shorthand for
            marking intentional splits.
          </p>

          <h3>History &amp; Temporal Analysis</h3>
          <p>
            Every time you generate a fingerprint, Ghost appends an entry to{" "}
            <code>.ghost/history.jsonl</code> — an append-only log of your
            design system&rsquo;s evolution over time. When comparing
            fingerprints with <code>--temporal</code>, Ghost computes:
          </p>
          <ul>
            <li>
              <strong>Drift velocity</strong> &mdash; how fast each dimension is
              changing per time period
            </li>
            <li>
              <strong>Trajectory</strong> &mdash; whether the system is{" "}
              <em>converging</em> toward the parent, <em>diverging</em> away,{" "}
              <em>stable</em>, or <em>oscillating</em>
            </li>
            <li>
              <strong>Exceeded bounds</strong> &mdash; dimensions that have
              drifted beyond the tolerance threshold (default: 0.05)
            </li>
          </ul>
        </DocSection>

        <DocSection title="Fleet Observability">
          <p>
            When your organisation has multiple design systems (a core system
            plus product-specific forks), Ghost provides{" "}
            <strong>fleet-level analysis</strong>:
          </p>
          <ul>
            <li>
              <strong>Pairwise distances</strong> &mdash; how far apart every
              pair of systems is across all dimensions
            </li>
            <li>
              <strong>Centroid</strong> &mdash; the average position of all
              systems in the 64-dimensional space
            </li>
            <li>
              <strong>Clustering</strong> &mdash; k-means grouping to identify
              natural families of design systems
            </li>
            <li>
              <strong>3D visualization</strong> &mdash; <code>ghost viz</code>{" "}
              projects fingerprints into 3D via PCA for an interactive Three.js
              view
            </li>
          </ul>
        </DocSection>

        <DocSection title="Artifacts">
          <p>Ghost produces and consumes several file artifacts:</p>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>ghost.config.ts</code>
                </td>
                <td>
                  Project configuration — design systems, scan settings, rules
                </td>
              </tr>
              <tr>
                <td>
                  <code>.ghost-fingerprint.json</code>
                </td>
                <td>
                  Publishable fingerprint artifact (created with{" "}
                  <code>--emit</code>)
                </td>
              </tr>
              <tr>
                <td>
                  <code>.ghost-sync.json</code>
                </td>
                <td>
                  Per-dimension stances and reasoning for evolution tracking
                </td>
              </tr>
              <tr>
                <td>
                  <code>.ghost/history.jsonl</code>
                </td>
                <td>Append-only fingerprint history for temporal analysis</td>
              </tr>
            </tbody>
          </table>

          <hr />

          <p>
            Ready to try it?{" "}
            <Link to="/docs/getting-started" className="font-semibold">
              Getting Started
            </Link>{" "}
            walks through setup step by step. See the{" "}
            <Link to="/docs/cli" className="font-semibold">
              CLI Reference
            </Link>{" "}
            for every command and flag.
          </p>
        </DocSection>
      </DocProse>
    </DocsPageLayout>
  );
}
