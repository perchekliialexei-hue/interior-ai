'use client';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── Стили комнаты ────────────────────────────────────────────────────────────
const STYLES: Record<string, any> = {
  'Минимализм': {
    bg: 0x1a1a22, wall: 0xF2EDE6, floor: 0xC8B89A, floorAlt: 0xB8A88A,
    ceiling: 0xF8F6F2, trim: 0xEEEAE4,
    ambient: { color: 0xFFF5E6, int: 0.6 },
    sun: { color: 0xFFF0D0, int: 1.5 },
    fill: { color: 0xE8F0FF, int: 0.4 },
    lamp: { color: 0xFFAA44, int: 3 },
    window: { color: 0xCCE8FF, int: 5 },
  },
  'Скандинавский': {
    bg: 0x141E2E, wall: 0xFFFFFF, floor: 0xD4C4A8, floorAlt: 0xC4B498,
    ceiling: 0xFAFAFA, trim: 0xF0F0F0,
    ambient: { color: 0xF0F8FF, int: 0.7 },
    sun: { color: 0xFFFFFF, int: 1.3 },
    fill: { color: 0xD0E8FF, int: 0.5 },
    lamp: { color: 0x88CCFF, int: 2 },
    window: { color: 0xE8F4FF, int: 6 },
  },
  'Cozy / Уютный': {
    bg: 0x0E0A06, wall: 0xE8D5B0, floor: 0x7A5C3A, floorAlt: 0x6A4C2A,
    ceiling: 0xF0E6D0, trim: 0xD8C8A8,
    ambient: { color: 0xFF9944, int: 0.5 },
    sun: { color: 0xFFCC66, int: 1.0 },
    fill: { color: 0xFF6600, int: 0.2 },
    lamp: { color: 0xFF7700, int: 4 },
    window: { color: 0xFFAA55, int: 3 },
  },
  'Gaming Setup': {
    bg: 0x050510, wall: 0x0D0D1A, floor: 0x1A1A2E, floorAlt: 0x111120,
    ceiling: 0x080810, trim: 0x1A1A2E,
    ambient: { color: 0x2200FF, int: 0.3 },
    sun: { color: 0x8866FF, int: 0.6 },
    fill: { color: 0x00FFFF, int: 0.3 },
    lamp: { color: 0x7F77DD, int: 5 },
    window: { color: 0x5533FF, int: 3 },
  },
  'Индустриальный': {
    bg: 0x0C0C0C, wall: 0x6A6A6A, floor: 0x3D3D3D, floorAlt: 0x2A2A2A,
    ceiling: 0x555555, trim: 0x444444,
    ambient: { color: 0xFFA060, int: 0.4 },
    sun: { color: 0xFFD0A0, int: 1.2 },
    fill: { color: 0xFF8844, int: 0.3 },
    lamp: { color: 0xFF6600, int: 3.5 },
    window: { color: 0xFFCC88, int: 3 },
  },
};

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── Процедурные 3D модели мебели ────────────────────────────────────────────
function buildBed(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number) {
  const mat = (c: number, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  // Основа
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat(color));
  base.position.set(x, 0.11, z); base.castShadow = true; scene.add(base);
  // Матрас
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.18, d - 0.1), mat(0xF5F0E8, 0.9));
  mattress.position.set(x, 0.31, z + 0.02); mattress.castShadow = true; scene.add(mattress);
  // Изголовье
  const head = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, 0.08), mat(color));
  head.position.set(x, 0.52, z - d / 2 + 0.04); head.castShadow = true; scene.add(head);
  // Подушки
  [-0.22, 0.22].forEach(ox => {
    if (Math.abs(ox) < w / 2 - 0.1) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.28), mat(0xFFFAF5, 0.95));
      pillow.position.set(x + ox, 0.45, z - d / 2 + 0.25); scene.add(pillow);
    }
  });
  // Одеяло — всегда контрастный цвет
  const blanketColor = color > 0x888888 ? Math.max(0x333333, color - 0x333333) : Math.min(0xDDDDDD, color + 0x333333);
  const blanket = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.08, d * 0.55), mat(blanketColor, 0.95));
  blanket.position.set(x, 0.44, z + d * 0.12); scene.add(blanket);
  // Ножки
  const legColor = Math.min(0xFFFFFF, Math.max(0x222222, color));
  [[-w/2+0.08, -d/2+0.08], [w/2-0.08, -d/2+0.08], [-w/2+0.08, d/2-0.08], [w/2-0.08, d/2-0.08]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.07), mat(legColor));
    leg.position.set(x + lx, 0.05, z + lz); scene.add(leg);
  });
}

