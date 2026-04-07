"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { CycloidCanvas } from "./cycloid-canvas";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // Animate each line of the heading
      const lines = headingRef.current?.querySelectorAll(".hero-line");
      if (lines) {
        gsap.set(lines, { y: 120, opacity: 0, rotateX: -15 });
        tl.to(lines, {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1.2,
          stagger: 0.12,
        });
      }

      // Parallax on scroll — heading moves up faster
      if (headingRef.current) {
        gsap.to(headingRef.current, {
          y: -80,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }

      // Fade out on scroll
      if (containerRef.current) {
        gsap.to(containerRef.current, {
          opacity: 0,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "60% top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 lg:px-10"
      id="home"
    >
      {/* Subtle gradient overlay for depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/60" />

      {/* Generative cycloid drawing */}
      <CycloidCanvas />

      <div className="relative z-10 flex w-full flex-col items-center">
        <h1
          ref={headingRef}
          className="font-display font-black uppercase leading-[0.88] tracking-[-0.04em] text-center"
          style={{
            fontSize: "clamp(3.5rem, 11vw, 10rem)",
            perspective: "600px",
          }}
        >
          <span className="hero-line block">Ghost UI</span>
        </h1>
      </div>
    </section>
  );
}
