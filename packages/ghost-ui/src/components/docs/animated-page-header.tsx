"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

interface AnimatedPageHeaderProps {
  kicker: string;
  title: string;
  description?: string;
}

export function AnimatedPageHeader({
  kicker,
  title,
  description,
}: AnimatedPageHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      const kickerEl = ref.current?.querySelector(".page-kicker");
      const titleEl = ref.current?.querySelector(".page-title");
      const descEl = ref.current?.querySelector(".page-desc");
      const lineEl = ref.current?.querySelector(".page-line");

      if (kickerEl) {
        gsap.set(kickerEl, { y: 20, opacity: 0 });
        tl.to(kickerEl, { y: 0, opacity: 1, duration: 0.6 });
      }
      if (titleEl) {
        gsap.set(titleEl, { y: 60, opacity: 0 });
        tl.to(titleEl, { y: 0, opacity: 1, duration: 1 }, "-=0.4");
      }
      if (lineEl) {
        gsap.set(lineEl, { scaleX: 0 });
        tl.to(
          lineEl,
          { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
          "-=0.5",
        );
      }
      if (descEl) {
        gsap.set(descEl, { y: 20, opacity: 0 });
        tl.to(descEl, { y: 0, opacity: 1, duration: 0.6 }, "-=0.4");
      }
    }, ref);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className="py-12 sm:py-16 md:py-24">
      <p
        className="page-kicker font-display uppercase text-muted-foreground"
        style={{
          fontSize: "var(--label-font-size)",
          letterSpacing: "var(--label-letter-spacing)",
          fontWeight: "var(--label-font-weight)",
        }}
      >
        {kicker}
      </p>
      <div
        className="page-title font-display font-black tracking-[-0.05em] leading-[0.88] mt-2"
        style={{ fontSize: "var(--heading-section-font-size)" }}
      >
        {title}
      </div>
      <div className="page-line my-5 h-px w-24 origin-left bg-border-strong lg:w-32" />
      {description && (
        <p className="page-desc max-w-[60ch] text-muted-foreground leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
