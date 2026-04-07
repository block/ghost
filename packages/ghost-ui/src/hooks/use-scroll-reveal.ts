"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealOptions {
  y?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
}

export function useScrollReveal<T extends HTMLElement>(
  options: ScrollRevealOptions = {},
) {
  const ref = useRef<T>(null);
  const {
    y = 40,
    opacity = 0,
    duration = 0.8,
    delay = 0,
    ease = "power2.out",
    start = "top 90%",
  } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.set(el, { y, opacity, transition: "none" });
    const trigger = ScrollTrigger.create({
      trigger: el,
      start,
      once: true,
      onEnter: () => {
        gsap.to(el, {
          y: 0,
          opacity: 1,
          duration,
          delay,
          ease,
          onComplete: () => {
            gsap.set(el, { clearProps: "transform,opacity,transition" });
          },
        });
      },
    });

    return () => trigger.kill();
  }, [y, opacity, duration, delay, ease, start]);

  return ref;
}

export function useStaggerReveal<T extends HTMLElement>(
  selector: string,
  options: {
    stagger?: number;
    y?: number;
    duration?: number;
    ease?: string;
    start?: string;
  } = {},
) {
  const ref = useRef<T>(null);
  const {
    stagger = 0.06,
    y = 30,
    duration = 0.7,
    ease = "power2.out",
    start = "top 90%",
  } = options;

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const children = container.querySelectorAll(selector);
    if (children.length === 0) return;

    gsap.set(children, { y, opacity: 0, transition: "none" });
    const trigger = ScrollTrigger.create({
      trigger: container,
      start,
      once: true,
      onEnter: () => {
        gsap.to(children, {
          y: 0,
          opacity: 1,
          duration,
          stagger,
          ease,
          onComplete: () => {
            gsap.set(children, { clearProps: "transform,opacity,transition" });
          },
        });
      },
    });

    return () => trigger.kill();
  }, [selector, stagger, y, duration, ease, start]);

  return ref;
}
