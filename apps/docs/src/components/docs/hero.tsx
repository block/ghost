"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      const lines = headingRef.current?.querySelectorAll(".hero-line");
      if (lines) {
        gsap.set(lines, { y: 40, opacity: 0 });
        tl.to(lines, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.08,
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* Concentric circles — fixed backdrop, persists through page scroll */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {[3, 4, 5].map((i) => {
          const size = Math.pow(i, 1.6) * 12;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 rounded-full border border-[var(--foreground)]"
              style={{
                width: `${size}vmin`,
                height: `${size}vmin`,
                transform: "translate(-50%, -50%)",
                opacity: 0,
                animation: `fadeToSubtle 0.6s ease-out ${i * 0.3}s forwards`,
              }}
            />
          );
        })}
      </div>

      <section
        ref={containerRef}
        className="relative z-10 flex flex-col justify-center px-6 lg:px-10 pt-24 pb-12 md:pt-32 md:pb-16"
        id="home"
      >
        <div className="relative z-10 flex w-full flex-col items-center">
          <h1
            ref={headingRef}
            className="font-display font-black uppercase leading-[0.88] tracking-[-0.04em] text-center"
            style={{ fontSize: "clamp(3.5rem, 11vw, 10rem)" }}
          >
            <span className="hero-line block">Ghost</span>
          </h1>
        </div>
      </section>
    </>
  );
}
