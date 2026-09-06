"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#f43f5e", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];
const PARTICLE_COUNT = 140;
const DURATION_MS = 2600;

type Particle = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
};

/**
 * A one-shot, dependency-free confetti burst covering the viewport. No
 * canvas-confetti or similar lib in package.json, and this is a small enough
 * effect to just draw by hand -- same call as shareSnapshot.ts's canvas use.
 * Mounts a fixed full-screen canvas, animates particles falling with a bit
 * of drift and spin for ~2.6s, then calls `onDone` so the caller can unmount
 * it (there's no visible "off" state -- it's meant to be conditionally
 * rendered, not hidden).
 */
export default function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      onDoneRef.current();
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * window.innerHeight * 0.3,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 8,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vx: -1.5 + Math.random() * 3,
      vy: 2 + Math.random() * 3,
      rotation: Math.random() * 360,
      vr: -8 + Math.random() * 16,
    }));

    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rotation += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (now - start < DURATION_MS) {
        frame = requestAnimationFrame(tick);
      } else {
        onDoneRef.current();
      }
    }
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50" />;
}
