"use client";

import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { ColorsDemos } from "@/components/docs/foundations/colors";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function ColorsPage() {
  const contentRef = useScrollReveal<HTMLDivElement>({
    y: 50,
    duration: 0.9,
    ease: "expo.out",
  });

  return (
    <>
      <SectionWrapper>
        <AnimatedPageHeader
          kicker="Foundations"
          title="Colors"
          description="A pure monochromatic scale with selective semantic color for status and utility."
        />
      </SectionWrapper>

      <SectionWrapper>
        <div ref={contentRef}>
          <ColorsDemos />
        </div>
      </SectionWrapper>
    </>
  );
}
