"use client";

import { useEffect, useRef } from "react";

const MAX_POINTS = 2000;
const BASE_OPACITY = 0.15;
const FADE_SEGMENTS = 32;
const ANGLE_PER_MS = 0.0012; // fixed speed regardless of frame rate
const TRANSITION_MS = 800; // duration of lerp between shapes

// Curated sequence: builds from simple → complex → resolves back
// Each entry: [r, d, revolution angle]
const SEQUENCE: [number, number, number][] = [
  [0.5, 0.35, 6 * Math.PI], // 1 petal — gentle ellipse opener
  [1 / 3, 0.25, 6 * Math.PI], // 2 petals — symmetric, tighter
  [0.25, 0.2, 6 * Math.PI], // 3 petals — opening up
  [0.2, 0.16, 6 * Math.PI], // 4 petals — building density
  [0.3, 0.27, 6 * Math.PI], // 7 petals — peak complexity
  [0.4, 0.32, 6 * Math.PI], // 3 petals — unwinding
  [1 / 3, 0.15, 6 * Math.PI], // 2 petals tight — settling
  [0.25, 0.22, 6 * Math.PI], // 3 petals — gentle resolve
];

let seqIndex = 0;

function pickShape() {
  const entry = SEQUENCE[seqIndex];
  seqIndex = (seqIndex + 1) % SEQUENCE.length;
  return { r: entry[0], d: entry[1], revolution: entry[2] };
}

function resolveColor(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
}

export function CycloidCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- State ---
    let prevShape = pickShape();
    let nextShape = prevShape;
    let angle = 0;
    let shapeStartAngle = 0;
    let transitionElapsed = TRANSITION_MS; // start fully settled

    const xs = new Float32Array(MAX_POINTS);
    const ys = new Float32Array(MAX_POINTS);
    let head = 0;
    let count = 0;

    let color = resolveColor();
    let rafId = 0;
    let lastTime = 0;

    // --- Sizing ---
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // --- Theme ---
    const mo = new MutationObserver(() => {
      color = resolveColor();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // --- Draw loop ---
    function draw(time: number) {
      if (!canvas || !ctx) return;

      // Delta time for fixed speed
      if (lastTime === 0) lastTime = time;
      const dt = Math.min(time - lastTime, 50); // cap to avoid jumps
      lastTime = time;

      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;

      // Check if we completed a full shape — begin transition to next
      const activeRevolution = nextShape.revolution;
      if (
        transitionElapsed >= TRANSITION_MS &&
        angle - shapeStartAngle >= activeRevolution
      ) {
        prevShape = nextShape;
        nextShape = pickShape();
        shapeStartAngle = angle;
        transitionElapsed = 0;
      }

      // Advance transition timer
      transitionElapsed = Math.min(transitionElapsed + dt, TRANSITION_MS);

      // Interpolate params: brief lerp at start of each shape, then locked
      const t = Math.min(transitionElapsed / TRANSITION_MS, 1);
      // Smooth ease-in-out
      const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const r = prevShape.r + (nextShape.r - prevShape.r) * ease;
      const d = prevShape.d + (nextShape.d - prevShape.d) * ease;

      // Advance angle at fixed rate
      const deltaAngle = ANGLE_PER_MS * dt;

      const R = 1;
      const x = (R - r) * Math.cos(angle) + d * Math.cos(((R - r) / r) * angle);
      const y = (R - r) * Math.sin(angle) - d * Math.sin(((R - r) / r) * angle);

      xs[head] = x;
      ys[head] = y;
      head = (head + 1) % MAX_POINTS;
      if (count < MAX_POINTS) count++;

      angle += deltaAngle;

      // Clear
      ctx.clearRect(0, 0, cssW, cssH);

      // Scale: fit normalized coords into a centered square
      const drawSize = Math.min(cssW, cssH) * 1.8;
      const scale = drawSize / 4;
      const cx = cssW / 2;
      const cy = cssH / 2;

      // Draw trail as overlapping segments with graduated alpha
      const oldest = count < MAX_POINTS ? 0 : head;
      const segSize = Math.ceil(count / FADE_SEGMENTS);

      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = color;

      for (let s = 0; s < FADE_SEGMENTS; s++) {
        const startI = s * segSize;
        const endI = Math.min((s + 1) * segSize, count - 1);
        if (startI >= count) break;

        // Oldest segment = 0 alpha, newest = full alpha
        const progress = (s + 0.5) / FADE_SEGMENTS;
        ctx.globalAlpha = BASE_OPACITY * progress;

        ctx.beginPath();

        // Start from 1 point before for overlap (no gaps between segments)
        const overlapStart = s === 0 ? startI : startI - 1;

        for (let i = overlapStart; i <= endI; i++) {
          const idx = (oldest + i) % MAX_POINTS;
          const px = cx + xs[idx] * scale;
          const py = cy + ys[idx] * scale;
          if (i === overlapStart) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 h-full w-full">
      <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--foreground)] opacity-[0.08]" />
      <div className="absolute top-1/2 left-0 w-full h-px bg-[var(--foreground)] opacity-[0.08]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
