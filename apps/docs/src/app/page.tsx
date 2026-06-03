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
              product experience identity behind that UI.
            </p>
            <p className="thesis-item">
              The failure mode is structural. Large language models generate by
              matching local patterns. They reproduce components, tokens, and
              layouts, but they do not consistently preserve the decisions that
              make a surface feel intentional: hierarchy, density, restraint,
              behavior, copy, accessibility, trust, and flow.
            </p>
            <p className="thesis-item">
              Most design systems encode inventory: colors, type scales,
              components, libraries, and examples. That inventory is necessary,
              but it is not sufficient. Inventory answers what exists. It does
              not answer what matters, why it matters, or how a product chooses
              among valid possibilities.
            </p>
            <p className="thesis-item">
              Ghost introduces repo-local product experience memory.
            </p>
            <p className="thesis-item">
              That memory lives in a compact, versioned bundle that agents can
              read before generation and deterministic tooling can validate
              after changes. Components, tokens, libraries, and generated
              inventory remain implementation material; Ghost preserves the
              product judgment that sits around them.
            </p>
            <p className="thesis-item">
              The broader boundary is product experience: anything that shapes
              how the product is perceived, used, trusted, understood, or safely
              changed. Ghost keeps that memory auditable instead of letting it
              disappear into chats, reviews, and one-off prompts.
            </p>
            <p className="thesis-item">
              Ghost keeps this memory in a compact bundle:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/fingerprint.yml</code> stores canonical product
                experience memory and curated exemplars
              </li>
              <li>
                <code>.ghost/checks.yml</code> stores optional deterministic
                gates grounded in that memory
              </li>
              <li>
                ordinary Git review separates draft memory edits from checked-in
                truth
              </li>
              <li>
                <code>.ghost/decisions</code> records optional accepted or
                rejected rationale
              </li>
              <li>
                <code>.ghost/cache</code> can hold generated inventory without
                becoming canonical truth
              </li>
            </ul>
            <p className="thesis-item">
              The distinction is deliberate. Fingerprint prose explains what
              matters and why. Optional cache explains what exists. Exemplars
              show concrete surfaces worth inspecting before generation or
              review. Checks validate output; they are not generation memory.
            </p>
            <p className="thesis-item">
              Fingerprint memory may start sparse and grow only where the
              product has durable memory to record. It can encode:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>the product, audience, goals, anti-goals, and tradeoffs</li>
              <li>situations where user intent changes product obligations</li>
              <li>principles and contracts for behavior, copy, and recovery</li>
              <li>visual, content, behavior, and composition patterns</li>
              <li>curated examples of what good looks like in practice</li>
            </ul>
            <p className="thesis-item">
              For an agent, this changes the task. UI generation is no longer
              unconstrained composition over a design system. It becomes a
              product-specific brief grounded in checked-in memory, optional
              inventory, and exemplars.
            </p>
            <p className="thesis-item">A typical loop becomes:</p>
            <ol className="thesis-item list-decimal space-y-2 pl-6">
              <li>
                Brief from fingerprint memory, optional inventory, and exemplars
              </li>
              <li>Generate or edit with the host agent</li>
              <li>Run active deterministic checks and advisory review</li>
              <li>
                Fix code, explain intentional divergence, or update memory
                through Git
              </li>
            </ol>
            <p className="thesis-item">
              Ghost stays bring-your-own-agent. The agent reads, decides, and
              writes. Ghost does the repeatable work: initialization, schema
              validation, inventory, evidence verification, checks, advisory
              review packets, comparison, and handoff packets.
            </p>
            <p className="thesis-item">
              This is critical because product judgment that cannot be recalled
              or evaluated cannot be delegated. A product experience that only
              its original author can judge is not transferable: to agents, to
              new engineers, or to forks of the product.
            </p>
            <p className="thesis-item">
              Drift becomes measurable within this system. When generated or
              modified UI diverges from checked-in memory, the failure is not
              just error; it is signal. Drift can originate from:
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
              The memory bundle must live where generation happens: in the
              repository, versioned alongside the code it governs. As the
              product changes, memory changes through the same ordinary Git
              review that introduces new UI.
            </p>
            <p className="thesis-item">
              This leads to a practical governance model. Each repository owns
              its product experience memory. Advanced workflows can add nested
              bundles for product areas, custom memory directories for host
              wrappers, comparison across systems, and declared drift stances.
            </p>
            <p className="thesis-item">
              Across an organization, the collection of Ghost bundles forms a
              higher-order map: a distributed model of product experience as it
              is actually practiced, not as it is only described.
            </p>
            <p className="thesis-item">
              Nothing is enforced globally. Nothing needs to drift silently.
              Every surface can carry its memory, and every deviation can carry
              evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
