'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FURNITURE_URLS: Record<string, string> = {
  bed: 'https://mobvaro.md/ru/krovati/',
  sofa: 'https://mobvaro.md/ru/myagkaya-mebel/',
  wardrobe: 'https://mobvaro.md/ru/shkafy/',
  desk: 'https://mobvaro.md/ru/kompyuternye-stoly/',
  chair: 'https://mobvaro.md/ru/ofisные-kresla/',
  table: 'https://mobvaro.md/ru/zhurnalnye-stoly/',
  shelf: 'https://mobvaro.md/ru/biblioteki-i-etazhery/',
  lamp: 'https://jysk.md/ru/category/iluminat-225',
  rug: 'https://jysk.md/ru/category/covoare-213',
  plant: 'https://jysk.md/ru/category/obiecte-decorative-231',
};

const STYLES: Record<string, any> = {
  'Минимализм': {
    bg: 0x1C1C24, wall: 0xF4F0EA, floor: 0xC8B89A, floorDark: 0xA89070,
    ceiling: 0xFAF8F5, accent: 0x2A2A2A,
    ambient: { color: 0xFFF5E6, int: 0.5 }, sun: { color: 0xFFF0D0, int: 1.4 },
    fill: { color: 0xE8F0FF, int: 0.35 }, lampColor: 0xFFAA44, lampInt: 2.5,
    windowColor: 0xCCE8FF, windowInt: 4,
  },
  'Скандинавский': {
    bg: 0x141E2E, wall: 0xFFFFFF, floor: 0xD4B896, floorDark: 0xB89070,
    ceiling: 0xFAFAFA, accent: 0x4A7C8A,
    ambient: { color: 0xF0F8FF, int: 0.6 }, sun: { color: 0xFFFFFF, int: 1.2 },
    fill: { color: 0xD0E8FF, int: 0.45 }, lampColor: 0x88CCFF, lampInt: 2,
    windowColor: 0xE8F4FF, windowInt: 5,
  },
  'Cozy / Уютный': {
    bg: 0x0E0A06, wall: 0xE8D5B7, floor: 0x7A5C3A, floorDark: 0x5A3C1A,
    ceiling: 0xF0E6D3, accent: 0x8B4513,
    ambient: { color: 0xFF9944, int: 0.4 }, sun: { color: 0xFFCC66, int: 0.9 },
    fill: { color: 0xFF6600, int: 0.15 }, lampColor: 0xFF7700, lampInt: 3.5,
    windowColor: 0xFFAA55, windowInt: 2.5,
  },
  'Gaming Setup': {
    bg: 0x050510, wall: 0x0D0D1A, floor: 0x1A1A2E, floorDark: 0x111120,
    ceiling: 0x080810, accent: 0x7F77DD,
    ambient: { color: 0x2200FF, int: 0.2 }, sun: { color: 0x8866FF, int: 0.5 },
    fill: { color: 0x00FFFF, int: 0.25 }, lampColor: 0x7F77DD, lampInt: 4,
    windowColor: 0x5533FF, windowInt: 3,
  },
  'Индустриальный': {
    bg: 0x0C0C0C, wall: 0x7A7A7A, floor: 0x3D3D3D, floorDark: 0x2A2A2A,
    ceiling: 0x666666, accent: 0xCC4400,
    ambient: { color: 0xFFA060, int: 0.35 }, sun: { color: 0xFFD0A0, int: 1.1 },
    fill: { color: 0xFF8844, int: 0.25 }, lampColor: 0xFF6600, lampInt: 3,
    windowColor: 0xFFCC88, windowInt: 3,
  },
};

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

const MODEL_MAP: Record<string, string> = {
  bed: '/models/bedDouble.glb',
  sofa: '/models/loungeSofa.glb',
  chair: '/models/chairModernFrameCushion.glb',
  desk: '/models/desk.glb',
  wardrobe: '/models/bookcaseClosedDoors.glb',
  shelf: '/models/bookcaseOpen.glb',
  table: '/models/cabinetTelevision.glb',
  lamp: '/models/lampSquareFloor.glb',
  plant: '/models/plantSmall1.glb',
  nightstand: '/models/cabinetBedDrawer.glb',
};