function buildSofa(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number) {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat(Math.max(0x0A0A0A, color) - 0x0A0A0A));
  base.position.set(x, 0.11, z); base.castShadow = true; scene.add(base);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.18, d * 0.58), mat(color));
  seat.position.set(x, 0.31, z + d * 0.18); seat.castShadow = true; scene.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.5, 0.14), mat(color));
  back.position.set(x, 0.56, z - d * 0.32); back.castShadow = true; scene.add(back);
  [-w/2 + 0.09, w/2 - 0.09].forEach(ax => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, d * 0.72), mat(Math.max(0x080808, color) - 0x080808));
    arm.position.set(x + ax, 0.38, z + d * 0.04); scene.add(arm);
  });
  // Подушки сиденья
  const segW = (w - 0.32) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = x - (w - 0.32) / 2 + segW * i + segW / 2;
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(segW - 0.03, 0.12, d * 0.52), mat(Math.min(0xFFFFFF, color + 0x080808)));
    cushion.position.set(cx, 0.46, z + d * 0.18); scene.add(cushion);
  }
}

function buildWardrobe(scene: THREE.Scene, x: number, z: number, w: number, d: number, h: number, color: number) {
  const mat = (c: number, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  body.position.set(x, h / 2, z); body.castShadow = true; scene.add(body);
  // Двери
  const doorW = w / 2 - 0.01;
  [-doorW / 2 - 0.005, doorW / 2 + 0.005].forEach(ox => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - 0.04, 0.03), mat(Math.min(0xFFFFFF, color + 0x0A0A0A), 0.4));
    door.position.set(x + ox, h / 2, z + d / 2 + 0.015); scene.add(door);
    // Ручка
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 8), mat(0xAAAAAA, 0.3));
    handle.rotation.z = Math.PI / 2;
    handle.position.set(x + ox + (ox > 0 ? -0.12 : 0.12), h * 0.5, z + d / 2 + 0.04);
    scene.add(handle);
  });
}

function buildDesk(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number) {
  const mat = (c: number, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color));
  top.position.set(x, 0.75, z); top.castShadow = true; scene.add(top);
  [[-w/2+0.05, -d/2+0.05], [w/2-0.05, -d/2+0.05], [-w/2+0.05, d/2-0.05], [w/2-0.05, d/2-0.05]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.73, 0.05), mat(Math.max(0x111111, color) - 0x111111));
    leg.position.set(x + lx, 0.365, z + lz); scene.add(leg);
  });
  // Ящик
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.15, d * 0.55), mat(Math.max(0x080808, color) - 0x080808));
  drawer.position.set(x + w * 0.25, 0.57, z); scene.add(drawer);
}

function buildChair(scene: THREE.Scene, x: number, z: number, color: number) {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.48), mat(color));
  seat.position.set(x, 0.44, z); scene.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.06), mat(color));
  back.position.set(x, 0.73, z - 0.21); scene.add(back);
  [[-0.2, -0.19], [0.2, -0.19], [-0.2, 0.19], [0.2, 0.19]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.04), mat(Math.max(0x111111, color) - 0x111111));
    leg.position.set(x + lx, 0.22, z + lz); scene.add(leg);
  });
}

function buildTable(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number) {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat(color));
  top.position.set(x, 0.44, z); top.castShadow = true; scene.add(top);
  [[-w/2+0.06, -d/2+0.06], [w/2-0.06, -d/2+0.06], [-w/2+0.06, d/2-0.06], [w/2-0.06, d/2-0.06]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), mat(Math.max(0x111111, color) - 0x111111));
    leg.position.set(x + lx, 0.22, z + lz); scene.add(leg);
  });
}

