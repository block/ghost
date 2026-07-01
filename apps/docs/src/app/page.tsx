import { useStaggerReveal } from "@anarchitecture/ghost-vessel";
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
              composition behind it: the hierarchy, density, restraint, copy,
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
              <span className="text-foreground">graph of prose nodes</span>, one
              markdown file each, that your agent reads before it builds and
              checks after it changes.
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/</code> is the portable fingerprint package
              </li>
              <li>
                the directory tree <em>is</em> the graph: a node&apos;s id is
                its file path, and its parent is its containing directory
              </li>
              <li>
                a surface is just a directory; its own prose lives in that
                directory&apos;s <code>index.md</code>, and the root{" "}
                <code>index.md</code> is the implicit <code>core</code> node
              </li>
              <li>
                each node is written through <code>intent</code>,{" "}
                <code>inventory</code>, and <code>composition</code>: the why,
                the materials, the patterns
              </li>
              <li>
                <code>checks/*.md</code> validate output; they are never
                generation input
              </li>
              <li>ordinary Git review is the approval boundary for edits</li>
            </ul>
            <p className="thesis-item">
              A node inherits everything in the directories above it. The brand
              soul lives in the root <code>index.md</code> (the{" "}
              <code>core</code> node) and reaches every surface;
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
              delegated. A surface only its author can assess won't transfer to
              an agent, a new engineer, or a fork. Ghost makes it transferable,
              and makes drift measurable: where generated UI diverges from the
              fingerprint, the gap is signal, and it is localized.
            </p>
            <p className="thesis-item">
              Design systems were libraries for humans. Ghost is composition
              context for agents: every surface carries the fingerprint it
              extends, and every deviation can carry evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
