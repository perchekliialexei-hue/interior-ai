'use client';
import { useEffect, useRef, useCallback } from 'react';

interface HeroIntroProps {
  onDone: () => void;
}

export default function HeroIntro({ onDone }: HeroIntroProps) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    cancelAnimationFrame(rafRef.current);
    onDone();
  }, [onDone]);

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;

    let W = 0, H = 0;
    function sz() {
      W = cv!.width = cv!.offsetWidth;
      H = cv!.height = cv!.offsetHeight;
    }

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

    // ── SCENE ──────────────────────────────────────────────
    const LAMP1 = { x: 0.28, y: 0.08, cord: 0.20 }; // broken
    const LAMP2 = { x: 0.62, y: 0.06, cord: 0.24 }; // hero lamp
    const LAMP3 = { x: 0.14, y: 0.10, cord: 0.16 }; // chain
    const LAMP4 = { x: 0.84, y: 0.08, cord: 0.20 }; // chain
    const LAMPS = [LAMP1, LAMP2, LAMP3, LAMP4];

    // Firefly waypoints
    const PATH = [
      { x: 0.06, y: 0.92 },
      { x: 0.14, y: 0.68 },
      { x: 0.22, y: 0.44 },
      { x: 0.27, y: 0.26 },
      { x: 0.28, y: 0.18 }, // near lamp1 bulb
      { x: 0.28, y: 0.30 }, // bounce
      { x: 0.34, y: 0.52 },
      { x: 0.40, y: 0.70 }, // couch
      { x: 0.38, y: 0.74 }, // at couch
      { x: 0.46, y: 0.62 },
      { x: 0.54, y: 0.44 },
      { x: 0.60, y: 0.26 },
      { x: 0.62, y: 0.16 }, // near lamp2 bulb
      { x: 0.62, y: 0.10 }, // inside lamp2
    ];

    const TL = {
      ffAppear:    0.6,
      toLamp1:     2.4,
      flicker:     3.1,
      lamp1Fail:   3.9,
      toCouch:     5.1,
      couchMsg:    5.7,
      leaveCouch:  6.7,
      toLamp2:     8.1,
      ignite:      8.7,
      chain:       10.0,
      heroReveal:  11.6,
    };

    // State
    const lampBright = [0, 0, 0, 0];
    const lampSwing  = LAMPS.map(() => ({ a: 0, v: 0, phase: Math.random() * Math.PI * 2 }));
    const trail: { x: number; y: number }[] = [];

    // ── CATMULL-ROM ────────────────────────────────────────
    function catmull(pts: typeof PATH, i0: number, i1: number, t: number) {
      const n = pts.length - 1;
      const fi = i0 + t * (i1 - i0);
      const i = Math.min(Math.floor(fi), n - 1);
      const lt = fi - i;
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[Math.min(n, i + 1)];
      const p3 = pts[Math.min(n, i + 2)];
      const t2 = lt * lt, t3 = lt * lt * lt;
      return {
        x: 0.5 * ((2*p1.x) + (-p0.x+p2.x)*lt + (2*p0.x-5*p1.x+4*p2.x-p3.x)*t2 + (-p0.x+3*p1.x-3*p2.x+p3.x)*t3),
        y: 0.5 * ((2*p1.y) + (-p0.y+p2.y)*lt + (2*p0.y-5*p1.y+4*p2.y-p3.y)*t2 + (-p0.y+3*p1.y-3*p2.y+p3.y)*t3),
      };
    }

    function getFFPos(t: number) {
      if (t < TL.ffAppear) return { ...PATH[0] };
      if (t < TL.toLamp1)  return catmull(PATH, 0, 4, easeOut((t - TL.ffAppear) / (TL.toLamp1 - TL.ffAppear)));
      if (t < TL.lamp1Fail) return { ...PATH[4] };
      if (t < TL.toCouch)  return catmull(PATH, 4, 8, easeOut((t - TL.lamp1Fail) / (TL.toCouch - TL.lamp1Fail)));
      if (t < TL.leaveCouch) return { ...PATH[8] };
      if (t < TL.toLamp2)  return catmull(PATH, 8, 13, easeOut((t - TL.leaveCouch) / (TL.toLamp2 - TL.leaveCouch)));
      return { ...PATH[13] };
    }

    // ── DRAW HELPERS ───────────────────────────────────────
    function drawBg(t: number) {
      const roomA = clamp((t - TL.chain) / 2.5, 0, 1);
      const r = Math.round(lerp(4, 16, roomA));
      const g = Math.round(lerp(3, 12, roomA));
      const b = Math.round(lerp(2, 8,  roomA));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, W, H);

      if (roomA > 0) {
        const wg = ctx.createLinearGradient(0, 0, 0, H * 0.55);
        wg.addColorStop(0, `rgba(32,24,13,${roomA * 0.85})`);
        wg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, W, H);

        const fg = ctx.createLinearGradient(0, H * 0.68, 0, H);
        fg.addColorStop(0, 'rgba(0,0,0,0)');
        fg.addColorStop(1, `rgba(26,18,9,${roomA * 0.7})`);
        ctx.fillStyle = fg;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawBokeh(t: number) {
      const a = clamp((t - TL.chain) / 3, 0, 1);
      if (a <= 0) return;
      const blobs = [
        { cx:0.57, cy:0.76, rx:0.25, ry:0.10, r:172, g:178, b:188, ba:0.15 },
        { cx:0.19, cy:0.82, rx:0.11, ry:0.09, r:152, g:118, b:72,  ba:0.13 },
        { cx:0.37, cy:0.87, rx:0.13, ry:0.06, r:175, g:140, b:80,  ba:0.19 },
        { cx:0.81, cy:0.56, rx:0.08, ry:0.21, r:44,  g:80,  b:42,  ba:0.20 },
        { cx:0.09, cy:0.46, rx:0.07, ry:0.25, r:36,  g:70,  b:34,  ba:0.16 },
        { cx:0.49, cy:0.73, rx:0.05, ry:0.04, r:98,  g:115, b:145, ba:0.22 },
        { cx:0.63, cy:0.71, rx:0.05, ry:0.04, r:182, g:138, b:78,  ba:0.20 },
      ];
      blobs.forEach(b => {
        const cx = b.cx * W, cy = b.cy * H, rx = b.rx * W, ry = b.ry * H;
        [3.5, 2.0, 1.1].forEach((sc, li) => {
          const la = [0.20, 0.32, 0.38][li];
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx * sc);
          grd.addColorStop(0,   `rgba(${b.r},${b.g},${b.b},${a * la * b.ba / 0.2})`);
          grd.addColorStop(0.45,`rgba(${b.r},${b.g},${b.b},${a * la * b.ba / 0.4})`);
          grd.addColorStop(1,   'rgba(0,0,0,0)');
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1, ry / rx);
          ctx.fillStyle = grd;
          ctx.beginPath(); ctx.arc(0, 0, rx * sc, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
      });
    }

    function drawLamp(lamp: typeof LAMP1, bright: number, flickerMul: number, swingA: number) {
      const lx = lamp.x * W;
      const bulbY = (lamp.y + lamp.cord) * H;
      const topY  = lamp.y * H;

      // swing offset
      const ox = Math.sin(swingA) * lamp.cord * H * 0.5;
      const bx = lx + ox;

      // cord
      ctx.strokeStyle = `rgba(55,42,24,${0.55 + bright * 0.35})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(lx, topY); ctx.lineTo(bx, bulbY - 16); ctx.stroke();

      // socket
      ctx.fillStyle = '#0e0b07';
      ctx.beginPath(); ctx.arc(bx, bulbY - 15, 5, 0, Math.PI * 2); ctx.fill();

      const ef = bright * (1 + flickerMul * 0.45);
      if (ef > 0.02) {
        // halo
        const hR = 105 * ef;
        const hg = ctx.createRadialGradient(bx, bulbY, 0, bx, bulbY, hR);
        hg.addColorStop(0,    `rgba(255,212,112,${0.22 * ef})`);
        hg.addColorStop(0.28, `rgba(255,183,70,${0.11 * ef})`);
        hg.addColorStop(0.65, `rgba(238,152,42,${0.04 * ef})`);
        hg.addColorStop(1,    'rgba(228,132,22,0)');
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(bx, bulbY, hR, 0, Math.PI * 2); ctx.fill();

        // bokeh rings
        ctx.save(); ctx.globalAlpha = 0.07 * ef;
        ctx.strokeStyle = 'rgba(255,225,155,0.65)'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(bx, bulbY, 40, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(bx, bulbY, 52, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // floor cone (swings with lamp)
        ctx.save(); ctx.globalAlpha = 0.055 * ef;
        const cg = ctx.createRadialGradient(bx, H, 0, bx, bulbY, W * 0.3);
        cg.addColorStop(0, 'rgba(255,202,105,0.9)'); cg.addColorStop(1, 'rgba(255,202,105,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.moveTo(bx - 22, bulbY);
        ctx.lineTo(bx - W * 0.22, H);
        ctx.lineTo(bx + W * 0.22, H);
        ctx.lineTo(bx + 22, bulbY);
        ctx.fill();
        ctx.restore();

        // floor hotspot
        const fg = ctx.createRadialGradient(bx, H * 0.97, 0, bx, H * 0.97, 58 * ef);
        fg.addColorStop(0, `rgba(255,202,105,${0.10 * ef})`);
        fg.addColorStop(1, 'rgba(255,202,105,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(bx, H * 0.97, 58 * ef, 18 * ef, 0, 0, Math.PI * 2); ctx.fill();
      }

      // glass globe
      const gr = ctx.createRadialGradient(bx - 5, bulbY - 6, 1, bx, bulbY, 19);
      if (ef > 0.02) {
        gr.addColorStop(0,   `rgba(255,255,232,${Math.min(1, ef * 1.1)})`);
        gr.addColorStop(0.3, `rgba(255,226,148,${ef * 0.9})`);
        gr.addColorStop(0.7, `rgba(212,162,68,${ef * 0.62})`);
        gr.addColorStop(1,   `rgba(172,122,38,${ef * 0.26})`);
      } else {
        gr.addColorStop(0, 'rgba(52,42,26,0.55)');
        gr.addColorStop(1, 'rgba(26,20,10,0.42)');
      }
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(bx, bulbY, 19, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = ef > 0.02 ? `rgba(255,240,192,${0.22 * ef})` : 'rgba(68,55,34,0.22)';
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(bx, bulbY, 19, 0, Math.PI * 2); ctx.stroke();

      // Edison filament
      if (ef > 0.02) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, ef * 1.15);
        ctx.strokeStyle = 'rgba(255,235,170,0.96)';
        ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(255,212,108,0.85)'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(bx - 5, bulbY + 5);
        ctx.quadraticCurveTo(bx - 2, bulbY - 4, bx, bulbY);
        ctx.quadraticCurveTo(bx + 2, bulbY + 4, bx + 5, bulbY - 5);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawFirefly(t: number) {
      if (t < TL.ffAppear) return;
      const fadeIn  = clamp((t - TL.ffAppear) / 0.45, 0, 1);
      const fadeOut = 1 - clamp((t - TL.ignite) / 0.75, 0, 1);
      const alpha = fadeIn * fadeOut;
      if (alpha <= 0.01) return;

      const pos = getFFPos(t);
      const wx = Math.sin(t * 3.8 + 1.1) * 3.5;
      const wy = Math.cos(t * 2.85) * 2.8;
      const rx = pos.x * W + wx;
      const ry = pos.y * H + wy;

      trail.push({ x: rx, y: ry });
      if (trail.length > 30) trail.shift();

      trail.forEach((pt, i) => {
        const tf = i / trail.length;
        ctx.fillStyle = `rgba(175,252,135,${tf * 0.32 * alpha})`;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, tf * 3.2, 0, Math.PI * 2); ctx.fill();
      });

      const gg = ctx.createRadialGradient(rx, ry, 0, rx, ry, 24);
      gg.addColorStop(0,   `rgba(195,252,142,${0.30 * alpha})`);
      gg.addColorStop(0.4, `rgba(145,228,75,${0.12 * alpha})`);
      gg.addColorStop(1,   'rgba(95,198,45,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(rx, ry, 24, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.shadowColor = `rgba(175,252,120,${0.85 * alpha})`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(218,255,175,${alpha})`;
      ctx.beginPath(); ctx.arc(rx, ry, 3.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    function drawDustText(t: number) {
      const showA = clamp((t - TL.toCouch) / 0.6, 0, 1)
                  * (1 - clamp((t - TL.leaveCouch) / 0.5, 0, 1));
      if (showA <= 0.01) return;

      const cx = 0.42 * W, cy = 0.70 * H;
      ctx.save();

      // couch silhouette hint
      ctx.globalAlpha = showA * 0.14;
      const cg = ctx.createRadialGradient(cx, cy + 38, 0, cx, cy + 38, W * 0.24);
      cg.addColorStop(0, 'rgba(158,155,150,0.22)'); cg.addColorStop(1, 'rgba(158,155,150,0)');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.ellipse(cx, cy + 38, W * 0.24, H * 0.09, 0, 0, Math.PI * 2); ctx.fill();

      // dust finger writing
      ctx.globalAlpha = showA * 0.40;
      ctx.font = `italic ${Math.round(H * 0.026)}px Georgia, serif`;
      ctx.fillStyle = 'rgba(215,208,198,1)';
      ctx.textAlign = 'center';
      ctx.translate(cx, cy);
      ctx.rotate(-0.022);
      ctx.fillText('никто не видит потенциал', 0, 0);
      ctx.strokeStyle = 'rgba(215,208,198,0.28)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-120, 6); ctx.lineTo(122, 5); ctx.stroke();
      ctx.restore();
    }

    function drawWallText(t: number) {
      const showA = clamp((t - TL.flicker) / 0.5, 0, 1)
                  * (1 - clamp((t - TL.lamp1Fail) / 0.55, 0, 1));
      if (showA <= 0.01) return;

      const lx = LAMP1.x * W;
      const ly = (LAMP1.y + LAMP1.cord * 0.45) * H;
      ctx.save();
      ctx.globalAlpha = showA * 0.35;
      ctx.font = `${Math.round(H * 0.022)}px Georgia, serif`;
      ctx.fillStyle = 'rgba(232,222,208,1)';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px';
      ctx.fillText('ПРЕДСТАВЛЯЕМ НАШУ ИДЕЮ', lx, ly - 18);
      ctx.restore();
    }

    // ── UPDATE ─────────────────────────────────────────────
    function updateLamps(t: number) {
      // Lamp 1 — flicker then die
      if (t >= TL.toLamp1 && t < TL.flicker) {
        lampBright[0] = ((t - TL.toLamp1) / (TL.flicker - TL.toLamp1)) * 0.20;
      } else if (t >= TL.flicker && t < TL.lamp1Fail) {
        const ft = (t - TL.flicker) / (TL.lamp1Fail - TL.flicker);
        lampBright[0] = (0.20 + (Math.sin(t * 26) * 0.5 + 0.5) * 0.48) * (1 - ft * 0.85);
      } else if (t >= TL.lamp1Fail) {
        lampBright[0] = Math.max(0, 0.04 - clamp((t - TL.lamp1Fail) / 0.4, 0, 1) * 0.04);
      }

      // Lamp 2 — main ignition
      if (t >= TL.ignite) {
        lampBright[1] = ease(clamp((t - TL.ignite) / 1.5, 0, 1)) * 0.96;
      }

      // Chain lamps
      if (t >= TL.chain)       lampBright[2] = ease(clamp((t - TL.chain) / 0.9, 0, 1)) * 0.84;
      if (t >= TL.chain + 0.65) lampBright[3] = ease(clamp((t - TL.chain - 0.65) / 0.9, 0, 1)) * 0.80;
    }

    function updateSwing(t: number) {
      LAMPS.forEach((_, i) => {
        const s = lampSwing[i];
        const target = Math.sin(t * 0.55 + s.phase) * 0.008;
        s.v += (target - s.a) * 0.022;
        s.v *= 0.93;
        s.a += s.v;
      });
    }

    // ── FRAME LOOP ─────────────────────────────────────────
    function frame(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const T = (ts - startRef.current) / 1000;

      sz();
      ctx.clearRect(0, 0, W, H);

      updateLamps(T);
      updateSwing(T);

      const flicker1 = (T >= TL.flicker && T < TL.lamp1Fail)
        ? (Math.sin(T * 26) * 0.5 + 0.5) : 0;

      drawBg(T);
      drawBokeh(T);
      drawLamp(LAMP3, lampBright[2], 0, lampSwing[2].a);
      drawLamp(LAMP4, lampBright[3], 0, lampSwing[3].a);
      drawLamp(LAMP1, lampBright[0], flicker1, lampSwing[0].a);
      drawLamp(LAMP2, lampBright[1], 0, lampSwing[1].a);
      drawWallText(T);
      drawDustText(T);
      drawFirefly(T);

      // trigger hero reveal
      if (T >= TL.heroReveal && !doneRef.current) {
        doneRef.current = true;
        onDone();
      }

      rafRef.current = requestAnimationFrame(frame);
    }

    sz();
    window.addEventListener('resize', sz);
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', sz);
    };
  }, [onDone]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas ref={cvRef} className="absolute inset-0 w-full h-full" />
      <button
        onClick={skip}
        className="absolute bottom-5 right-5 z-20 text-[11px] text-white/20 hover:text-white/50 transition-colors border border-white/8 rounded px-2 py-1"
        style={{ opacity: 1 }}
      >
        пропустить →
      </button>
    </div>
  );
}