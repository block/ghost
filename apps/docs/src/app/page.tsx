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
description: Photography. Gather when a composition uses a photo.
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
description: Blocked progress. Gather when someone cannot continue a task.
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
description: Exact color roles and values. Gather before assigning color.
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
            <p>Teams keep different parts of the brand in different tools.</p>
            <p>
              Product teams maintain components and tokens. Marketing keeps
              campaign systems and asset libraries. By the time a specialist
              applies the shared brand guidelines, each discipline has adapted
              them to its own work.
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
              Specialists bridge the gaps through interpretation and review,
              then repeat the work on the next surface.
            </p>
          </div>
        </section>

        <section
          id="maker"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={2}>maker</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>
              Agents work across the boundaries that split brand guidance into
              pieces.
            </p>
            <p>
              Agents can build a payment screen, write its confirmation email,
              produce a launch campaign, and revise the support response. The
              agent still receives a component library for one task, a voice
              guide for another, and a campaign deck for the next. Different
              people provide each source at different times.
            </p>
          </div>
        </section>

        <section
          id="guidance"
          className="scroll-mt-8 max-w-[76ch] border-t border-[var(--doc-line)] py-12"
        >
          <SectionLabel n={3}>guidance</SectionLabel>
          <div className="max-w-[54ch] space-y-4">
            <p>
              ghost records brand decisions in prose that agents can find and
              use.
            </p>
            <p>
              A `.ghost/` package holds the brand's broad stances that should
              survive every medium, the narrower decisions that belong to a
              particular situation, and pointers to the materials where those
              decisions become concrete.
            </p>
            <p>
              One decision can guide a screen, email, campaign, and support
              response. Each medium still keeps its own form.
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
              motion. The agent loads only the guidance that applies to its
              current task.
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
