'use client';

import { useEffect, useRef, useCallback } from 'react';

type Particle = {
  x: number; y: number;
  baseX: number; baseY: number;
  vx: number; vy: number;
  size: number;
  opacity: number;
  hue: number;
};

export default function OrderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const mouseRef = useRef({ x: -999, y: -999 });
  const particlesRef = useRef<Particle[]>([]);

  const isMobile = () =>
    typeof window !== 'undefined' &&
    (window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent));

  const makeParticles = useCallback((w: number, h: number) => {
    particlesRef.current = Array.from({ length: 100 }, () => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      return {
        x, y,
        baseX: x, baseY: y,
        vx: 0, vy: 0,
        size: Math.random() * 2 + 0.8,
        opacity: Math.random() * 0.5 + 0.2,
        hue: 38 + Math.random() * 18,
      };
    });
  }, []);

  useEffect(() => {
    if (isMobile()) return; // на мобильном — ничего не запускаем

    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      makeParticles(canvas.width, canvas.height);
    };
    setSize();
    window.addEventListener('resize', setSize);

    const REPEL_RADIUS = 110;
    const REPEL_STRENGTH = 4;
    const FRICTION = 0.82;
    const RETURN = 0.06;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: mx, y: my } = mouseRef.current;

      for (const p of particlesRef.current) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < REPEL_RADIUS && dist > 0) {
          const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
          p.vx += (dx / dist) * force * REPEL_STRENGTH;
          p.vy += (dy / dist) * force * REPEL_STRENGTH;
        }

        p.vx += (p.baseX - p.x) * RETURN;
        p.vy += (p.baseY - p.y) * RETURN;
        p.vx *= FRICTION;
        p.vy *= FRICTION;

        p.x += p.vx;
        p.y += p.vy;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 5);
        grad.addColorStop(0, `hsla(${p.hue}, 85%, 72%, ${p.opacity * 0.4})`);
        grad.addColorStop(1, `hsla(${p.hue}, 85%, 72%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 90%, 93%, ${p.opacity})`;
        ctx.fill();
      }
    };

    tick();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', setSize);
    };
  }, [makeParticles]);

  useEffect(() => {
    if (isMobile()) return;
    const onMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  if (isMobile()) return null; // рендерим ничего — фон задаётся через CSS на родителе

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}