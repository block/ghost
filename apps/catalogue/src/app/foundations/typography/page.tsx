"use client";

import { useScrollReveal } from "@ghost/ui";
import { AnimatedPageHeader } from "@/components/docs/animated-page-header";
import { TypographyDemos } from "@/components/docs/foundations/typography";
import { SectionWrapper } from "@/components/docs/wrappers";

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
          description="Magazine-grade hierarchy. Display for headers, Regular for body, Mono for data."
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
