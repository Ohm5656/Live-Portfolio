"use client";

import { useEffect, useMemo, useRef } from 'react';

interface PointerState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
}

interface Sparkle {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
  driftX: number;
  driftY: number;
  color: string;
}

const SPARKLE_COLORS = [
  '252, 211, 77',
  '52, 211, 153',
  '148, 163, 184',
  '96, 165, 250',
];

function createSparkles(count: number): Sparkle[] {
  return Array.from({ length: count }, (_, index) => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.7 + Math.random() * 1.9,
    phase: Math.random() * Math.PI * 2,
    speed: 0.0004 + Math.random() * 0.0011,
    driftX: (Math.random() - 0.5) * 10,
    driftY: (Math.random() - 0.5) * 10,
    color: SPARKLE_COLORS[index % SPARKLE_COLORS.length],
  }));
}

export function InteractiveMarketBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sparkles = useMemo(() => createSparkles(110), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pointer: PointerState = {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.42,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.42,
      active: false,
    };

    let width = 0;
    let height = 0;
    let animationId = 0;
    let lastFrame = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.active = true;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
      pointer.targetX = width * 0.5;
      pointer.targetY = height * 0.42;
    };

    const drawSparkle = (sparkle: Sparkle, time: number) => {
      const motion = reducedMotion ? 0 : time;
      const twinkle = 0.45 + Math.sin(motion * sparkle.speed + sparkle.phase) * 0.35;
      const pointerDistance = Math.hypot(pointer.x - sparkle.x * width, pointer.y - sparkle.y * height);
      const pointerLift = pointer.active ? Math.max(0, 1 - pointerDistance / 220) : 0;
      const parallaxX = (pointer.x - width * 0.5) * 0.012 * pointerLift;
      const parallaxY = (pointer.y - height * 0.5) * 0.012 * pointerLift;
      const x = sparkle.x * width + Math.sin(motion * sparkle.speed + sparkle.phase) * sparkle.driftX + parallaxX;
      const y = sparkle.y * height + Math.cos(motion * sparkle.speed + sparkle.phase) * sparkle.driftY + parallaxY;
      const glow = sparkle.radius * (2.8 + pointerLift * 2);
      const alpha = Math.min(0.82, 0.18 + twinkle * 0.38 + pointerLift * 0.32);

      const gradient = context.createRadialGradient(x, y, 0, x, y, glow);
      gradient.addColorStop(0, `rgba(${sparkle.color}, ${alpha})`);
      gradient.addColorStop(0.45, `rgba(${sparkle.color}, ${alpha * 0.22})`);
      gradient.addColorStop(1, `rgba(${sparkle.color}, 0)`);

      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, glow, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = `rgba(${sparkle.color}, ${Math.min(0.95, alpha + 0.16)})`;
      context.beginPath();
      context.arc(x, y, sparkle.radius + pointerLift * 0.9, 0, Math.PI * 2);
      context.fill();
    };

    const drawPointerGlow = () => {
      if (!pointer.active) {
        return;
      }

      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 190);
      gradient.addColorStop(0, 'rgba(252, 211, 77, 0.10)');
      gradient.addColorStop(0.4, 'rgba(52, 211, 153, 0.035)');
      gradient.addColorStop(1, 'rgba(10, 17, 40, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(pointer.x, pointer.y, 190, 0, Math.PI * 2);
      context.fill();
    };

    const render = (time: number) => {
      if (time - lastFrame < 33) {
        animationId = requestAnimationFrame(render);
        return;
      }

      lastFrame = time;
      pointer.x += (pointer.targetX - pointer.x) * 0.08;
      pointer.y += (pointer.targetY - pointer.y) * 0.08;

      context.clearRect(0, 0, width, height);
      drawPointerGlow();
      sparkles.forEach((sparkle) => drawSparkle(sparkle, time));

      animationId = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerleave', handlePointerLeave);
    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [sparkles]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-75"
    />
  );
}
