'use client';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── helpers ─────────────────────────────────────────────────────────────────
const hex = (s: string | undefined, fallback: number): number =>
  s ? parseInt(s.replace('#', ''), 16) : fallback;

const mat = (color: number, roughness = 0.75, metalness = 0.0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

// ── Процедурная текстура дерева ───────────────────────────────────────────────
function woodMat(color: number, roughness = 0.72): THREE.MeshStandardMaterial {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const r = (color >> 16) & 0xff;
  const g = (color >> 8)  & 0xff;
  const b =  color        & 0xff;

  // Базовый фон
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  // Волокна дерева — горизонтальные полосы с шумом
  for (let i = 0; i < 40; i++) {
    const y = (i / 40) * size;
    const shade = (Math.random() - 0.5) * 22;
    const nr = Math.max(0, Math.min(255, r + shade));
    const ng = Math.max(0, Math.min(255, g + shade * 0.8));
    const nb = Math.max(0, Math.min(255, b + shade * 0.5));
    ctx.strokeStyle = `rgba(${nr},${ng},${nb},0.55)`;
    ctx.lineWidth = 1.5 + Math.random() * 3;
    ctx.beginPath();
    ctx.moveTo(0, y + Math.sin(i) * 3);
    // Лёгкий изгиб волокна
    ctx.bezierCurveTo(
      size * 0.25, y + (Math.random() - 0.5) * 6,
      size * 0.75, y + (Math.random() - 0.5) * 6,
      size,        y + Math.sin(i + 1) * 3
    );
    ctx.stroke();
  }

  // Тонкие тёмные прожилки
  for (let i = 0; i < 8; i++) {
    const y = Math.random() * size;
    ctx.strokeStyle = `rgba(${Math.max(0,r-30)},${Math.max(0,g-25)},${Math.max(0,b-20)},0.3)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size*0.3, y+(Math.random()-0.5)*12, size*0.7, y+(Math.random()-0.5)*12, size, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);

  return new THREE.MeshStandardMaterial({ map: texture, roughness, metalness: 0.0 });
}

// ── Процедурная текстура ткани ────────────────────────────────────────────────
function fabricMat(color: number, roughness = 0.92): THREE.MeshStandardMaterial {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const r = (color >> 16) & 0xff;
  const g = (color >> 8)  & 0xff;
  const b =  color        & 0xff;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);

  // Переплетение нитей
  for (let i = 0; i < size; i += 4) {
    const shade = i % 8 === 0 ? -12 : 8;
    ctx.fillStyle = `rgba(${Math.max(0,r+shade)},${Math.max(0,g+shade)},${Math.max(0,b+shade)},0.4)`;
    ctx.fillRect(0, i, size, 2);
    ctx.fillRect(i, 0, 2, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  return new THREE.MeshStandardMaterial({ map: texture, roughness, metalness: 0.0 });
}

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 12) =>
  new THREE.CylinderGeometry(rt, rb, h, seg);

function add(g: THREE.Group, geo: THREE.BufferGeometry, m: THREE.Material, sx = 0, sy = 0, sz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

const WALL_TYPES = new Set(['bed', 'wardrobe', 'shelf', 'desk', 'sofa', 'dresser', 'mirror']);
const DECOR_TYPES = new Set(['curtains', 'painting', 'blanket', 'cushions', 'mirror']);
// ── COLLISION DETECTION ───────────────────────────────────────────────────
type BBox = { x: number; z: number; w: number; d: number; type: string };
const placedBoxes: BBox[] = [];

const FURNITURE_PRIORITY: Record<string, number> = {
  bed: 10, sofa: 9, wardrobe: 8, dresser: 7, desk: 6,
  shelf: 5, table: 4, chair: 3, nightstand: 3,
  lamp: 2, plant: 2, rug: 1,
  curtains: 0, painting: 0, blanket: 0, cushions: 0, mirror: 0,
};

function resolveCollision(
  px: number, pz: number,
  sw: number, sd: number,
  type: string,
  roomW: number, roomL: number
): [number, number] {
  const myPriority = FURNITURE_PRIORITY[type] ?? 3;

  for (let iter = 0; iter < 8; iter++) {
    let moved = false;
    for (const b of placedBoxes) {
      if ((FURNITURE_PRIORITY[b.type] ?? 3) >= myPriority) continue;
if (WALL_TYPES.has(b.type) && WALL_TYPES.has(type)) continue; // стеновая мебель не толкает друг друга
      const overlapX = (sw / 2 + b.w / 2) - Math.abs(px - b.x);
      const overlapZ = (sd / 2 + b.d / 2) - Math.abs(pz - b.z);
      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) {
          px += px > b.x ? overlapX + 0.05 : -(overlapX + 0.05);
        } else {
          pz += pz > b.z ? overlapZ + 0.05 : -(overlapZ + 0.05);
        }
        // Не выходим за стены после сдвига
        px = Math.max(sw / 2 + 0.05, Math.min(roomW - sw / 2 - 0.05, px));
        pz = Math.max(sd / 2 + 0.05, Math.min(roomL - sd / 2 - 0.05, pz));
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [px, pz];
}
function snapToWall(px: number, pz: number, sw: number, sd: number, W: number, L: number, wall: string): [number, number] {
  const G = 0.015;
  switch (wall) {
    case 'back':  return [Math.max(sw/2+G, Math.min(W-sw/2-G, px)), sd/2+G];
    case 'front': return [Math.max(sw/2+G, Math.min(W-sw/2-G, px)), L-sd/2-G];
    case 'left':  return [sd/2+G,   Math.max(sw/2+G, Math.min(L-sw/2-G, pz))];
    case 'right': return [W-sd/2-G, Math.max(sw/2+G, Math.min(L-sw/2-G, pz))];
    default:      return [px, pz];
  }
}

// ── ШТОРЫ ────────────────────────────────────────────────────────────────────
function addCurtains(g: THREE.Group, w: number, h: number, c: number) {
  // Заменить строку с fabric:
const curtainColor = Math.max(c, 0x9A9080); // минимум светло-серый
const fabric = new THREE.MeshStandardMaterial({
  color: curtainColor, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide,
});
  const panelW = w / 2 - 0.05;
  // Два полотна — левое и правое
  for (const side of [-1, 1]) {
    const panel = new THREE.Group();
    // Основное полотно со складками
    for (let i = 0; i < 6; i++) {
      const foldW = panelW / 6;
      const depth = 0.04 * (i % 2 === 0 ? 1 : -1);
      const fold = new THREE.Mesh(box(foldW - 0.008, h, 0.01), fabric);
      fold.position.set(side * (w / 4 - panelW / 2 + i * foldW + foldW / 2), 0, depth);
      fold.castShadow = true;
      panel.add(fold);
    }
    // Низ — лёгкий изгиб (имитация)
    const hem = new THREE.Mesh(box(panelW, 0.04, 0.06), fabric);
    hem.position.set(side * w / 4, -h / 2 + 0.02, 0.02);
    panel.add(hem);
    g.add(panel);
  }
  // Карниз
  const rodMat = mat(0xC0A882, 0.3, 0.6);
  add(g, new THREE.CylinderGeometry(0.018, 0.018, w + 0.16, 12), rodMat, 0, h / 2 + 0.02, 0);
  // Кольца
  for (let i = 0; i <= 6; i++) {
    const rx = -w / 2 + (i / 6) * w;
    add(g, new THREE.TorusGeometry(0.022, 0.006, 6, 12), rodMat, rx, h / 2 + 0.02, 0);
  }
  // Наконечники карниза
  add(g, new THREE.SphereGeometry(0.028, 8, 8), rodMat, -w / 2 - 0.06, h / 2 + 0.02, 0);
  add(g, new THREE.SphereGeometry(0.028, 8, 8), rodMat,  w / 2 + 0.06, h / 2 + 0.02, 0);
}

// ── КАРТИНА ───────────────────────────────────────────────────────────────────
function addPainting(g: THREE.Group, w: number, h: number, c: number) {
  // Рама
  const frameMat = mat(0x2A2520, 0.5, 0.15); // всегда тёмная дерево-рама
  const ft = 0.04; // толщина рамы
  // Рама — 4 полосы
  add(g, box(w + ft * 2, ft, 0.03), frameMat, 0,  h / 2 + ft / 2, 0);
  add(g, box(w + ft * 2, ft, 0.03), frameMat, 0, -h / 2 - ft / 2, 0);
  add(g, box(ft, h + ft * 2, 0.03), frameMat, -w / 2 - ft / 2, 0, 0);
  add(g, box(ft, h + ft * 2, 0.03), frameMat,  w / 2 + ft / 2, 0, 0);
  // Холст — случайный абстрактный цвет в тонах комнаты
  const canvasC = Math.min(0xFFFFFF, c + 0x303030);
  add(g, box(w, h, 0.015), mat(canvasC, 0.97), 0, 0, -0.005);
  // Декоративные мазки (простые прямоугольники)
  const stroke1 = mat(Math.max(0, c - 0x404040), 0.9);
  const stroke2 = mat(Math.min(0xFFFFFF, c + 0x606060), 0.9);
  add(g, box(w * 0.5, h * 0.3, 0.016), stroke1,  w * 0.08, h * 0.1, 0);
  add(g, box(w * 0.25, h * 0.4, 0.016), stroke2, -w * 0.15, -h * 0.1, 0);
}

// ── ПЛЕД ─────────────────────────────────────────────────────────────────────
function addBlanket(g: THREE.Group, w: number, d: number, c: number) {
  const fabric = mat(c, 0.97);
  // Основной плед с лёгким изгибом (несколько слоёв)
  add(g, box(w, 0.06, d), fabric, 0, 0.03, 0);
  add(g, box(w - 0.04, 0.04, d * 0.3), mat(Math.max(0, c - 0x101010), 0.97), 0, 0.08, -d * 0.35);
  // Складки по краям
  for (let i = 0; i < 4; i++) {
    const fx = -w / 2 + (i / 3) * w;
    add(g, box(0.06, 0.05, d), mat(Math.max(0, c - 0x080808), 0.98), fx, 0.04, 0);
  }
}

// ── ПОДУШКИ ───────────────────────────────────────────────────────────────────
function addCushions(g: THREE.Group, w: number, c: number) {
  const count = w > 1.4 ? 3 : 2;
  const spacing = w / (count + 1);
  for (let i = 0; i < count; i++) {
    const cx = -w / 2 + spacing * (i + 1);
    const varC = i % 2 === 0 ? c : Math.min(0xFFFFFF, c + 0x252525);
    const cMat = mat(varC, 0.92);
    // Тело подушки
    const cg = new THREE.Group();
    add(cg, box(0.44, 0.14, 0.42), cMat, 0, 0.07, 0);
    // Кант
    add(cg, box(0.46, 0.03, 0.44), mat(Math.max(0, varC - 0x151515), 0.88), 0, 0.14, 0);
    cg.position.set(cx, 0, 0);
    g.add(cg);
  }
}

// ── ЗЕРКАЛО ──────────────────────────────────────────────────────────────────
function addMirror(g: THREE.Group, w: number, h: number, c: number) {
  const frameMat = mat(c, 0.45, 0.35);
  const ft = 0.05;
  add(g, box(w + ft * 2, h + ft * 2, 0.04), frameMat, 0, h / 2, 0);
  add(g, box(w, h, 0.02), new THREE.MeshStandardMaterial({ color: 0x99BBCC, roughness: 0.02, metalness: 0.9 }), 0, h / 2, 0.025);
}

// ── КРОВАТЬ ──────────────────────────────────────────────────────────────────
function addBed(g: THREE.Group, w: number, d: number, c: number) {
  const wood = woodMat(c);
  const fabC = Math.min(0xFFFFFF, c + 0x303030);
  add(g, box(w, 0.08, d), wood, 0, 0.04, 0);
  const lh = 0.18;
  [[-w/2+0.07,-d/2+0.07],[w/2-0.07,-d/2+0.07],
   [-w/2+0.07, d/2-0.07],[w/2-0.07, d/2-0.07]].forEach(([lx,lz]) => {
    add(g, box(0.06,lh,0.06), wood, lx, -lh/2, lz);
  });
  add(g, box(w-0.06,0.20,d-0.04), mat(0xF8F5F0,0.95), 0, 0.20, 0);
  const offsets = w > 1.45 ? [-0.32, 0.32] : [0];
  offsets.forEach(ox => add(g, box(0.58,0.10,0.44), mat(0xFFFCF8,0.97), ox, 0.37, -d/2+0.30));
  add(g, box(w-0.08,0.09,d*0.55), mat(Math.max(0x202020, c-0x3A3A3A),0.95), 0, 0.38, d*0.10);
  add(g, box(w,0.55,0.08), wood, 0, 0.44, -d/2+0.04);
  add(g, box(w-0.08,0.40,0.04), mat(fabC,0.92), 0, 0.44, -d/2+0.085);
}

// ── ДИВАН ────────────────────────────────────────────────────────────────────
function addSofa(g: THREE.Group, w: number, d: number, c: number) {
  const fab = fabricMat(c);
  const dark = mat(Math.max(0, c-0x1A1A1A), 0.70);
  const leg  = mat(0x5A5A5A, 0.35, 0.65);
  add(g, box(w,0.26,d), dark, 0, 0.23, 0);
  const sw = (w-0.28)/3;
  for (let i=0;i<3;i++) {
    const cx = -w/2+0.14+sw/2+i*sw;
    add(g, box(sw-0.025,0.17,d*0.56), fab, cx, 0.49, d*0.12);
    add(g, box(sw-0.03,0.42,0.18), fab, cx, 0.64, -d/2+0.13);
  }
  [-w/2+0.07, w/2-0.07].forEach(ax => add(g, box(0.12,0.48,d), dark, ax, 0.47, 0));
  [[-w/2+0.08,-d/2+0.08],[w/2-0.08,-d/2+0.08],
   [-w/2+0.08, d/2-0.08],[w/2-0.08, d/2-0.08]].forEach(([lx,lz]) => {
    add(g, cyl(0.025,0.02,0.10,8), leg, lx, 0.05, lz);
  });
}

// ── ШКАФ ─────────────────────────────────────────────────────────────────────
function addWardrobe(g: THREE.Group, w: number, d: number, h: number, c: number) {
  const wood  = mat(c, 0.65);
  const panel = mat(Math.min(0xFFFFFF,c+0x0C0C0C), 0.45);
  const metal = mat(0xCCCCCC, 0.2, 0.8);
  add(g, box(w,h,d), wood, 0, h/2, 0);
  add(g, box(w,0.06,d+0.01), mat(Math.max(0,c-0x151515),0.8), 0, 0.03, 0);
  const dw = w/2-0.01;
  [-dw/2-0.005, dw/2+0.005].forEach(ox => {
    add(g, box(dw-0.02,h-0.04,0.02), panel, ox, h/2, d/2+0.01);
    const hnd = new THREE.Mesh(cyl(0.008,0.008,0.13,8), metal);
    hnd.rotation.z = Math.PI/2;
    hnd.position.set(ox+(ox>0?-0.14:0.14), h*0.52, d/2+0.026);
    g.add(hnd);
  });
}

// ── КОМОД ────────────────────────────────────────────────────────────────────
function addDresser(g: THREE.Group, w: number, d: number, h: number, c: number) {
  const wood  = mat(c, 0.65);
  const panel = mat(Math.min(0xFFFFFF,c+0x0A0A0A), 0.45);
  const metal = mat(0xCCCCCC, 0.2, 0.8);
  add(g, box(w,h,d), wood, 0, h/2, 0);
  add(g, box(w+0.01,0.016,d+0.01), mat(Math.min(0xFFFFFF,c+0x060606),0.55), 0, h+0.008, 0);
  const rows = Math.max(2, Math.round(h / 0.22));
  for (let i = 0; i < rows; i++) {
    const dy = (i / rows) * (h - 0.04) + 0.02 + (h / rows) / 2;
    add(g, box(w-0.04,(h/rows)-0.025,0.02), panel, 0, dy, d/2+0.01);
    const hnd = new THREE.Mesh(cyl(0.007,0.007,0.12,8), metal);
    hnd.rotation.z = Math.PI/2;
    hnd.position.set(0, dy, d/2+0.028);
    g.add(hnd);
  }
}

// ── СТОЛ ПИСЬМЕННЫЙ ──────────────────────────────────────────────────────────
function addDesk(g: THREE.Group, w: number, d: number, c: number) {
  const wood = mat(c, 0.65);
  const dark = mat(Math.max(0,c-0x181818), 0.55);
  const leg  = mat(Math.max(0,c-0x0A0A0A), 0.50, 0.12);
  add(g, box(w,0.04,d), wood, 0, 0.40, 0);
  [[-w/2+0.04,-d/2+0.04],[w/2-0.04,-d/2+0.04],
   [-w/2+0.04, d/2-0.04],[w/2-0.04, d/2-0.04]].forEach(([lx,lz]) => {
    add(g, box(0.04,0.71,0.04), leg, lx, 0.355, lz);
  });
  add(g, box(w*0.42,0.18,d*0.50), dark, w*0.22, -0.13, 0);
}

// ── СТУЛ ─────────────────────────────────────────────────────────────────────
function addChair(g: THREE.Group, c: number) {
  const fab = mat(c, 0.85);
  const leg = mat(Math.max(0,c-0x101010), 0.50, 0.2);
  add(g, box(0.48,0.09,0.46), fab, 0, 0.445, 0);
add(g, box(0.48,0.46,0.07), fab, 0, 0.70, -0.20);
add(g, box(0.44,0.06,0.42), mat(Math.min(0xFFFFFF,c+0x101010),0.9), 0, 0.505, 0.01);
[[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]].forEach(([lx,lz]) => {
  add(g, box(0.035,0.40,0.035), leg, lx, 0.20, lz);
});
}

// ── СТОЛИК ───────────────────────────────────────────────────────────────────
function addTable(g: THREE.Group, w: number, d: number, c: number) {
  const wood = mat(c, 0.68);
  const leg  = mat(Math.max(0,c-0x141414), 0.55, 0.1);
  add(g, box(w,0.04,d), wood, 0, 0.02, 0);
  [[-w/2+0.05,-d/2+0.05],[w/2-0.05,-d/2+0.05],
   [-w/2+0.05, d/2-0.05],[w/2-0.05, d/2-0.05]].forEach(([lx,lz]) => {
    add(g, box(0.04,0.38,0.04), leg, lx, 0.19, lz);
  });
}

// ── ПОЛКА ─────────────────────────────────────────────────────────────────────
function addShelf(g: THREE.Group, w: number, d: number, h: number, c: number) {
  const wood = mat(c, 0.65);
  add(g, box(0.02,h,d), wood, -w/2+0.01, h/2, 0);
  add(g, box(0.02,h,d), wood,  w/2-0.01, h/2, 0);
  add(g, box(w-0.02,h,0.018), mat(Math.max(0,c-0x101010),0.8), 0, h/2, -d/2+0.009);
  const count = Math.max(2, Math.round(h/0.32));
  for (let i=0;i<=count;i++) {
    add(g, box(w-0.04,0.022,d-0.01), wood, 0, (i/count)*(h-0.04)+0.011, 0);
  }
}

// ── ТУМБА ────────────────────────────────────────────────────────────────────
function addNightstand(g: THREE.Group, w: number, d: number, h: number, c: number) {
  const wood  = mat(c, 0.65);
  const panel = mat(Math.min(0xFFFFFF,c+0x0A0A0A), 0.45);
  const metal = mat(0xBBBBBB, 0.2, 0.8);
  add(g, box(w,h,d), wood, 0, h/2, 0);
  add(g, box(w+0.01,0.014,d+0.01), mat(Math.min(0xFFFFFF,c+0x060606),0.55), 0, h+0.007, 0);
  add(g, box(w-0.04,h*0.36,d*0.02), panel, 0, h*0.62, d/2+0.01);
  const hnd = new THREE.Mesh(cyl(0.007,0.007,0.11,8), metal);
  hnd.rotation.z = Math.PI/2;
  hnd.position.set(0, h*0.62, d/2+0.026);
  g.add(hnd);
}

// ── ЛАМПА ────────────────────────────────────────────────────────────────────
function addLamp(g: THREE.Group, c: number) {
  const metal = mat(Math.min(0xFFFFFF,c+0x202020), 0.3, 0.7);
  add(g, cyl(0.13,0.16,0.04,16), metal, 0, 0.02, 0);
  add(g, cyl(0.016,0.016,1.32,8), metal, 0, 0.70, 0);
  const geo = new THREE.CylinderGeometry(0.06,0.21,0.28,16,1,true);
  const sm = new THREE.Mesh(geo, mat(0xF2E4C4,0.85));
  sm.position.set(0,1.50,0); sm.castShadow=true; g.add(sm);
  add(g, new THREE.CircleGeometry(0.06,12), mat(0xF5E8CA,0.88), 0, 1.64, 0);
  const bulb = new THREE.PointLight(0xFFBB66,1.6,3.2);
  bulb.position.set(0,1.36,0); g.add(bulb);
}

// ── РАСТЕНИЕ ─────────────────────────────────────────────────────────────────
function addPlant(g: THREE.Group, c: number) {
  add(g, cyl(0.11,0.08,0.20,12), mat(c||0x8B6A2A,0.88), 0, 0.10, 0);
  add(g, cyl(0.10,0.10,0.018,12), mat(0x3A2A18), 0, 0.209, 0);
  // Стебли
  const stemMat = mat(0x2A5A28, 0.85);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const stem = new THREE.Mesh(cyl(0.008, 0.006, 0.28, 6), stemMat);
    stem.position.set(Math.cos(a)*0.05, 0.35, Math.sin(a)*0.05);
    stem.rotation.z = Math.cos(a) * 0.4;
    stem.rotation.x = Math.sin(a) * 0.4;
    g.add(stem);
  }
  const lm = mat(0x2D6A35,0.9);
  for (let i=0;i<10;i++) {
    const a=(i/10)*Math.PI*2, r=0.055+(i%3)*0.04;
    const o=new THREE.Mesh(new THREE.SphereGeometry(0.10+(i%3)*0.03,7,6),lm);
    o.scale.set(1.4, 0.7, 1.4);
    o.position.set(Math.cos(a)*r,0.36+(i%3)*0.06,Math.sin(a)*r);
    o.castShadow=true; g.add(o);
  }
}

// ── КОВЁР ─────────────────────────────────────────────────────────────────────
function addRug(g: THREE.Group, w: number, d: number, c: number) {
  add(g, box(w,0.016,d), mat(c,0.98), 0, 0.008, 0);
  const bw=0.055, bc=Math.max(0,c-0x252525);
  [[w,bw,0,d/2-bw/2],[w,bw,0,-d/2+bw/2],
   [bw,d-bw*2,-w/2+bw/2,0],[bw,d-bw*2,w/2-bw/2,0]].forEach(([W,D,X,Z]) => {
    add(g, box(W as number,0.018,D as number), mat(bc,0.98), X as number, 0.009, Z as number);
  });
}

// ── ДЕРЕВЯННЫЙ ПОТОЛОК ───────────────────────────────────────────────────────
function buildWoodCeiling(scene: THREE.Scene, W: number, L: number, H: number, ceilC: number) {
  const plankW = 0.14;
  const count = Math.ceil(W / plankW) + 1;
  for (let i = 0; i < count; i++) {
    const shade = i % 3 === 0 ? -0x0C0C0C : i % 3 === 1 ? 0x060606 : 0;
    const c = Math.max(0, Math.min(0xFFFFFF, ceilC + shade));
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(plankW - 0.006, 0.03, L),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.0 })
    );
    plank.position.set(i * plankW + plankW / 2, H - 0.015, L / 2);
    plank.receiveShadow = true;
    scene.add(plank);
  }
}

// ── CONTACT SHADOWS ──────────────────────────────────────────────────────────
function addContactShadow(scene: THREE.Scene, px: number, pz: number, sw: number, sd: number) {
  const geo = new THREE.PlaneGeometry(sw * 0.92, sd * 0.88);
  const m = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.22,
    depthWrite: false, blending: THREE.MultiplyBlending,
  });
  const shadow = new THREE.Mesh(geo, m);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(px, 0.003, pz);
  shadow.renderOrder = 1;
  scene.add(shadow);

  const geoOuter = new THREE.PlaneGeometry(sw * 1.15, sd * 1.10);
  const mOuter = new THREE.MeshBasicMaterial({
    color: 0x000000, transparent: true, opacity: 0.10,
    depthWrite: false, blending: THREE.MultiplyBlending,
  });
  const shadowOuter = new THREE.Mesh(geoOuter, mOuter);
  shadowOuter.rotation.x = -Math.PI / 2;
  shadowOuter.position.set(px, 0.002, pz);
  shadowOuter.renderOrder = 0;
  scene.add(shadowOuter);
}

// ── Нормализация типов от AI ──────────────────────────────────────────────────
const TYPE_MAP: Record<string, string> = {
  coffee_table: 'table', armchair: 'chair', bookshelf: 'shelf',
  floor_lamp: 'lamp', vase: 'plant', sofa_chair: 'chair',
  side_table: 'nightstand', tv_stand: 'dresser', cabinet: 'wardrobe',
  chest: 'dresser', bench: 'chair', couch: 'sofa', loveseat: 'sofa',
  ottoman: 'table', stool: 'chair',
};

// Определить стену по позиции
function guessWall(px: number, pz: number, W: number, L: number): string {
  const dists = { back: pz, front: L-pz, left: px, right: W-px };
  return Object.entries(dists).sort((a,b) => a[1]-b[1])[0][0];
}

// Поворот мебели лицом к центру комнаты
function wallToRotation(wall: string): number {
  return wall==='back'?0 : wall==='front'?180 : wall==='left'?270 : 90;
}

// ── MASTER PLACER ─────────────────────────────────────────────────────────────
function place(scene: THREE.Scene, item: any, W: number, L: number, H: number) {
  const type = TYPE_MAP[item.type] ?? item.type ?? 'table';
  const fi = { ...item, type };
  const c  = hex(fi.color, 0x8B7355);

  const iw = Math.max(0.25, Math.min(fi.width  ?? 1.0, W * 0.48));
  const id = Math.max(0.15, Math.min(fi.depth  ?? 0.6, L * 0.48));
  const ih = Math.max(0.30, fi.height ?? 0.8);

  // ── Декор на стенах ──────────────────────────────────────────────────────
  if (fi.type === 'curtains') {
    const g = new THREE.Group();
    const wall = fi.wall || 'back';
    const px = typeof fi.x === 'number' ? fi.x : W/2;
    const pz = typeof fi.z === 'number' ? fi.z : L/2;
    if (wall === 'back' || wall === 'front') {
      g.rotation.y = wall === 'front' ? Math.PI : 0;
      g.position.set(Math.max(iw/2, Math.min(W-iw/2, px)), H-ih/2-0.01, wall==='back'?0.06:L-0.06);
    } else {
      g.rotation.y = wall === 'left' ? Math.PI/2 : -Math.PI/2;
      g.position.set(wall==='left'?0.06:W-0.06, H-ih/2-0.01, Math.max(iw/2, Math.min(L-iw/2, pz)));
    }
    scene.add(g);
    addCurtains(g, iw, ih, c);
    return;
  }

  if (fi.type === 'painting') {
    const g = new THREE.Group();
    const wall = fi.wall || guessWall(fi.x ?? W/2, fi.z ?? 0.1, W, L);
    const px = typeof fi.x === 'number' ? fi.x : W/2;
    const pz = typeof fi.z === 'number' ? fi.z : L/2;
    const hangY = H * 0.62;
    if (wall === 'back') {
      g.position.set(Math.max(iw/2+0.1, Math.min(W-iw/2-0.1, px)), hangY, 0.04);
    } else if (wall === 'front') {
      g.position.set(Math.max(iw/2+0.1, Math.min(W-iw/2-0.1, px)), hangY, L-0.04);
      g.rotation.y = Math.PI;
    } else if (wall === 'left') {
      g.position.set(0.04, hangY, Math.max(iw/2+0.1, Math.min(L-iw/2-0.1, pz)));
      g.rotation.y = Math.PI/2;
    } else {
      g.position.set(W-0.04, hangY, Math.max(iw/2+0.1, Math.min(L-iw/2-0.1, pz)));
      g.rotation.y = -Math.PI/2;
    }
    scene.add(g);
    addPainting(g, iw, ih, c);
    return;
  }

  if (fi.type === 'mirror') {
    const g = new THREE.Group();
    const wall = fi.wall || 'right';
    const pz = typeof fi.z === 'number' ? fi.z : L/2;
    if (wall === 'left') {
      g.position.set(0.04, 0, Math.max(0.4, Math.min(L-0.4, pz)));
      g.rotation.y = Math.PI/2;
    } else {
      g.position.set(W-0.04, 0, Math.max(0.4, Math.min(L-0.4, pz)));
      g.rotation.y = -Math.PI/2;
    }
    scene.add(g);
    addMirror(g, iw, ih, c);
    return;
  }

  if (fi.type === 'blanket') {
    const g = new THREE.Group();
    g.position.set(Math.max(iw/2, Math.min(W-iw/2, fi.x ?? W/2)), 0.38, Math.max(id/2, Math.min(L-id/2, fi.z ?? L/2)));
    scene.add(g); addBlanket(g, iw, id, c); return;
  }
  if (fi.type === 'cushions') {
    const g = new THREE.Group();
    g.position.set(Math.max(0.3, Math.min(W-0.3, fi.x ?? W/2)), 0.38, Math.max(0.3, Math.min(L-0.3, fi.z ?? L/2)));
    scene.add(g); addCushions(g, iw, c); return;
  }

  // ── Обычная мебель на полу ──────────────────────────────────────────────
  const isWallType = WALL_TYPES.has(fi.type);
  let wall = fi.wall as string | undefined;

  let rotDeg: number;
  if (isWallType) {
    if (!wall || wall === 'none') wall = guessWall(fi.x ?? W/2, fi.z ?? L/2, W, L);
    rotDeg = wallToRotation(wall);
  } else {
    rotDeg = ((fi.rotation ?? 0) % 360 + 360) % 360;
    wall = undefined;
  }

  const rot90 = rotDeg === 90 || rotDeg === 270;
  const snapW = rot90 ? id : iw;
  const snapD = rot90 ? iw : id;

  let px = typeof fi.x === 'number' && !isNaN(fi.x) ? fi.x : W/2;
  let pz = typeof fi.z === 'number' && !isNaN(fi.z) ? fi.z : L/2;

  // Клиппинг
  px = Math.max(snapW/2+0.02, Math.min(W-snapW/2-0.02, px));
  pz = Math.max(snapD/2+0.02, Math.min(L-snapD/2-0.02, pz));

  // Snap to wall до коллизий
  if (wall) [px, pz] = snapToWall(px, pz, snapW, snapD, W, L, wall);

  // Collision detection
  [px, pz] = resolveCollision(px, pz, snapW, snapD, fi.type, W, L);
  placedBoxes.push({ x: px, z: pz, w: snapW, d: snapD, type: fi.type });

  // Snap to wall после коллизий (финальный)
  if (wall) [px, pz] = snapToWall(px, pz, snapW, snapD, W, L, wall);

  // Тень
  if (fi.type !== 'rug') addContactShadow(scene, px, pz, snapW, snapD);

  const g = new THREE.Group();
  g.rotation.y = (rotDeg * Math.PI) / 180;
  g.position.set(px, 0, pz);
  scene.add(g);

  switch (fi.type) {
    case 'bed':      addBed(g, rot90 ? id : iw, rot90 ? iw : id, c);  break;
    case 'sofa':     addSofa(g, rot90 ? id : iw, rot90 ? iw : id, c); break;
    case 'wardrobe': addWardrobe(g, rot90 ? id : iw, rot90 ? iw : id, Math.max(1.6, ih), c); break;
    case 'dresser':  addDresser(g, rot90 ? id : iw, rot90 ? iw : id, Math.max(0.55, ih), c); break
    case 'desk':     addDesk(g, rot90 ? id : iw, rot90 ? iw : id, c); break;
    case 'chair':      addChair(g, c);                                  break;
    case 'table':      addTable(g, iw, id, c);                         break;
    case 'shelf':    addShelf(g, rot90 ? id : iw, rot90 ? iw : id, Math.max(1.4, ih), c);    break;
    case 'lamp':       addLamp(g, c);                                   break;
    case 'plant':      addPlant(g, c);                                  break;
    case 'rug':        addRug(g, iw, id, c);                           break;
    case 'nightstand': addNightstand(g, iw, id, Math.max(0.45, ih), c); break;
    default:           add(g, box(iw, Math.max(0.3,ih), id), mat(c), 0, Math.max(0.3,ih)/2, 0);
  }
}

// ── VIEWER ───────────────────────────────────────────────────────────────────
function ViewerContent() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const sp        = useSearchParams();
  const [design, setDesign]           = useState<any>(null);
  const [selected, setSelected]       = useState<number | null>(null);
  const [showConcept, setShowConcept] = useState(false);

  const W  = parseFloat(sp.get('width')  || '4');
  const L  = parseFloat(sp.get('length') || '5');
  const H  = parseFloat(sp.get('height') || '2.7');
  const SN = sp.get('style') || 'Минимализм';

  useEffect(() => {
    try { const s = localStorage.getItem('roomDesign'); if (s) setDesign(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const cW = el.clientWidth, cH = el.clientHeight;

    let d: any = null;
    placedBoxes.length = 0; // сбрасываем перед каждым рендером сцены
    try { const s = localStorage.getItem('roomDesign'); if (s) d = JSON.parse(s); } catch {}

    const wallC    = hex(d?.colors?.walls,   0xEEE8DF);
    const floorC   = hex(d?.colors?.floor,   0xC5B494);
    const ceilC    = hex(d?.colors?.ceiling, 0xD4A96A);
    const isWoodCeiling = d?.ceiling_material === 'wood_planks' ||
      ['Скандинавский', 'Cozy / Уютный', 'Индустриальный'].includes(d?.style);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0C0C14);
    scene.fog = new THREE.FogExp2(0x0C0C14, 0.014);

    const camera = new THREE.PerspectiveCamera(46, cW / cH, 0.1, 120);
    camera.position.set(W * 0.85, H * 1.30, L * 1.12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(cW, cH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minDistance   = 1.2;
    controls.maxDistance   = Math.max(W, L) * 3.2;
    controls.target.set(W / 2, H * 0.22, L / 2);

    // ── Освещение ──
    // Тёплый ambient
    scene.add(new THREE.AmbientLight(0xFFF5E8, 0.45));

    // Солнечный свет из окна
    const sun = new THREE.DirectionalLight(0xFFF3D8, 1.4);
    sun.position.set(W * 0.5, H * 2.2, -L * 0.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -W; sun.shadow.camera.right = W * 1.5;
    sun.shadow.camera.top  =  H * 2.2; sun.shadow.camera.bottom = -0.5;
    sun.shadow.bias = -0.0004;
    scene.add(sun);

    // Fill light — тёплый с противоположной стороны
    const fill = new THREE.DirectionalLight(0xFFE8C8, 0.35);
    fill.position.set(-W * 0.5, H * 0.7, L * 0.8);
    scene.add(fill);

    // Потолочный свет
    const ceilPt = new THREE.PointLight(0xFFF8E8, 1.0, Math.max(W, L) * 2.4);
    ceilPt.position.set(W / 2, H * 0.90, L / 2);
    scene.add(ceilPt);

    // Оконный свет
    const winW = Math.min(W * 0.42, 1.6);
    const winH = Math.min(H * 0.50, 1.38);
    const winY = H * 0.58;
    const wl = new THREE.RectAreaLight(0xD8EEFF, 7, winW * 0.9, winH * 0.9);
    wl.position.set(W / 2, winY, 0.4);
    wl.lookAt(W / 2, winY, L / 2);
    scene.add(wl);

    // ── Пол — паркет ──
    const bw = 0.15, cols = Math.ceil(W / bw);
    for (let i = 0; i < cols; i++) {
      const shade = i % 4 === 1 ? -0x141414 : i % 4 === 3 ? 0x080808 : 0;
      const c = Math.max(0, Math.min(0xFFFFFF, floorC + shade));
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw - 0.007, 0.028, L),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.76, metalness: 0.01 })
      );
      b.position.set(i * bw + bw / 2, 0.014, L / 2);
      b.receiveShadow = true;
      scene.add(b);
    }

    // ── Потолок ──
    if (isWoodCeiling) {
      buildWoodCeiling(scene, W, L, H, ceilC);
    } else {
      const ceilMesh = new THREE.Mesh(box(W, 0.05, L),
        new THREE.MeshStandardMaterial({ color: hex(d?.colors?.ceiling, 0xF8F6F2), roughness: 0.97 }));
      ceilMesh.position.set(W / 2, H + 0.025, L / 2);
      scene.add(ceilMesh);
    }

    // ── Стены ──
    const backMat = new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.90, transparent: true, opacity: 0.92 });
    const leftMat = new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.90, transparent: true, opacity: 0.92 });
    const wm = backMat; // для плинтусов используем тот же материал
    const backW = new THREE.Mesh(box(W + 0.22, H + 0.06, 0.10), backMat);
    backW.position.set(W / 2, H / 2, -0.05); backW.receiveShadow = true; scene.add(backW);
    const leftW = new THREE.Mesh(box(0.10, H + 0.06, L + 0.22), leftMat);
    leftW.position.set(-0.05, H / 2, L / 2); leftW.receiveShadow = true; scene.add(leftW);

    const rightMat = new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.90, transparent: true, opacity: 0.06, side: THREE.FrontSide, depthWrite: false });
    const frontMat = new THREE.MeshStandardMaterial({ color: wallC, roughness: 0.90, transparent: true, opacity: 0.06, side: THREE.BackSide, depthWrite: false });
    const rightW = new THREE.Mesh(box(0.10, H + 0.06, L + 0.22), rightMat);
    rightW.position.set(W + 0.05, H / 2, L / 2); scene.add(rightW);
    const frontW = new THREE.Mesh(box(W + 0.22, H + 0.06, 0.10), frontMat);
    frontW.position.set(W / 2, H / 2, L + 0.05); scene.add(frontW);

    // ── Плинтус ──
    const sm2 = mat(Math.min(0xFFFFFF, wallC + 0x060606), 0.55);
    const sh = 0.065, sd = 0.022;
    [[W, sh, sd, W/2, sh/2, sd/2], [W, sh, sd, W/2, sh/2, L-sd/2],
     [sd, sh, L, sd/2, sh/2, L/2], [sd, sh, L, W-sd/2, sh/2, L/2]].forEach(([bW,bH,bD,bx,by,bz]) => {
      const s = new THREE.Mesh(box(bW, bH, bD), sm2);
      s.position.set(bx, by, bz); scene.add(s);
    });

    // ── Окно ──
    const fm = mat(Math.min(0xFFFFFF, wallC + 0x0A0A0A), 0.40);
    const ft = 0.055, wx = W / 2;
    const winFrames: [number,number,number,number,number][] = [
      [winW+ft*2, ft, wx, winY+winH/2+ft/2, 0.05],
      [winW+ft*2, ft, wx, winY-winH/2-ft/2, 0.05],
    ];
    winFrames.forEach(([fw,,bx,by,bz]) => {
      const f = new THREE.Mesh(box(fw,ft,0.07),fm); f.position.set(bx,by,bz); scene.add(f);
    });
    [[ft,winH, wx-winW/2-ft/2, winY, 0.05],[ft,winH, wx+winW/2+ft/2, winY, 0.05]].forEach(([fw,fh,bx,by,bz]) => {
      const f = new THREE.Mesh(box(fw as number,fh as number,0.07),fm);
      f.position.set(bx as number,by as number,bz as number); scene.add(f);
    });
    const gl = new THREE.Mesh(box(winW,winH,0.04), new THREE.MeshStandardMaterial({ color: 0x99CCFF, transparent: true, opacity: 0.15, roughness: 0.04 }));
    gl.position.set(wx, winY, 0.02); scene.add(gl);
    const cross = new THREE.Mesh(box(winW, ft*0.6, 0.04), fm);
    cross.position.set(wx, winY, 0.03); scene.add(cross);

    // Массивы декора по стенам для синхронной прозрачности
    const backWallObjects: THREE.Object3D[] = [backW];
    const leftWallObjects: THREE.Object3D[] = [leftW];
    const rightWallObjects: THREE.Object3D[] = [rightW];
    const frontWallObjects: THREE.Object3D[] = [frontW];

    // ── Мебель и декор ──
    if (d?.furniture?.length > 0) {
      d.furniture.forEach((item: any) => place(scene, item, W, L, H));
      // Привязываем декор к стенам по позиции
    scene.children.forEach(obj => {
      if (!(obj instanceof THREE.Group)) return;
      const pos = obj.position;
      if (pos.z < 0.3) backWallObjects.push(obj);           // задняя стена
      else if (pos.x < 0.3) leftWallObjects.push(obj);      // левая стена
      else if (pos.x > W - 0.3) rightWallObjects.push(obj); // правая стена
      else if (pos.z > L - 0.3) frontWallObjects.push(obj); // передняя стена
    });
    } else {
      place(scene,{type:'bed',       x:W*0.5, z:L*0.18,width:1.6,depth:2.0,height:0.5, color:'#8B7355',wall:'back'},W,L,H);
place(scene,{type:'nightstand',x:W*0.20,z:L*0.18,width:0.5,depth:0.4,height:0.55,color:'#7A6345',wall:'back'},W,L,H);
place(scene,{type:'wardrobe',  x:W*0.12,z:L*0.55,width:1.0,depth:0.5,height:2.0, color:'#9A8365',wall:'left'},W,L,H);
place(scene,{type:'lamp',      x:W*0.82,z:L*0.72,width:0.3,depth:0.3,height:1.5, color:'#A09070'},W,L,H);
place(scene,{type:'plant',     x:W*0.88,z:L*0.88,width:0.3,depth:0.3,height:0.55,color:'#4A7A5A'},W,L,H);
place(scene,{type:'curtains',  x:W/2,   z:0,     width:1.8,depth:0.1,height:2.4, color:'#E8E0D5',wall:'back'},W,L,H);
place(scene,{type:'painting',  x:W*0.7, z:0,     width:0.8,depth:0.05,height:0.6,color:'#C4B89A',wall:'back'},W,L,H);
place(scene,{type:'rug',       x:W*0.5, z:L*0.55,width:1.6,depth:2.0,height:0.02,color:'#B8A882'},W,L,H);
    }

    // ── Loop ──
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();

      const camX = camera.position.x;
      const camZ = camera.position.z;

      // Прозрачность стен и декора на них
      const backTarget  = camZ < -0.8 ? 0.0 : 0.92;
      const leftTarget  = camX < -0.8 ? 0.0 : 0.92;
      const rightTarget = camX > W + 0.8 ? 0.0 : 0.92;
      const frontTarget = camZ > L + 0.8 ? 0.0 : 0.92;

      const lerp = 0.08;
      backMat.opacity  += (backTarget  - backMat.opacity)  * lerp;
      leftMat.opacity  += (leftTarget  - leftMat.opacity)  * lerp;
      rightMat.opacity += (rightTarget - rightMat.opacity) * lerp;
      frontMat.opacity += (frontTarget - frontMat.opacity) * lerp;

      // Декор на стенах исчезает вместе со стеной
      const setGroupOpacity = (objects: THREE.Object3D[], opacity: number) => {
        objects.forEach(obj => {
          obj.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              child.material.transparent = true;
              child.material.opacity += (opacity - child.material.opacity) * lerp;
            }
          });
        });
      };

      setGroupOpacity(backWallObjects,  backMat.opacity);
      setGroupOpacity(leftWallObjects,  leftMat.opacity);
      setGroupOpacity(rightWallObjects, rightMat.opacity);
      setGroupOpacity(frontWallObjects, frontMat.opacity);

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      const w = el.clientWidth, h = el.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [W, L, H, SN]);

  // Фильтруем декор из списка мебели для карточек
  const furniture = (design?.furniture ?? []).filter((f: any) =>
    !['curtains', 'painting', 'blanket', 'cushions', 'mirror'].includes(f.type)
  );

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      <nav className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/result" className="text-xs text-gray-500 hover:text-violet-400 transition">← Назад к рендерам</a>
          <div className="text-right">
            <div className="text-sm font-medium text-violet-400">{SN}</div>
            <div className="text-xs text-gray-500">{W}м × {L}м × {H}м</div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col items-center px-4 py-5">
        <div className="text-center mb-4 w-full max-w-5xl">
          <div className="flex items-center justify-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">Твоя комната в 3D</h1>
            {design?.concept && (
              <button
                onClick={() => setShowConcept(v => !v)}
                className="text-xs text-violet-400 border border-violet-500/30 px-3 py-1 rounded-full hover:bg-violet-500/10 transition"
              >
                ✨ Концепт
              </button>
            )}
          </div>
          <p className="text-gray-500 text-xs">Зажми и тяни · Колёсико для зума · Правая кнопка для панорамы</p>
          {showConcept && design?.concept && (
            <div className="mt-3 bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3 text-sm text-gray-300 text-left leading-relaxed">
              {design.concept}
            </div>
          )}
        </div>

        <div ref={mountRef}
          className="w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-500/5"
          style={{ height: '62vh' }}
        />

        {furniture.length > 0 && (
          <div className="w-full max-w-5xl mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Мебель из этого дизайна</h2>
              <a href="https://jysk.md/ru" target="_blank" className="text-xs text-gray-500 hover:text-violet-400 transition">jysk.md →</a>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {furniture.map((item: any, i: number) => (
                <a key={i}
                  href={item.jysk_url || 'https://jysk.md/ru'}
                  target="_blank" rel="noopener noreferrer"
                  onMouseEnter={() => setSelected(i)}
                  onMouseLeave={() => setSelected(null)}
                  className={`group bg-white/5 border rounded-xl overflow-hidden transition-all ${
                    selected === i ? 'border-violet-500/60 bg-violet-500/8' : 'border-white/10 hover:border-violet-500/40'
                  }`}
                >
                  {item.image && (
                    <div className="w-full h-28 bg-white overflow-hidden">
                      <img src={item.image} alt={item.jysk_name || item.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/20"
                        style={{ backgroundColor: item.color || '#888' }} />
                      <div className="text-xs font-medium text-gray-300 group-hover:text-white transition truncate leading-tight">
                        {item.jysk_name || item.name}
                      </div>
                    </div>
                    <div className="text-violet-400 font-semibold text-xs">{item.jysk_price || '—'}</div>
                  </div>
                </a>
              ))}
            </div>

            {furniture.some((f: any) => f.jysk_price) && (
              <div className="mt-3 flex justify-end">
                <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-3 flex items-center gap-4">
                  <span className="text-sm text-gray-400">Итого</span>
                  <span className="text-base font-bold text-white">
                    {furniture.reduce((sum: number, f: any) => {
                      const n = parseInt((f.jysk_price || '0').replace(/[^0-9]/g, ''));
                      return sum + (isNaN(n) ? 0 : n);
                    }, 0).toLocaleString('ru')} MDL
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center pb-10">
          <p className="text-gray-500 text-sm mb-3">Нравится? Сделаем персональный концепт для твоей комнаты</p>
          <a href="/" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-3 rounded-full font-semibold text-sm">
            Заказать свой дизайн
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Viewer() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#08080F] flex items-center justify-center">
        <div className="text-white/40 text-sm animate-pulse">Загружаем 3D...</div>
      </div>
    }>
      <ViewerContent />
    </Suspense>
  );
}