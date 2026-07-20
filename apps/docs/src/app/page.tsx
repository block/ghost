import { DocSection } from "@/components/docs/docs-page-layout";
import { GatherDemo } from "@/components/docs/gather-demo";
import { Hero } from "@/components/docs/hero";
import { SectionWrapper } from "@/components/docs/wrappers";

const fragments = [
  ["product", "components, tokens, interaction patterns, UI copy"],
  ["marketing", "campaign systems, messaging frameworks, asset libraries"],
  ["content", "voice and editorial guidance"],
  ["support", "macros and service conventions"],
  ["motion", "behavior and timing"],
  ["legal", "approved claims and language"],
] as const;

const steeringDiagnoses = [
  {
    signal: "knowledge gap",
    read: "the agent invented a token, component, asset, or value because the real material was absent",
    repair: "supply the real files, names, values, or material pointers",
  },
  {
    signal: "steering gap",
    read: "the agent used the right materials but composed them generically",
    repair:
      "strengthen the examples, conditions, pattern, or opening structure",
  },
  {
    signal: "delivery gap",
    read: "the relevant guidance existed but did not reach the task",
    repair:
      "add the node, sharpen its description, or inspect why it was skipped",
  },
  {
    signal: "correction gap",
    read: "the output follows the words but still feels wrong in context",
    repair:
      "render the work, review it separately, and tune the package from the miss",
  },
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
        <DocSection
          id="fracture"
          title="fracture"
          marker={1}
          labelAs="h2"
          className="py-12 first:pt-12"
        >
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
        </DocSection>

        <DocSection
          id="maker"
          title="maker"
          marker={2}
          labelAs="h2"
          className="py-12"
        >
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
        </DocSection>

        <DocSection
          id="guidance"
          title="guidance"
          marker={3}
          labelAs="h2"
          className="py-12"
        >
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
        </DocSection>

        <DocSection
          id="gather"
          title="gather"
          marker={4}
          labelAs="h2"
          className="py-12"
        >
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
        </DocSection>

        <DocSection
          id="steer"
          title="steer"
          marker={5}
          labelAs="h2"
          className="py-12"
        >
          <div className="max-w-[54ch] space-y-4">
            <p>
              Steering quality comes from the whole delivery and correction
              loop, not from a larger prompt.
            </p>
            <p>
              ghost's optimization target is the first useful draft: work that
              starts with the right brand constraints, uses the right materials,
              and leaves a clear trail when it misses. Prompts and prose
              influence work rather than enforce it. Requirements that must
              always hold belong in code, schemas, linters, tests, or other
              executable checks. Human review remains part of the correction
              loop, not the enforcement boundary.
            </p>
          </div>

          <div className="mt-8 max-w-[54ch] space-y-4">
            <h3 className="font-bold lowercase">what reaches the agent</h3>
            <p>
              The first bet is relevant over complete. A useful package can be
              large, but the task should not inherit every rule in it. Gather
              exposes the whole menu, then pull delivers the bodies selected for
              the work. The agent sees enough of the brand to choose, and only
              the applicable guidance becomes generation context.
            </p>
            <p>
              A small shared stance can be present early without becoming a
              second handbook. The menu lets the agent choose what applies.
              Selected prose and real materials arrive for the task. A matching
              opening structure sits close to generation, where it can shape the
              first commitment without burying the work under unrelated
              instruction.
            </p>
          </div>

          <div className="mt-8 max-w-[54ch] space-y-4">
            <h3 className="font-bold lowercase">what carries influence</h3>
            <p>
              Instructions steer more when they name the replacement move. Do
              not only forbid a weak pattern. Show the stronger alternative in
              prose, attach the material the agent can inspect, and include the
              example that makes the choice concrete. A crop rule, a density
              pattern, or a support phrase carries more weight when it points at
              the thing it governs.
            </p>
            <p>Misses are easier to repair when they are diagnosed narrowly.</p>
          </div>

          <figure className="doc-figure rounded-squircle">
            <figcaption className="doc-figure-caption">
              diagnose the miss before changing the guidance
            </figcaption>
            {steeringDiagnoses.map(({ signal, read, repair }) => (
              <div className="doc-figure-row" key={signal}>
                <div className="font-bold">{signal}</div>
                <div>
                  <p>{read}</p>
                  <p className="text-[var(--doc-middle)]">{repair}</p>
                </div>
              </div>
            ))}
          </figure>

          <div className="max-w-[54ch] space-y-4">
            <h3 className="font-bold lowercase">when it arrives</h3>
            <p>
              Timing changes the work. Guidance that arrives before generation
              can shape the plan, the search, and the first draft. Guidance that
              arrives after the draft mostly becomes critique. ghost commits to
              the opening structure because the earliest frame is the one the
              agent builds around.
            </p>
            <p>
              Volume changes the work too. More instructions can flatten each
              other until none of them wins. ghost favors compact descriptions,
              selective pulls, and material-backed detail so the important
              constraints are visible at the moment of making.
            </p>
          </div>

          <div className="mt-8 max-w-[54ch] space-y-4">
            <h3 className="font-bold lowercase">correction</h3>
            <p>
              The second half of steering happens after the artifact exists.
              Render visual work. Read the result separately from the generation
              prompt. When checks exist, use review as a later pass, not as more
              instruction stuffed into the first request.
            </p>
            <p>
              Then tune the package from the evidence. Pulse can show whether a
              node was seen and pulled. Review can show which guidance applied
              to the diff. Human feedback can show where the prose was vague,
              the material was missing, or the example taught the wrong move.
            </p>
          </div>

          <div className="mt-10 max-w-[54ch] border-t border-[var(--doc-line)] pt-8 space-y-4">
            <h3 className="font-bold lowercase">how the bets compound</h3>
            <p>
              Each bet depends on the others. Guidance cannot help if it is not
              selected and delivered. Selection cannot prevent invention unless
              the package points to real materials. Materials alone do not
              determine composition. Generation cannot verify every rendered
              property. Review only improves later work when feedback becomes a
              package edit.
            </p>
            <p>
              Together, they make brand guidance more likely to survive the path
              from request to draft to review. The advantage comes from the
              complete delivery and correction loop, not any one technique. The
              exact amount, order, and phrasing still need tuning against real
              work.
            </p>
          </div>
        </DocSection>

        <div className="h-24" aria-hidden="true" />
      </SectionWrapper>
    </>
  );
}
