"use client";

import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { TypographyDemos } from "@/components/docs/foundations/typography";
import { SectionWrapper } from "@/components/docs/wrappers";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export default function TypographyPage() {
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
          title="Typography"
          description="Magazine-grade hierarchy with HK Grotesk. Display for headers, Regular for body, Mono for data."
        />
      </SectionWrapper>

      <SectionWrapper>
        <div ref={contentRef}>
          <TypographyDemos />
        </div>
      </SectionWrapper>
    </>
  );
}
