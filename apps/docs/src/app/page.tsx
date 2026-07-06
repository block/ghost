import { useStaggerReveal } from "@design-intelligence/vessel";
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
              <span className="text-foreground">Brand is not the logo.</span>{" "}
              It&apos;s the accumulated stance behind everything you ship: what
              you say plainly, where you slow down, what you refuse to do, how
              you behave at the moment someone trusts you. It flows through
              every surface — the screen, the email, the empty state, the
              sentence.
            </p>
            <p className="thesis-item">
              <span className="text-foreground">Agents now do the making.</span>{" "}
              They&apos;re fast, they&apos;re capable, and they hold nothing
              they aren&apos;t handed. Every generated screen and sentence is an
              answer to a question the agent was never asked:{" "}
              <em className="text-foreground">
                what would this brand do here?
              </em>
            </p>
            <p className="thesis-item">
              <span className="text-foreground">
                Ghost writes the answer down, where the making happens.
              </span>{" "}
              The fingerprint is a portable steering packet: plain prose truths,
              one file each, checked into the repo. A truth is stated once, at
              the altitude it is actually true — &ldquo;near the moment of
              payment, reduce felt risk&rdquo; — and steers whatever is being
              made from it. Any agent reads the same packet: Claude, Codex,
              Cursor, Goose. Any medium takes the same steer: a screen, a page,
              a sentence. It travels with the repo, and it outlives your choice
              of agent.
            </p>
            <p className="thesis-item">
              <span className="text-foreground">
                Around the packet, machinery — and only machinery.
              </span>{" "}
              <code>ghost gather</code> emits the menu of truths;{" "}
              <code>ghost pull</code> delivers the ones that fit the task;{" "}
              <code>ghost review</code> assembles an advisory packet after the
              work, never during. The CLI computes and never decides. The packet
              is the product; the CLI is the courier.
            </p>
            <p className="thesis-item">
              <span className="text-foreground">
                Brand used to survive by being remembered
              </span>{" "}
              — carried in heads, enforced one review comment at a time. Ghost
              makes it something stronger: written once, read before anything is
              made, carried by everything that ships.
            </p>
          </div>
        </section>
      </SectionWrapper>
    </>
  );
}
