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
              Agents can write UI. What they cannot reliably preserve is the
              product-experience world that UI belongs to.
            </p>
            <p className="thesis-item">
              For years, design systems solved a human assembly problem. They
              gave teams shared tokens, components, examples, and usage rules so
              new surfaces could be composed from known parts.
            </p>
            <p className="thesis-item">
              That layer still matters, but agents change the scarce layer.
              Models can copy local patterns and recombine components. They do
              not consistently preserve the decisions that make a product feel
              intentional: hierarchy, density, restraint, behavior, copy,
              accessibility, trust, and flow.
            </p>
            <p className="thesis-item">
              Ghost is a repo-local product-experience world model for agents.
            </p>
            <p className="thesis-item">
              It turns upstream product judgment into checked-in fingerprint
              layers: what matters, why it matters, which situations change the
              obligation, which patterns hold the experience together, and which
              examples show the product at its best.
            </p>
            <p className="thesis-item">
              Components, tokens, libraries, and generated cache become
              implementation material. Ghost does not replace them. It gives
              agents the product model that tells them when and how those
              materials belong.
            </p>
            <p className="thesis-item">Ghost keeps that model compact:</p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/fingerprint.yml</code> stores canonical product
                experience prose, inventory, composition, and curated exemplars
              </li>
              <li>
                <code>.ghost/checks.yml</code> stores optional deterministic
                gates grounded in fingerprint refs
              </li>
              <li>
                ordinary Git review separates draft fingerprint edits from
                checked-in truth
              </li>
              <li>
                <code>.ghost/intent.md</code> and <code>.ghost/decisions</code>{" "}
                record optional human-approved context
              </li>
              <li>
                <code>.ghost/cache</code> holds generated cache without becoming
                canonical truth
              </li>
            </ul>
            <p className="thesis-item">
              The split is deliberate. Fingerprint prose answers what matters
              and why. Cache answers what exists. Exemplars show concrete
              surfaces worth inspecting before generation or review. Checks
              validate output; they are not generation input.
            </p>
            <p className="thesis-item">A typical loop becomes:</p>
            <ol className="thesis-item list-decimal space-y-2 pl-6">
              <li>
                Brief from the fingerprint layers, generated cache when useful,
                and exemplars
              </li>
              <li>Generate or edit with the host agent</li>
              <li>Run active deterministic checks and advisory review</li>
              <li>
                Fix code, explain intentional divergence, or update the Ghost
                package through Git
              </li>
            </ol>
            <p className="thesis-item">
              Ghost stays bring-your-own-agent. The agent reads, decides, and
              writes. Ghost does the repeatable work: initialization, schema
              validation, inventory, evidence verification, checks, advisory
              review packets, comparison, and upstream handoff packets.
            </p>
            <p className="thesis-item">
              This is critical because product judgment that cannot be recalled
              or evaluated cannot be delegated. A product experience that only
              its original author can judge is not transferable: to agents, to
              new engineers, or to forks of the product.
            </p>
            <p className="thesis-item">
              Drift becomes measurable within this system. When generated or
              modified UI diverges from checked-in fingerprint layers, the
              failure is not just error; it is signal. Drift can originate from:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>incorrect generation: agent failure</li>
              <li>missing memory: under-specified product judgment</li>
              <li>intentional product evolution</li>
            </ul>
            <p className="thesis-item">
              Ghost does not eliminate drift; it surfaces and localizes it. The
              system's boundary becomes visible where composition fails.
            </p>
            <p className="thesis-item">
              The fingerprint package must live where generation happens: in the
              repository, versioned alongside the code it governs. As the
              product changes, fingerprint edits move through the same ordinary
              Git review that introduces new UI.
            </p>
            <p className="thesis-item">
              This leads to a practical governance model. Each repository owns
              its product experience fingerprint. Advanced workflows can add
              nested packages for product areas, custom fingerprint directories
              for host wrappers, comparison across systems, and declared drift
              stances.
            </p>
            <p className="thesis-item">
              Across an organization, the collection of Ghost packages forms a
              higher-order map: a distributed model of product experience as it
              is actually practiced, not as it is only described.
            </p>
            <p className="thesis-item">
              Design systems were libraries for humans. Ghost is memory for
              agents: every surface can carry the product model it extends, and
              every deviation can carry evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