function buildShelf(scene: THREE.Scene, x: number, z: number, w: number, d: number, h: number, color: number) {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), mat(Math.max(0x0A0A0A, color) - 0x0A0A0A));
  back.position.set(x, h / 2, z - d / 2 + 0.01); scene.add(back);
  const shelves = Math.floor(h / 0.35);
  for (let i = 0; i <= shelves; i++) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), mat(color));
    shelf.position.set(x, (i / shelves) * (h - 0.05) + 0.025, z);
    shelf.castShadow = true; scene.add(shelf);
  }
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, d), mat(color));
  sideL.position.set(x - w / 2 + 0.012, h / 2, z); scene.add(sideL);
  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.025, h, d), mat(color));
  sideR.position.set(x + w / 2 - 0.012, h / 2, z); scene.add(sideR);
}

function buildLamp(scene: THREE.Scene, x: number, z: number, _color: number) {
  const mat = (c: number, r = 0.5) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.04, 12), mat(0x888888, 0.4));
  base.position.set(x, 0.02, z); scene.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.4, 8), mat(0x999999, 0.3));
  pole.position.set(x, 0.72, z); scene.add(pole);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.30, 16, 1, true), mat(0xF5E8C8, 0.85));
  shade.position.set(x, 1.56, z); scene.add(shade);
  const shadeTop = new THREE.Mesh(new THREE.CircleGeometry(0.08, 12), mat(0xE8D8A8));
  shadeTop.rotation.x = -Math.PI / 2;
  shadeTop.position.set(x, 1.71, z); scene.add(shadeTop);
  const bulb = new THREE.PointLight(0xFFAA44, 1.8, 3.5);
  bulb.position.set(x, 1.42, z); scene.add(bulb);
}

function buildPlant(scene: THREE.Scene, x: number, z: number, color: number) {
  const matPot = new THREE.MeshStandardMaterial({ color: color || 0x8B6914, roughness: 0.85 });
  const matLeaf = new THREE.MeshStandardMaterial({ color: 0x2D6A2D, roughness: 0.9 });
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.22, 12), matPot);
  pot.position.set(x, 0.11, z); scene.add(pot);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0x3A2A1A }));
  soil.position.set(x, 0.23, z); scene.add(soil);
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const r = 0.06 + Math.random() * 0.08;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.12 + Math.random() * 0.08, 6, 5), matLeaf);
    leaf.scale.y = 1.8;
    leaf.position.set(x + Math.cos(angle) * r, 0.35 + Math.random() * 0.25, z + Math.sin(angle) * r);
    scene.add(leaf);
  }
}

function buildRug(scene: THREE.Scene, x: number, z: number, w: number, d: number, color: number) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.98 });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, d), mat);
  rug.position.set(x, 0.009, z); rug.receiveShadow = true; scene.add(rug);
  // Бордюр
  const borderMat = new THREE.MeshStandardMaterial({ color: Math.max(0x111111, color - 0x202020), roughness: 0.98 });
  const bw = 0.06;
  [[w, bw, 0, -d/2 + bw/2], [w, bw, 0, d/2 - bw/2], [bw, d - bw*2, -w/2 + bw/2, 0], [bw, d - bw*2, w/2 - bw/2, 0]].forEach(([bW, bD, bx, bz]) => {
    const border = new THREE.Mesh(new THREE.BoxGeometry(bW, 0.02, bD), borderMat);
    border.position.set(x + bx, 0.011, z + bz); scene.add(border);
  });
}

function buildNightstand(scene: THREE.Scene, x: number, z: number, color: number) {
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.4), mat(color));
  body.position.set(x, 0.26, z); body.castShadow = true; scene.add(body);
  const drawer = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.2, 0.38), mat(Math.min(0xFFFFFF, color + 0x080808)));
  drawer.position.set(x, 0.36, z + 0.01); scene.add(drawer);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), mat(0xAAAAAA));
  handle.rotation.z = Math.PI / 2;
  handle.position.set(x, 0.36, z + 0.21); scene.add(handle);
}

