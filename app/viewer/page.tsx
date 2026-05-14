'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const width = parseFloat(searchParams.get('width') || '4');
  const length = parseFloat(searchParams.get('length') || '5');
  const height = parseFloat(searchParams.get('height') || '2.7');
  const style = searchParams.get('style') || 'Минимализм';

  const styleColors: Record<string, {wall: number, floor: number, accent: number, furniture: number}> = {
    'Минимализм': { wall: 0xF5F5F0, floor: 0xD4C5A9, accent: 0x2C2C2C, furniture: 0xE8E0D0 },
    'Скандинавский': { wall: 0xFFFFFF, floor: 0xC8B89A, accent: 0x4A90A4, furniture: 0xF0EBE3 },
    'Cozy / Уютный': { wall: 0xF5E6D3, floor: 0x8B6914, accent: 0xCC7722, furniture: 0x8B4513 },
    'Gaming Setup': { wall: 0x1A1A2E, floor: 0x16213E, accent: 0x7F77DD, furniture: 0x0F3460 },
    'Индустриальный': { wall: 0x8B8B8B, floor: 0x4A4A4A, accent: 0xCC4400, furniture: 0x5C5C5C },
  };

  const colors = styleColors[style] || styleColors['Минимализм'];

  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 15, 60);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(width * 0.8, height * 1.2, length * 0.9);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(width / 2, height / 3, length / 2);

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(width, height * 2, length);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const warmLight = new THREE.PointLight(0xffaa44, 1, width * 3);
    warmLight.position.set(width * 0.2, height * 0.8, length * 0.2);
    scene.add(warmLight);

    // Материалы по стилю
    const wallMat = new THREE.MeshLambertMaterial({ color: colors.wall });
    const floorMat = new THREE.MeshLambertMaterial({ color: colors.floor });
    const furnitureMat = new THREE.MeshLambertMaterial({ color: colors.furniture });
    const accentMat = new THREE.MeshLambertMaterial({ color: colors.accent });

    // ПОЛ
    const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length), floorMat);
    floor.position.set(width / 2, 0, length / 2);
    floor.receiveShadow = true;
    scene.add(floor);

    // СТЕНЫ
    // Задняя стена
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.15), wallMat);
    backWall.position.set(width / 2, height / 2, 0);
    scene.add(backWall);

    // Левая стена
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, length), wallMat);
    leftWall.position.set(0, height / 2, length / 2);
    scene.add(leftWall);

    // Правая стена (полупрозрачная чтобы видеть внутри)
    const rightWallMat = new THREE.MeshLambertMaterial({ color: colors.wall, transparent: true, opacity: 0.3 });
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, height, length), rightWallMat);
    rightWall.position.set(width, height / 2, length / 2);
    scene.add(rightWall);

    // МЕБЕЛЬ — масштабируется под размер комнаты
    const scale = Math.min(width, length) / 5;

    // Кровать / диван
    const bedW = Math.min(2 * scale, width * 0.45);
    const bedL = Math.min(1.8 * scale, length * 0.3);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.4 * scale, bedL), furnitureMat);
    bed.position.set(bedW / 2 + 0.3, 0.2 * scale, bedL / 2 + 0.3);
    bed.castShadow = true;
    scene.add(bed);

    // Изголовье
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.8 * scale, 0.1), accentMat);
    headboard.position.set(bedW / 2 + 0.3, 0.7 * scale, 0.35);
    scene.add(headboard);

    // Подушки
    const pillowGeo = new THREE.BoxGeometry(0.5 * scale, 0.15 * scale, 0.4 * scale);
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    [0.3, 0.9].forEach(offset => {
      const pillow = new THREE.Mesh(pillowGeo, pillowMat);
      pillow.position.set(bedW / 2 + 0.3 - bedW / 2 + offset * scale, 0.45 * scale, bedL * 0.2 + 0.3);
      scene.add(pillow);
    });

    // Стол
    const deskW = Math.min(1.5 * scale, width * 0.35);
    const deskD = Math.min(0.7 * scale, length * 0.15);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(deskW, 0.05, deskD), accentMat);
    desk.position.set(width - deskW / 2 - 0.3, 0.75 * scale, deskD / 2 + 0.3);
    scene.add(desk);

    // Ножки стола
    [[deskW / 2 - 0.05, deskD / 2 - 0.05], [-deskW / 2 + 0.05, deskD / 2 - 0.05],
     [deskW / 2 - 0.05, -deskD / 2 + 0.05], [-deskW / 2 + 0.05, -deskD / 2 + 0.05]
    ].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75 * scale, 0.05), accentMat);
      leg.position.set(width - deskW / 2 - 0.3 + dx, 0.375 * scale, deskD / 2 + 0.3 + dz);
      scene.add(leg);
    });

    // Монитор
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.5 * scale, 0.05), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    monitor.position.set(width - deskW / 2 - 0.3, 1.1 * scale, 0.35);
    scene.add(monitor);

    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.75 * scale, 0.45 * scale, 0.02), new THREE.MeshLambertMaterial({ color: 0x4466ff, emissive: 0x2233aa }));
    screen.position.set(width - deskW / 2 - 0.3, 1.1 * scale, 0.33);
    scene.add(screen);

    // Ковёр
    const rugW = Math.min(width * 0.5, 3);
    const rugL = Math.min(length * 0.4, 2.5);
    const rug = new THREE.Mesh(new THREE.BoxGeometry(rugW, 0.03, rugL), new THREE.MeshLambertMaterial({ color: colors.accent }));
    rug.position.set(width / 2, 0.05, length / 2);
    scene.add(rug);

    // Растение
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * scale, 0.08 * scale, 0.2 * scale, 8), new THREE.MeshLambertMaterial({ color: 0xCC7722 }));
    pot.position.set(width - 0.3, 0.1 * scale, length - 0.3);
    scene.add(pot);

    const plant = new THREE.Mesh(new THREE.SphereGeometry(0.25 * scale, 8, 8), new THREE.MeshLambertMaterial({ color: 0x228B22 }));
    plant.position.set(width - 0.3, 0.45 * scale, length - 0.3);
    scene.add(plant);

    // Полка
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1 * scale, 0.05, 0.25 * scale), accentMat);
    shelf.position.set(0.6 * scale, height * 0.65, 0.2);
    scene.add(shelf);

    // Книги на полке
    [0xCC4444, 0x44AA44, 0x4444CC, 0xCCAA00].forEach((color, i) => {
      const book = new THREE.Mesh(new THREE.BoxGeometry(0.08 * scale, 0.22 * scale, 0.2 * scale), new THREE.MeshLambertMaterial({ color }));
      book.position.set(0.2 * scale + i * 0.18 * scale, height * 0.65 + 0.14 * scale, 0.2);
      scene.add(book);
    });

    // Размерные метки (линии)
    const lineMat = new THREE.LineBasicMaterial({ color: 0x7F77DD, transparent: true, opacity: 0.4 });
    const points = [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(width, 0.02, 0),
      new THREE.Vector3(width, 0.02, length),
      new THREE.Vector3(0, 0.02, length),
      new THREE.Vector3(0, 0.02, 0),
    ];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    scene.add(new THREE.Line(lineGeo, lineMat));

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

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="text-sm text-gray-400 text-right">
          <div>Стиль: <span className="text-violet-400">{style}</span></div>
          <div>{width}м × {length}м × {height}м</div>
        </div>
      </nav>

      <div className="flex flex-col items-center px-8 py-6">
        <h1 className="text-2xl font-bold mb-2">Твоя комната в 3D</h1>
        <p className="text-gray-400 text-sm mb-6">
          Зажми и тяни мышкой чтобы крутить · Колёсико для зума
        </p>

        <div ref={mountRef} className="w-full rounded-2xl overflow-hidden border border-white/10" style={{ height: '65vh' }} />

        <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-lg">
          {[
            { name: 'Кровать', price: '€299', color: 'bg-violet-500/20 border-violet-500/30' },
            { name: 'Стол', price: '€189', color: 'bg-blue-500/20 border-blue-500/30' },
            { name: 'Ковёр', price: '€89', color: 'bg-green-500/20 border-green-500/30' },
          ].map((item, i) => (
            <div key={i} className={`${item.color} border rounded-xl p-3 text-center`}>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-gray-400 mt-1">{item.price}</div>
              <a href={`https://www.ikea.com/search/?q=${item.name}`} target="_blank" className="text-xs text-violet-400 mt-2 block hover:underline">Купить →</a>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-400 text-sm mb-4">Нравится этот стиль? Сделаем такой же для твоей комнаты</p>
          <a href="/" className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-3 rounded-full font-semibold">
            Заказать свой концепт
          </a>
        </div>
      </div>
    </div>
  );
}