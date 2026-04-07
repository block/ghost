"use client";

import { useEffect, useRef } from "react";

const MAX_POINTS = 2000;
const BASE_OPACITY = 0.15;
const FADE_SEGMENTS = 32;
const ANGLE_PER_MS = 0.0008; // fixed speed regardless of frame rate
const TRANSITION_MS = 800; // duration of lerp between shapes

// Each entry: [r value, angle for one full closed shape]
const RATIO_TABLE: [number, number][] = [
  [0.2, 2 * Math.PI], // 4 petals
  [0.25, 2 * Math.PI], // 3 petals
  [0.3, 6 * Math.PI], // 7 petals over 3 revs
  [1 / 3, 2 * Math.PI], // 2 petals
  [0.4, 4 * Math.PI], // 3 petals over 2 revs
  [0.5, 2 * Math.PI], // 1 petal (ellipse-like)
];

function pickShape() {
  const entry = RATIO_TABLE[Math.floor(Math.random() * RATIO_TABLE.length)];
  const r = entry[0];
  const revolution = entry[1];
  const d = r * (0.3 + Math.random() * 0.7);
  return { r, d, revolution };
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
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}