function buildFurnitureItem(scene: THREE.Scene, item: any, W: number, L: number) {
  const color = item.color ? hexToInt(item.color) : 0x8B7355;
  const w = Math.max(0.3, Math.min(item.width ?? 1.0, W * 0.75));
  const d = Math.max(0.3, Math.min(item.depth ?? 0.6, L * 0.75));
  const h = Math.max(0.3, item.height ?? 0.8);
  // Используем позиции от Mistral, ограничиваем границами комнаты
  const rawX = typeof item.x === "number" && !isNaN(item.x) ? item.x : W/2;
  const x = Math.max(w/2 + 0.15, Math.min(W - w/2 - 0.15, rawX));
  const rawZ = typeof item.z === "number" && !isNaN(item.z) ? item.z : L/2;
  const z = Math.max(d/2 + 0.15, Math.min(L - d/2 - 0.15, rawZ));

  switch (item.type) {
    case 'bed':        buildBed(scene, x, z, w, d, color); break;
    case 'sofa':       buildSofa(scene, x, z, w, d, color); break;
    case 'wardrobe':   buildWardrobe(scene, x, z, w, d, Math.max(1.6, h), color); break;
    case 'desk':       buildDesk(scene, x, z, w, d, color); break;
    case 'chair':      buildChair(scene, x, z, color); break;
    case 'table':      buildTable(scene, x, z, w, d, color); break;
    case 'shelf':      buildShelf(scene, x, z, w, d, Math.max(1.4, h), color); break;
    case 'lamp':       buildLamp(scene, x, z, color); break;
    case 'plant':      buildPlant(scene, x, z, color); break;
    case 'rug':        buildRug(scene, x, z, w, d, color); break;
    case 'nightstand': buildNightstand(scene, x, z, color); break;
    default: {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
      mesh.position.set(x, h/2, z); mesh.castShadow = true; scene.add(mesh);
    }
  }
}