function buildFurniture(scene: THREE.Scene, item: any, S: any, roomW: number, roomL: number) {
  const color = item.color ? hexToInt(item.color) : S.accent;
  const w = Math.min(item.width ?? 1, roomW * 0.7);
  const d = Math.min(item.depth ?? 0.6, roomL * 0.7);
  const h = item.height ?? 0.8;
  const x = Math.max(w/2 + 0.2, Math.min(roomW - w/2 - 0.2, item.x ?? roomW/2));
  const z = Math.max(d/2 + 0.2, Math.min(roomL - d/2 - 0.2, item.z ?? roomL/2));

  const modelPath = MODEL_MAP[item.type];

  if (modelPath) {
    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((child: any) => {
          if (child.isMesh) {
            child.material = child.material.clone();
            child.material.color.setHex(color);
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        // Масштабируем под реальные размеры
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = Math.min(w / size.x, d / size.z, h / size.y);
        model.scale.set(scale, scale, scale);
        // Ставим на пол
        const box2 = new THREE.Box3().setFromObject(model);
        model.position.set(x, -box2.min.y * scale, z);
        scene.add(model);
      },
      undefined,
      () => {
        // Fallback если модель не загрузилась
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, h/2, z);
        mesh.castShadow = true;
        scene.add(mesh);
      }
    );
    return;
  }

  // Fallback для rug (нет модели)
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  if (item.type === 'rug') {
    const rug = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), mat);
    rug.position.set(x, 0.01, z);
    rug.receiveShadow = true;
    scene.add(rug);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    box.position.set(x, h/2, z);
    box.castShadow = true;
    scene.add(box);
  }
}

