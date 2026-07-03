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
              brand behind it: the stance, density, restraint, copy, trust, and
              flow that make an output feel intentional.
            </p>
            <p className="thesis-item">
              Design systems solved a human assembly problem: shared tokens,
              components, and usage rules so teams could build from known parts.
              That layer still matters. But agents already recombine those
              parts. The scarce layer now is the brand truth that tells them
              when and how the parts belong.
            </p>
            <p className="thesis-item">
              Ghost captures those truths and checks them into the repo, where
              generation happens. It is a{" "}
              <span className="text-foreground">
                flat corpus of prose nodes
              </span>
              , one markdown file each, that your agent reads before it builds
              and can review against after it changes.
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/</code> is the portable fingerprint package
              </li>
              <li>
                a node&apos;s id is its filename; its kind is the filename
                prefix, declared in the author&apos;s <code>glossary.md</code>
              </li>
              <li>
                there is no hierarchy, no inheritance, no edges — altitude lives
                in the prose, and a narrower truth names its condition
              </li>
              <li>
                each node is written through <code>intent</code>,{" "}
                <code>inventory</code>, and <code>composition</code>: the why,
                the materials, the patterns
              </li>
              <li>
                haunts under <code>haunts/</code> are opt-in feed-back
                capabilities — checks review output and never leak into
                generation
              </li>
              <li>ordinary Git review is the approval boundary for edits</li>
            </ul>
            <p className="thesis-item">
              Asking for context is a menu, not a traversal:{" "}
              <code>ghost gather</code> emits every truth&apos;s id, kind, and
              description, and the agent selects just-in-time against the actual
              task, then pulls the full bodies with <code>ghost pull</code>.
            </p>
            <p className="thesis-item">The loop is small:</p>
            <ol className="thesis-item list-decimal space-y-2 pl-6">
              <li>Gather the menu and pull the truths that fit the task</li>
              <li>Generate or edit with your agent</li>
              <li>
                Assemble an advisory review packet against the diff with{" "}
                <code>ghost review</code>
              </li>
              <li>
                Fix code, explain intentional divergence, or update the
                fingerprint through Git
              </li>
            </ol>
            <p className="thesis-item">
              Ghost stays bring-your-own-agent. The agent reads, decides, and
              writes. Ghost does the repeatable work: scaffolding, corpus
              validation, the gather menu, selected pulls, check routing, and
              advisory review packets.
            </p>
            <p className="thesis-item">
              A brand truth that can't be recalled or reviewed against can't be
              delegated. A decision only its author can assess won't transfer to
              an agent, a new engineer, or a fork. Ghost makes it transferable,
              and makes drift visible: where generated work diverges from the
              fingerprint, the gap is signal, and it is localized.
            </p>
            <p className="thesis-item">
              Design systems were libraries for humans. Ghost is brand context
              for agents: every output can carry the fingerprint it manifests,
              and every deviation can carry evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