// ─── Основной компонент ───────────────────────────────────────────────────────
function ViewerContent() {
  const mountRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [aiDesign, setAiDesign] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  const width  = parseFloat(searchParams.get('width')  || '4');
  const length = parseFloat(searchParams.get('length') || '5');
  const height = parseFloat(searchParams.get('height') || '2.7');
  const style  = searchParams.get('style') || 'Минимализм';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('roomDesign');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAiDesign(parsed);
        if (parsed.concept) { setShowToast(true); setTimeout(() => setShowToast(false), 7000); }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const S = STYLES[style] || STYLES['Минимализм'];
    const cW = mountRef.current.clientWidth;
    const cH = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(S.bg);
    scene.fog = new THREE.FogExp2(S.bg, 0.025);

    const camera = new THREE.PerspectiveCamera(50, cW / cH, 0.1, 100);
    camera.position.set(width * 0.9, height * 1.1, length * 1.0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(cW, cH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 1.5;
    controls.maxDistance = Math.max(width, length) * 2.8;
    controls.target.set(width / 2, height * 0.25, length / 2);

    // ── Освещение ──
    scene.add(new THREE.AmbientLight(S.ambient.color, S.ambient.int));
    const sun = new THREE.DirectionalLight(S.sun.color, S.sun.int);
    sun.position.set(width * 0.6, height * 2.2, length * 0.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left   = -width * 0.5; sun.shadow.camera.right = width * 1.5;
    sun.shadow.camera.top    = height * 2;   sun.shadow.camera.bottom = -0.5;
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(S.fill.color, S.fill.int);
    fill.position.set(-width * 0.4, height, length * 0.9);
    scene.add(fill);
    const ceilLight = new THREE.PointLight(S.lamp.color, S.lamp.int, Math.max(width, length) * 1.5);
    ceilLight.position.set(width / 2, height * 0.9, length / 2);
    scene.add(ceilLight);

    // ── Дизайн из localStorage ──
    const design = (() => { try { const s = localStorage.getItem('roomDesign'); return s ? JSON.parse(s) : null; } catch { return null; } })();
    const wallColor  = design?.colors?.walls   ? hexToInt(design.colors.walls)   : S.wall;
    const floorColor = design?.colors?.floor   ? hexToInt(design.colors.floor)   : S.floor;
    const ceilColor  = design?.colors?.ceiling ? hexToInt(design.colors.ceiling) : S.ceiling;

    // ── Пол (паркет) ──
    const boardW = 0.16;
    const cols = Math.ceil(width / boardW);
    for (let i = 0; i < cols; i++) {
      const c = i % 4 === 1 ? Math.max(0, floorColor - 0x181818) : i % 4 === 3 ? Math.min(0xFFFFFF, floorColor + 0x080808) : floorColor;
      const board = new THREE.Mesh(
        new THREE.BoxGeometry(boardW - 0.008, 0.03, length),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.78, metalness: 0.01 })
      );
      board.position.set(i * boardW + boardW / 2, 0.015, length / 2);
      board.receiveShadow = true;
      scene.add(board);
    }

    // ── Потолок ──
    const ceil = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, length),
      new THREE.MeshStandardMaterial({ color: ceilColor, roughness: 0.98 })
    );
    ceil.position.set(width / 2, height + 0.04, length / 2);
    scene.add(ceil);

    // ── Стены (задняя и левая — непрозрачные) ──
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92, side: THREE.FrontSide });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, height + 0.08, 0.12), wallMat);
    backWall.position.set(width / 2, height / 2, -0.06);
    backWall.receiveShadow = true; scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, height + 0.08, length + 0.24), wallMat);
    leftWall.position.set(-0.06, height / 2, length / 2);
    leftWall.receiveShadow = true; scene.add(leftWall);

    // ── Правая и передняя стены — умная прозрачность ──
    const rightWallMat = new THREE.MeshStandardMaterial({
      color: wallColor, roughness: 0.92, transparent: true, opacity: 0.08, side: THREE.FrontSide, depthWrite: false
    });
    const frontWallMat = new THREE.MeshStandardMaterial({
      color: wallColor, roughness: 0.92, transparent: true, opacity: 0.08, side: THREE.BackSide, depthWrite: false
    });
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, height + 0.08, length + 0.24), rightWallMat);
    rightWall.position.set(width + 0.06, height / 2, length / 2); scene.add(rightWall);
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(width + 0.24, height + 0.08, 0.12), frontWallMat);
    frontWall.position.set(width / 2, height / 2, length + 0.06); scene.add(frontWall);

    // ── Плинтусы ──
    const trimMat = new THREE.MeshStandardMaterial({ color: S.trim, roughness: 0.6 });
    [[width, 0.06, 0.04, width/2, 0.03, 0.03], [width, 0.06, 0.04, width/2, 0.03, length - 0.03],
     [0.04, 0.06, length, 0.03, 0.03, length/2], [0.04, 0.06, length, width - 0.03, 0.03, length/2]].forEach(([bw, bh, bd, bx, by, bz]) => {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), trimMat);
      trim.position.set(bx, by, bz); scene.add(trim);
    });

    // ── Окно ──
    const winW = Math.min(width * 0.4, 1.6);
    const winH = Math.min(height * 0.5, 1.4);
    const winY = height * 0.58;
    const winX = width / 2;
    const frameMat = new THREE.MeshStandardMaterial({ color: S.trim, roughness: 0.4 });
    const ft = 0.06;
    // Рама окна
    [[winW + ft*2, ft, winY + winH/2 + ft/2], [winW + ft*2, ft, winY - winH/2 - ft/2]].forEach(([fw, _, fz]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, ft, 0.08), frameMat);
      f.position.set(winX, fz, 0.04); scene.add(f);
    });
    [[ft, winH, winX - winW/2 - ft/2], [ft, winH, winX + winW/2 + ft/2]].forEach(([_, fh, fx]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(ft, fh, 0.08), frameMat);
      f.position.set(fx, winY, 0.04); scene.add(f);
    });
    // Стекло
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(winW, winH, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.18, roughness: 0.05 })
    );
    glass.position.set(winX, winY, 0.02); scene.add(glass);
    // Свет из окна
    const winLight = new THREE.RectAreaLight(S.window.color, S.window.int, winW * 0.9, winH * 0.9);
    winLight.position.set(winX, winY, 0.4);
    winLight.lookAt(winX, winY, 5);
    scene.add(winLight);

    // ── Мебель ──
    if (design?.furniture?.length > 0) {
      design.furniture.forEach((item: any) => buildFurnitureItem(scene, item, width, length));
    } else {
      // Демо-комната
      buildBed(scene, width * 0.5, length * 0.22, 1.6, 2.0, S.wall === 0x0D0D1A ? 0x2A2A4A : 0x8B7355);
      buildNightstand(scene, width * 0.18, length * 0.14, S.wall === 0x0D0D1A ? 0x1A1A2E : 0x7A6345);
      buildWardrobe(scene, width * 0.12, length * 0.55, 1.0, 0.5, 2.0, S.wall === 0x0D0D1A ? 0x1A1A2E : 0x9A8365);
      buildLamp(scene, width * 0.82, length * 0.72, S.wall === 0x0D0D1A ? 0x2A2A4A : 0x7A6345);
      buildPlant(scene, width * 0.88, length * 0.88, 0x5A3A1A);
      buildRug(scene, width * 0.5, length * 0.48, width * 0.6, length * 0.35, S.floor);
    }

    // ── Анимация + динамическая прозрачность стен ──
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();

      // Делаем правую стену прозрачной если камера за ней
      const camX = camera.position.x;
      const camZ = camera.position.z;
      const targetOpacity = (camX > width * 0.7 || camZ > length * 0.7) ? 0.06 : 0.08;
      rightWallMat.opacity += (targetOpacity - rightWallMat.opacity) * 0.1;
      frontWallMat.opacity += (targetOpacity - frontWallMat.opacity) * 0.1;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) mountRef.current.removeChild(renderer.domElement);
    };
  }, [width, length, height, style]);

  const furniture = aiDesign?.furniture || [];

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="flex items-center gap-4">
          <a href="/result" className="text-xs text-gray-500 hover:text-violet-400 transition">← Назад к рендерам</a>
          <div className="text-right">
            <div className="text-sm font-medium text-violet-400">{style}</div>
            <div className="text-xs text-gray-500">{width}м × {length}м × {height}м</div>
          </div>
        </div>
      </nav>

      <div className="flex flex-col items-center px-4 py-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1">Твоя комната в 3D</h1>
          <p className="text-gray-500 text-sm">Зажми и тяни · Колёсико для зума · Правая кнопка для панорамы</p>
        </div>

        <div ref={mountRef} className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: '65vh' }} />

        {furniture.length > 0 && (
          <div className="w-full max-w-3xl mt-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Мебель из этого дизайна</h2>
              <a href="https://jysk.md/ru" target="_blank" className="text-xs text-gray-500 hover:text-violet-400 transition">jysk.md →</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {furniture.map((item: any, i: number) => (
                <a key={i}
                  href={item.jysk_url || 'https://jysk.md/ru'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white/5 border border-white/10 rounded-xl p-3 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/20" style={{ backgroundColor: item.color || '#888' }} />
                    <div className="text-xs font-medium text-gray-300 group-hover:text-white transition truncate">
                      {item.jysk_name || item.name}
                    </div>
                  </div>
                  <div className="text-violet-400 font-semibold text-xs">{item.jysk_price || '—'}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 text-center pb-8">
          <p className="text-gray-500 text-sm mb-3">Нравится? Сделаем персональный концепт для твоей комнаты</p>
          <a href="/" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-3 rounded-full font-semibold text-sm">
            Заказать свой дизайн
          </a>
        </div>
      </div>

      {showToast && aiDesign?.concept && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-[#1a1a2e] border border-violet-500/30 rounded-2xl px-5 py-4 shadow-2xl shadow-violet-500/10">
            <div className="text-xs text-violet-400 font-medium mb-1">✨ Концепт дизайна</div>
            <p className="text-sm text-gray-300 leading-relaxed">{aiDesign.concept}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Viewer() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#08080F] flex items-center justify-center"><div className="text-white/40 text-sm animate-pulse">Загружаем 3D...</div></div>}>
      <ViewerContent />
    </Suspense>
  );
}
