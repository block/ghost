import { gsap } from "gsap";
import { useEffect, useRef } from "react";
import SplitType from "split-type";

// Utility debounce function
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number,
): T => {
  let timerId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timerId);
    timerId = setTimeout(() => {
      func(...args);
    }, delay);
  }) as T;
};

interface TextSplitterOptions {
  resizeCallback?: () => void;
  splitTypeTypes?: ("lines" | "words" | "chars")[];
}

// Class to split text into lines, words, and characters for animation
export class TextSplitter {
  textElement: HTMLElement;
  onResize: (() => void) | null;
  splitText: SplitType;
  previousContainerWidth: number | null = null;

  constructor(textElement: HTMLElement, options: TextSplitterOptions = {}) {
    if (!textElement || !(textElement instanceof HTMLElement)) {
      throw new Error("Invalid text element provided.");
    }

    const { resizeCallback, splitTypeTypes } = options;
    this.textElement = textElement;
    this.onResize =
      typeof resizeCallback === "function" ? resizeCallback : null;

    const splitOptions = splitTypeTypes ? { types: splitTypeTypes } : {};
    this.splitText = new SplitType(this.textElement, splitOptions);

    if (this.onResize) {
      this.initResizeObserver();
    }
  }

  initResizeObserver() {
    const resizeObserver = new ResizeObserver(
      debounce(
        (entries: ResizeObserverEntry[]) => this.handleResize(entries),
        100,
      ),
    );
    resizeObserver.observe(this.textElement);
  }

  handleResize(entries: ResizeObserverEntry[]) {
    const [{ contentRect }] = entries;
    const width = Math.floor(contentRect.width);

    if (this.previousContainerWidth && this.previousContainerWidth !== width) {
      this.splitText.split({ types: ["chars"] });
      this.onResize?.();
    }

    this.previousContainerWidth = width;
  }

  revert() {
    return this.splitText.revert();
  }

  getLines(): HTMLElement[] {
    return this.splitText.lines ?? [];
  }

  getWords(): HTMLElement[] {
    return this.splitText.words ?? [];
  }

  getChars(): HTMLElement[] {
    return this.splitText.chars ?? [];
  }
}

// Text animation class for hover effects
const lettersAndSymbols = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "!",
  "@",
  "#",
  "$",
  "%",
  "^",
  "&",
  "*",
  "-",
  "_",
  "+",
  "=",
  ";",
  ":",
  "<",
  ">",
  ",",
];

export class TextAnimator {
  textElement: HTMLElement;
  splitter!: TextSplitter;
  originalChars!: string[];

  constructor(textElement: HTMLElement) {
    if (!textElement || !(textElement instanceof HTMLElement)) {
      throw new Error("Invalid text element provided.");
    }

    this.textElement = textElement;
    this.splitText();
  }

  private splitText() {
    this.splitter = new TextSplitter(this.textElement, {
      splitTypeTypes: ["words", "chars"],
    });
    this.originalChars = this.splitter.getChars().map((char) => char.innerHTML);
  }

  animate() {
    this.reset();

    const chars = this.splitter.getChars();

    chars.forEach((char, position) => {
      const initialHTML = char.innerHTML;
      let repeatCount = 0;

      gsap.fromTo(
        char,
        { opacity: 1 },
        {
          duration: 0.03,
          onStart: () => {
            gsap.set(char, { fontFamily: "Geist Mono" });
          },
          onComplete: () => {
            gsap.set(char, {
              innerHTML: initialHTML,
              delay: 0.03,
              fontFamily: "", // Reset to default font
              opacity: 1, // Ensure full opacity is restored
            });
          },
          repeat: 3,
          onRepeat: () => {
            repeatCount++;
            if (repeatCount === 1) {
              gsap.set(char, { opacity: 0.3 }); // Keep some visibility during scramble
            }
          },
          repeatRefresh: true,
          repeatDelay: 0.02,
          delay: position * 0.05,
          innerHTML: () =>
            lettersAndSymbols[
              Math.floor(Math.random() * lettersAndSymbols.length)
            ],
          opacity: 1,
        },
      );
    });
  }

  reset() {
    const chars = this.splitter.getChars();
    chars.forEach((char, index) => {
      gsap.killTweensOf(char);
      char.innerHTML = this.originalChars[index];
    });
  }
}

interface UseTextAnimatorProps {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  autoAnimate?: boolean;
}

export function useTextAnimator({
  threshold = 0.5,
  root = null,
  rootMargin = "0px",
  autoAnimate = false,
}: UseTextAnimatorProps = {}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const animator = useRef<TextAnimator | null>(null);

  useEffect(() => {
    if (elementRef.current) {
      animator.current = new TextAnimator(elementRef.current);

      if (autoAnimate) {
        animator.current.animate();
      }
    }
  }, [autoAnimate]);

  useEffect(() => {
    if (!elementRef.current || autoAnimate) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && animator.current) {
            animator.current.animate();
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      },
    );

    observer.observe(elementRef.current);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, autoAnimate]);

  return elementRef;
}