export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const [aiDesign, setAiDesign] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    const d = localStorage.getItem('roomDesign');
    if (d) console.log('FURNITURE:', JSON.stringify(JSON.parse(d).furniture, null, 2));
  }, []);

  const width = parseFloat(searchParams.get('width') || '4');
  const length = parseFloat(searchParams.get('length') || '5');
  const height = parseFloat(searchParams.get('height') || '2.7');
  const style = searchParams.get('style') || 'Минимализм';

  useEffect(() => {
    try {
      const saved = localStorage.getItem('roomDesign');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAiDesign(parsed);
        if (parsed.concept) {
          setShowToast(true);
          setTimeout(() => setShowToast(false), 6000);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const S = STYLES[style] || STYLES['Минимализм'];
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(S.bg);
    scene.fog = new THREE.FogExp2(S.bg, 0.03);

    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 100);
    camera.position.set(width * 0.8, height * 0.95, length * 0.88);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI / 2.08;
    controls.minDistance = 1.5;
    controls.maxDistance = Math.max(width, length) * 2.5;
    controls.target.set(width / 2, height * 0.28, length / 2);

    // Освещение
    scene.add(new THREE.AmbientLight(S.ambient.color, S.ambient.int));
    const sun = new THREE.DirectionalLight(S.sun.color, S.sun.int);
    sun.position.set(width * 0.7, height * 2.5, length * 0.3);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -width; sun.shadow.camera.right = width * 2;
    sun.shadow.camera.top = height * 2; sun.shadow.camera.bottom = -1;
    sun.shadow.bias = -0.001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(S.fill.color, S.fill.int);
    fill.position.set(-width * 0.5, height, length * 0.8);
    scene.add(fill);
    const lamp = new THREE.PointLight(S.lampColor, S.lampInt, Math.max(width, length));
    lamp.position.set(width * 0.15, height * 0.72, length * 0.12);
    lamp.castShadow = true;
    scene.add(lamp);
    const design = (() => { try { const s = localStorage.getItem('roomDesign'); return s ? JSON.parse(s) : null; } catch { return null; } })();
    const wallColor = design?.colors?.walls ? hexToInt(design.colors.walls) : S.wall;
    const floorColor = design?.colors?.floor ? hexToInt(design.colors.floor) : S.floor;
    // Пол
    const boardW = 0.18;
    const cols = Math.ceil(width / boardW);
    for (let i = 0; i < cols; i++) {
      const bMat = new THREE.MeshStandardMaterial({
  color: i % 3 === 1 ? Math.max(0, floorColor - 0x151515) : floorColor, roughness: 0.75, metalness: 0.02
});
      const board = new THREE.Mesh(new THREE.BoxGeometry(boardW - 0.01, 0.04, length), bMat);
      board.position.set(i * boardW + boardW / 2, 0.02, length / 2);
      board.receiveShadow = true;
      scene.add(board);
    }

    // Потолок
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length),
      new THREE.MeshStandardMaterial({ color: S.ceiling, roughness: 1 }));
    ceil.position.set(width / 2, height + 0.05, length / 2);
    scene.add(ceil);

    // Стены
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), wallMat);
    backWall.position.set(width / 2, height / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, length), wallMat);
    leftWall.position.set(0, height / 2, length / 2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    const rightMat = new THREE.MeshStandardMaterial({ color: wallColor, transparent: true, opacity: 0.12 });
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, length), rightMat);
    rightWall.position.set(width, height / 2, length / 2);
    scene.add(rightWall);

    // Плинтус
    const trimMat = new THREE.MeshStandardMaterial({ color: S.ceiling, roughness: 0.5 });
    const trim1 = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, 0.08), trimMat);
    trim1.position.set(width / 2, 0.05, 0.04);
    scene.add(trim1);
    const trim2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, length), trimMat);
    trim2.position.set(0.04, 0.05, length / 2);
    scene.add(trim2);

    // Окно
    const winW = Math.min(width * 0.38, 1.5);
    const winH = Math.min(height * 0.48, 1.3);
    const winY = height * 0.56;
    const winX = width / 2;
    const frameMat = new THREE.MeshStandardMaterial({ color: S.ceiling, roughness: 0.5 });
    const fT = 0.07;
    [[winW + fT*2, fT, winY + winH/2 + fT/2], [winW + fT*2, fT, winY - winH/2 - fT/2]].forEach(([fw, fh, fz]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.1), frameMat);
      f.position.set(winX, fz as number, 0.06); scene.add(f);
    });
    [[fT, winH, winX - winW/2 - fT/2], [fT, winH, winX + winW/2 + fT/2]].forEach(([fw, fh, fx]) => {
      const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.1), frameMat);
      f.position.set(fx as number, winY, 0.06); scene.add(f);
    });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.2, roughness: 0.05 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.05), glassMat);
    glass.position.set(winX, winY, 0.04);
    scene.add(glass);
    const winLight = new THREE.RectAreaLight(S.windowColor, S.windowInt, winW, winH);
    winLight.position.set(winX, winY, 0.5);
    winLight.lookAt(winX, winY, 5);
    scene.add(winLight);

    // Мебель — умная процедурная расстановка
    const furniture = design?.furniture;

    if (furniture?.length > 0) {
      const placed: { x: number; z: number; w: number; d: number }[] = [];

      function overlaps(x: number, z: number, w: number, d: number): boolean {
        const margin = 0.4;
        return placed.some(p =>
          Math.abs(p.x - x) < (p.w + w) / 2 + margin &&
          Math.abs(p.z - z) < (p.d + d) / 2 + margin
        );
      }

      function findPosition(w: number, d: number, zones: {x: number, z: number}[]): {x: number, z: number} | null {
        for (const zone of zones) {
          const x = Math.max(w/2 + 0.2, Math.min(width - w/2 - 0.2, zone.x));
          const z = Math.max(d/2 + 0.2, Math.min(length - d/2 - 0.2, zone.z));
          if (!overlaps(x, z, w, d)) return { x, z };
          // Пробуем соседние позиции
          for (let dx = -1; dx <= 1; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              const nx = Math.max(w/2 + 0.2, Math.min(width - w/2 - 0.2, zone.x + dx * 0.8));
              const nz = Math.max(d/2 + 0.2, Math.min(length - d/2 - 0.2, zone.z + dz * 0.8));
              if (!overlaps(nx, nz, w, d)) return { x: nx, z: nz };
            }
          }
        }
        return null;
      }

      // Зоны по типу мебели
      const ZONES: Record<string, {x: number, z: number}[]> = {
  bed:      [{ x: width*0.5,  z: length*0.22 }, { x: width*0.5, z: length*0.3 }],
  sofa:     [{ x: width*0.5,  z: length*0.18 }, { x: width*0.5, z: length*0.25 }],
  wardrobe: [{ x: width*0.12, z: length*0.25 }, { x: width*0.88, z: length*0.25 }],
  desk:     [{ x: width*0.25, z: length*0.35 }, { x: width*0.75, z: length*0.35 }],
  chair:    [{ x: width*0.35, z: length*0.5  }, { x: width*0.65, z: length*0.5  }],
  table:    [{ x: width*0.5,  z: length*0.55 }, { x: width*0.4,  z: length*0.6  }],
  shelf: [{ x: width*0.2, z: length*0.02 }, { x: width*0.8, z: length*0.02 }],
  rug:      [{ x: width*0.5,  z: length*0.5  }, { x: width*0.5,  z: length*0.45 }],
  lamp:     [{ x: width*0.12, z: length*0.65 }, { x: width*0.88, z: length*0.65 }],
  plant:    [{ x: width*0.88, z: length*0.88 }, { x: width*0.12, z: length*0.88 }],
  nightstand:[{ x: width*0.7, z: length*0.12 }, { x: width*0.3,  z: length*0.12 }],
};

      // Порядок расстановки: сначала крупная мебель
      const ORDER = ['bed','sofa','wardrobe','desk','table','rug','shelf','chair','lamp','plant','nightstand'];
      const sorted = [...furniture].sort((a, b) => {
        const ai = ORDER.indexOf(a.type);
        const bi = ORDER.indexOf(b.type);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

        sorted.forEach((item: any) => {
        const w = Math.min(item.width ?? 1, width * 0.7);
        const d = Math.min(item.depth ?? 0.6, length * 0.7);
        const zones = ZONES[item.type] || [{ x: width/2, z: length/2 }];
        const pos = findPosition(w, d, zones);
        if (pos) {
          item.x = pos.x;
          item.z = pos.z;
          placed.push({ x: pos.x, z: pos.z, w, d });
        }
        buildFurniture(scene, item, S, width, length);
      });
    } else {
      const defMat = new THREE.MeshStandardMaterial({ color: S.accent, roughness: 0.7 });
      const bed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 2.0), defMat);
      bed.position.set(1.2, 0.2, 1.2);
      bed.castShadow = true;
      scene.add(bed);
    }

    // Анимация
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
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
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
    };
  }, [width, length, height, style]);

  const design = aiDesign;
  const furniture = design?.furniture || [];

  return (
    <div className="min-h-screen bg-[#08080F] text-white">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="text-right">
          <div className="text-sm font-medium text-violet-400">{style}</div>
          <div className="text-xs text-gray-500">{width}м × {length}м × {height}м</div>
        </div>
      </nav>

      <div className="flex flex-col items-center px-4 py-4">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-1">Твоя комната в 3D</h1>
          <p className="text-gray-500 text-sm">Зажми и тяни · Колёсико для зума · Правая кнопка для панорамы</p>
        </div>

        <div ref={mountRef} className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ height: '63vh' }} />

        <div className="w-full max-w-3xl mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">Мебель из этого дизайна</h2>
            <a href="https://mobvaro.md/ru/" target="_blank" className="text-xs text-gray-500 hover:text-violet-400 transition">mobvaro.md →</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {furniture.map((item: any, i: number) => (
              <a key={i} href={item.jysk_url || item.shop_url || FURNITURE_URLS[item.type] || 'https://jysk.md/ru'}
                className="group bg-white/5 border border-white/10 rounded-xl p-3 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-sm flex-shrink-0 border border-white/10" style={{ backgroundColor: item.color || '#888' }} />
                  <div className="text-xs font-medium text-gray-300 group-hover:text-white transition truncate">
                    {item.jysk_name || item.name}
                  </div>
                </div>
                <div className="text-violet-400 font-semibold text-sm">{item.jysk_price || item.price || '—'}</div>
                <div className="text-xs text-gray-600 mt-1 group-hover:text-gray-400 transition">Смотреть в магазине →</div>
              </a>
            ))}
          </div>
        </div>

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