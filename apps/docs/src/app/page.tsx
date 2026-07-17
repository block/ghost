import { Link } from "react-router";
import { GatherDemo } from "@/components/docs/gather-demo";
import { Hero } from "@/components/docs/hero";
import { SectionWrapper } from "@/components/docs/wrappers";

function SectionLabel({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="mb-8 font-bold lowercase">
      <span className="doc-annotation">{n} </span>
      {children}
    </h2>
  );
}

const fragments = [
  ["product", "components, tokens, interaction patterns, UI copy"],
  ["marketing", "campaign systems, messaging frameworks, asset libraries"],
  ["content", "voice and editorial guidance"],
  ["support", "macros and service conventions"],
  ["motion", "behavior and timing"],
  ["legal", "approved claims and language"],
] as const;

const guidanceExamples = [
  {
    label: "visual decision",
    path: "pattern.crop-with-intent.md",
    body: `---
description: Photography — gather when a composition uses a photo.
materials:
  - brand/photography/**
---

# Crop with intent

Crop around one clear subject. Let the subject meet at least one edge.

Reject cautious full-object framing and collages that avoid choosing a focal point.`,
    palette: [],
  },
  {
    label: "product pattern",
    path: "condition.blocked-progress.md",
    body: `---
description: Blocked progress — gather when someone cannot continue a task.
materials:
  - src/components/error-state/**
---

# Keep a path forward

Keep the explanation and one next action together.

If the person cannot resolve the problem, state what happens next. Do not end on a disabled control.`,
    palette: [],
  },
  {
    label: "exact material",
    path: "asset.color-roles.md",
    body: `---
description: Exact color roles and values — gather before assigning color.
materials:
  - src/styles/brand-tokens.css
---

# Color roles

Ink carries content. Signal marks selection. Correction marks review.

\`\`\`css
--ink: #171714;
--signal: #e8df55;
--correction: #c83e36;
\`\`\``,
    palette: [
      ["ink", "#171714"],
      ["signal", "#e8df55"],
      ["correction", "#c83e36"],
    ],
  },
] as const;

export default function Home() {
  return (
    <>
      <Hero />

      <SectionWrapper>
        <section
          id="fracture"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={1}>fracture</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>Brand has never lived in one place.</p>
            <p>
              Each discipline maintains the version of the brand it can use.
              Brand guidelines often sit above them, describing a common intent
              it cannot carry into the work.
            </p>
          </div>

          <figure
            className="doc-figure rounded-squircle"
            aria-label="brand fragments by discipline"
          >
            <figcaption className="doc-figure-caption">
              one brand, maintained in pieces
            </figcaption>
            {fragments.map(([discipline, artifacts]) => (
              <div className="doc-figure-row" key={discipline}>
                <div className="font-bold">{discipline}</div>
                <div>{artifacts}</div>
              </div>
            ))}
          </figure>

          <div className="max-w-[54ch] space-y-4">
            <p>
              People have always bridged the gaps. They interpret, review,
              correct, and repeat.
            </p>
            <p>
              The fragmentation followed the organization. Different specialists
              worked in different tools, on different materials, at different
              times.
            </p>
          </div>
        </section>

        <section
          id="maker"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={2}>maker</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>Agents already cross boundaries the brand does not.</p>
            <p>
              Agents can build a payment screen, write its confirmation email,
              produce a launch campaign, and revise the support response. But
              the guidance still arrives as departmental debris: a component
              library for one task, a voice guide for another, a campaign deck
              for the next, all triggered separately by different people.
            </p>
          </div>
        </section>

        <section
          id="guidance"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={3}>guidance</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>ghost gives brand decisions a shared, agent-legible form.</p>
            <p>
              A `.ghost/` package holds the brand's broad stances that should
              survive every medium, the narrower decisions that belong to a
              particular situation, and pointers to the materials where those
              decisions become concrete.
            </p>
            <p>
              One brand decision can be stated once without forcing every output
              to look the same. The guidance stays specific without remaining
              isolated by discipline.
            </p>
          </div>

          <div
            className="guidance-triptych"
            aria-label="three kinds of guidance"
          >
            {guidanceExamples.map((example) => (
              <figure
                className="doc-figure rounded-squircle"
                key={example.path}
              >
                <figcaption className="doc-figure-caption">
                  <span>{example.label}</span>
                  <code>.ghost/{example.path}</code>
                </figcaption>
                <pre className="overflow-x-auto whitespace-pre-wrap p-4 px-[2ch] leading-5">
                  <code>{example.body}</code>
                </pre>
                {example.palette.length > 0 ? (
                  <div className="guidance-palette" aria-label="color values">
                    {example.palette.map(([name, value]) => (
                      <div key={name}>
                        <span style={{ backgroundColor: value }} />
                        <code>{name}</code>
                      </div>
                    ))}
                  </div>
                ) : null}
              </figure>
            ))}
          </div>
        </section>

        <section
          id="gather"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={4}>gather</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>
              A useful ghost package may hold hundreds of decisions. Loading all
              of them into every task would turn shared guidance into one giant
              prompt.
            </p>
            <p>
              <code>ghost gather</code> gives the agent a compact view of the
              complete ghost package. The agent chooses, then pulls the guidance
              that applies to the work.
            </p>
          </div>

          <GatherDemo />

          <div className="max-w-[54ch] space-y-4">
            <h3 className="font-bold lowercase">observable</h3>
            <p>
              Gather shows the complete menu before the agent chooses. If useful
              guidance does not reach the work, you can see whether the node was
              missing, its description was unclear, or the agent skipped it.
            </p>

            <h3 className="pt-4 font-bold lowercase">efficiency</h3>
            <p>
              Gather represents every node with a compact ID and description.
              Pull loads the full prose and materials only for the selected
              nodes. The agent sees the shape of the whole brand while keeping
              generation context small and free of unrelated instructions.
            </p>
          </div>

          <div className="mt-10 max-w-[54ch] border-t border-[var(--doc-line)] pt-8">
            <p>
              One ghost package can guide product, marketing, support, and
              motion without loading the entire brand into every task. The
              guidance lives together. Each task receives only what applies.
            </p>
          </div>
        </section>

        <section className="max-w-[76ch] border-t border-[var(--doc-line)] pb-24 pt-12">
          <Link className="doc-link font-bold" to="/docs/getting-started">
            See how to build a ghost package →
          </Link>
        </section>
      </SectionWrapper>
    </>
  );
}
