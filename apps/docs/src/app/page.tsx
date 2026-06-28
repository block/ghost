import { useStaggerReveal } from "ghost-ui";
import { Hero } from "@/components/docs/hero";
import { SectionWrapper } from "@/components/docs/wrappers";

export default function Home() {
  const thesisRef = useStaggerReveal<HTMLElement>(".thesis-item", {
    stagger: 0.08,
    y: 20,
    duration: 0.8,
  });

  return (
    <>
      <Hero />

      <SectionWrapper>
        <section
          ref={thesisRef}
          className="pb-24 md:pb-32 mx-auto max-w-[62ch]"
        >
          <p
            className="thesis-item font-display uppercase text-foreground mb-4 text-center"
            style={{
              fontSize: "var(--label-font-size)",
              letterSpacing: "var(--label-letter-spacing)",
            }}
          >
            Thesis
          </p>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p className="thesis-item">
              Agents can assemble UI. What they can't reliably preserve is the
              composition behind it — the hierarchy, density, restraint, copy,
              trust, and flow that make a surface feel intentional.
            </p>
            <p className="thesis-item">
              Design systems solved a human assembly problem: shared tokens,
              components, and usage rules so teams could build from known parts.
              That layer still matters. But agents already recombine those
              parts. The scarce layer now is the composition that tells them
              when and how the parts belong.
            </p>
            <p className="thesis-item">
              Ghost captures that composition and checks it into the repo, where
              generation happens. It is a{" "}
              <span className="text-foreground">graph of prose nodes</span> —
              one markdown file each — that your agent reads before it builds
              and checks after it changes.
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/</code> is the portable fingerprint package
              </li>
              <li>
                <code>surfaces.yml</code> is the spine; <code>nodes/*.md</code>{" "}
                are the design expression
              </li>
              <li>
                each node is written through <code>intent</code>,{" "}
                <code>inventory</code>, and <code>composition</code> — the why,
                the materials, the patterns
              </li>
              <li>
                <code>checks/*.md</code> validate output; they are never
                generation input
              </li>
              <li>ordinary Git review is the approval boundary for edits</li>
            </ul>
            <p className="thesis-item">
              A node inherits everything it sits <code>under</code>. The brand
              soul lives at <code>core</code> and reaches every surface;
              surface-specific nodes refine it; <code>relates</code> links them
              laterally. Asking for context becomes a graph traversal:{" "}
              <code>ghost gather &lt;surface&gt;</code> composes the slice that
              applies.
            </p>
            <p className="thesis-item">The loop is small:</p>
            <ol className="thesis-item list-decimal space-y-2 pl-6">
              <li>
                Gather the composed context for the surface you're touching
              </li>
              <li>Generate or edit with your agent</li>
              <li>Route checks and emit an advisory review against the diff</li>
              <li>
                Fix code, explain intentional divergence, or update the
                fingerprint through Git
              </li>
            </ol>
            <p className="thesis-item">
              Ghost stays bring-your-own-agent. The agent reads, decides, and
              writes. Ghost does the repeatable work: scaffolding, schema and
              graph validation, context composition, check routing, and advisory
              review packets.
            </p>
            <p className="thesis-item">
              Composition that can't be recalled or evaluated can't be
              delegated. A surface only its author can assess isn't transferable
              — not to agents, not to new engineers, not to forks. Ghost makes
              it transferable, and makes drift measurable: where generated UI
              diverges from the fingerprint, the gap is signal, and it is
              localized.
            </p>
            <p className="thesis-item">
              Design systems were libraries for humans. Ghost is composition
              context for agents — every surface carries the fingerprint it
              extends, and every deviation can carry evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
