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
              thought behind the product experience they are changing.
            </p>
            <p className="thesis-item">
              The failure mode is structural. Large language models generate by
              matching local patterns. They reproduce components, tokens, and
              layouts, but they do not consistently preserve the higher-order
              decisions that make a surface feel intentional: its hierarchy, its
              density, its restraint, the specific ways it repeats and refuses,
              and the ways it earns trust.
            </p>
            <p className="thesis-item">
              Most design systems encode the inventory of a product: colors,
              type scales, components. That inventory is necessary, but it is
              not sufficient. The same system can produce many different
              products. What is missing is the policy that governs how those
              parts are composed.
            </p>
            <p className="thesis-item">
              Ghost introduces a second layer: a fingerprint.
            </p>
            <p className="thesis-item">
              The fingerprint is a repository-local, versioned artifact that
              captures the product's composition policy: the set of constraints,
              preferences, and recurring decisions that shape how the system is
              actually used. It does not replace the design system; it
              conditions it.
            </p>
            <p className="thesis-item">
              The broader boundary is product experience: anything that shapes
              how the product is perceived, used, trusted, understood, or safely
              changed. Ghost keeps that memory auditable instead of letting it
              disappear into chats, reviews, and one-off prompts.
            </p>
            <p className="thesis-item">
              Ghost builds this fingerprint package from evidence in the
              codebase:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>
                <code>.ghost/resources.yml</code> names what the bundle is
                grounded in
              </li>
              <li>
                <code>.ghost/map.md</code> defines where to observe and route UI
              </li>
              <li>
                <code>.ghost/survey.json</code> records factual extracted
                evidence
              </li>
              <li>
                <code>.ghost/patterns.yml</code> shapes advisory judgment
                without enforcing CI
              </li>
              <li>
                <code>.ghost/checks.yml</code> stores human-promoted gates
              </li>
              <li>
                <code>.ghost/decisions</code> and <code>.ghost/proposals</code>{" "}
                capture optional product-experience memory
              </li>
            </ul>
            <p className="thesis-item">
              The distinction is deliberate. Specs describe what exists. The
              fingerprint describes how the product repeatedly chooses to use
              what exists.
            </p>
            <p className="thesis-item">
              This makes the fingerprint closer to a behavioral prior than a
              spec. It encodes:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>preferred hierarchies over possible ones</li>
              <li>constraints on density, spacing, and interaction patterns</li>
              <li>allowed deviations from base components</li>
              <li>explicit anti-patterns the surface avoids</li>
            </ul>
            <p className="thesis-item">
              For an agent, this changes the task. UI generation is no longer
              unconstrained composition over a design system. It becomes a
              constrained search guided by a product-specific policy.
            </p>
            <p className="thesis-item">A typical loop becomes:</p>
            <ol className="thesis-item list-decimal space-y-2 pl-6">
              <li>Condition on the fingerprint</li>
              <li>Generate UI against the design system</li>
              <li>Evaluate the result against fingerprint constraints</li>
              <li>Revise until violations are reduced or resolved</li>
            </ol>
            <p className="thesis-item">
              The fingerprint is therefore not just descriptive. It is partially
              executable. It enables both generation and evaluation.
            </p>
            <p className="thesis-item">
              This is critical because style that cannot be evaluated cannot be
              delegated. A design language that only its original author can
              judge is not transferable: to agents, to new engineers, or to
              forks of the product.
            </p>
            <p className="thesis-item">
              Ghost treats evaluation as a first-class concern. Parts of the
              fingerprint are grounded in:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>explicit rules: hard constraints</li>
              <li>preference gradients: soft constraints</li>
              <li>negative constraints: anti-patterns</li>
            </ul>
            <p className="thesis-item">
              These allow an agent, or a reviewer, to check whether a surface
              composes faithfully, not just whether it compiles.
            </p>
            <p className="thesis-item">
              Drift becomes measurable within this system. When generated or
              modified UI diverges from the fingerprint, the failure is not just
              error; it is signal. Drift can originate from:
            </p>
            <ul className="thesis-item list-disc space-y-2 pl-6">
              <li>incorrect generation: agent failure</li>
              <li>incomplete fingerprint: under-specified policy</li>
              <li>intentional product evolution</li>
            </ul>
            <p className="thesis-item">
              Ghost does not eliminate drift; it surfaces and localizes it. The
              system's boundary becomes visible where composition fails.
            </p>
            <p className="thesis-item">
              The fingerprint package must live where generation happens: in the
              repository, versioned alongside the code it governs, evolving
              through the same pull requests that introduce new UI. As the
              product changes, the package updates with it, maintaining
              alignment between intent and implementation.
            </p>
            <p className="thesis-item">
              This leads to a different governance model. Instead of a single
              centralized design authority, each repository owns its
              fingerprint: its local expression of the design language.
              Divergence across repositories is not hidden; it is made explicit
              through declared stances (<em>aligned</em>, <em>accepted</em>,{" "}
              <em>diverging</em>), turning fragmentation into observable
              structure.
            </p>
            <p className="thesis-item">
              Across an organization, the collection of fingerprints forms a
              higher-order map: a distributed model of the design language as it
              is actually practiced, not as it is prescribed.
            </p>
            <p className="thesis-item">
              Nothing is enforced globally. Nothing drifts silently. Every
              surface declares its policy, and every deviation carries evidence.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
