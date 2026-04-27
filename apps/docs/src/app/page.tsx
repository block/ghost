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
              AI is becoming the primary author of shipped code. Sometimes it's
              driven by a human operator through an agentic workflow; sometimes
              it runs fully autonomously. The economics have shifted with it. We
              no longer assume humans will sit in every diff; we assume the
              harness — the guardrails, the reviewers, the verifiers — catches
              divergence before it lands.
            </p>
            <p className="thesis-item">
              In that world, ensuring every generation reflects a brand's voice
              is paramount. It's not a judgment a human can make PR by PR
              anymore. Brand has to be legible to the agent, enforceable by the
              harness, and verifiable without a reviewer in the loop.
            </p>
            <p className="thesis-item">
              Today, brand lives in artifacts written primarily for humans, to
              aid collaboration and understanding. It's not the same for agents.
              They default to generating from whatever the model learned, and
              brand quality quietly slips. Tokens are the easy half: fonts,
              colors, spacing can be pinned down, and the agent will respect
              them. The hard half is <em>character</em>: the posture a product
              takes, what it refuses to do. That doesn't fit in a token file,
              and it's where generations drift first.
            </p>
            <p className="thesis-item">
              And it has to be checkable. A voice that can only be evaluated by
              its original author can't be delegated — not to an agent, not to a
              new hire, not to a fork. The harness is how a voice becomes
              transmissible: enough of it captured outside one person that
              someone who isn't you can apply it faithfully.
            </p>
            <p className="thesis-item">
              The artifact that carries brand has to live where the agent does:
              in the repo, versioned with the code, edited in the same PRs as
              the features it shapes. And it has to evolve. Brand isn't locked
              in at the start; it shifts as the product ships, as taste
              sharpens, as new surfaces appear, as the org grows new products
              around it.
            </p>
            <p className="thesis-item">
              Which raises the governance question. The reflex is to centralize:
              one source of truth, many downstream projects, compliance tracked
              from above. Ghost takes the opposite approach. Each repo owns its
              expression, its trajectory, and its stance. Decentralization
              without intent is entropy, so stances (<em>aligned</em>,{" "}
              <em>accepted</em>, <em>diverging</em>) turn divergence into
              signal. The fleet of expressions drifts in the open; every
              divergence carries reasoning. And read from above, the fleet
              becomes a world model — the shape of the org's design language,
              drawn from the languages inside it. Nothing is prescriptive.
              Nothing drifts silently. Everything is transparent.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
