'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;

    // Сцена
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 10, 50);

    // Камера
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.set(5, 4, 7);

    // Рендерер
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Контролы (вращение мышкой)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2;

    // Освещение
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const warmLight = new THREE.PointLight(0xffaa44, 1.5, 10);
    warmLight.position.set(-2, 3, -2);
    scene.add(warmLight);

    // Материалы
    const floorMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xF5F0E8 });
    const bedMat = new THREE.MeshLambertMaterial({ color: 0x4A4A6A });
    const sheetMat = new THREE.MeshLambertMaterial({ color: 0xE8E8F0 });
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x6B4E35 });
    const rugMat = new THREE.MeshLambertMaterial({ color: 0x7B68EE });

    // Пол
    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), floorMat);
    floor.position.y = -0.1;
    floor.receiveShadow = true;
    scene.add(floor);

    // Стены
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(10, 6, 0.2), wallMat);
    backWall.position.set(0, 3, -5);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 6, 10), wallMat);
    leftWall.position.set(-5, 3, 0);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Ковёр
    const rug = new THREE.Mesh(new THREE.BoxGeometry(4, 0.05, 3), rugMat);
    rug.position.set(1, 0.05, 1);
    scene.add(rug);

    // Кровать — основание
    const bedBase = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 2), bedMat);
    bedBase.position.set(-2, 0.2, -2);
    bedBase.castShadow = true;
    scene.add(bedBase);

    // Кровать — матрас
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 1.8), sheetMat);
    mattress.position.set(-2, 0.55, -2);
    scene.add(mattress);

    // Кровать — изголовье
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(3, 1.2, 0.15), bedMat);
    headboard.position.set(-2, 1, -2.9);
    headboard.castShadow = true;
    scene.add(headboard);

    // Подушки
    const pillowGeo = new THREE.BoxGeometry(0.8, 0.2, 0.6);
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xD4D4E8 });
    [-2.5, -1.5].forEach(x => {
      const pillow = new THREE.Mesh(pillowGeo, pillowMat);
      pillow.position.set(x, 0.75, -2.6);
      scene.add(pillow);
    });

    // Стол
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 1), deskMat);
    deskTop.position.set(2, 1.5, -3.5);
    deskTop.castShadow = true;
    scene.add(deskTop);

    // Ножки стола
    [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), deskMat);
      leg.position.set(2 + dx, 0.75, -3.5 + dz);
      scene.add(leg);
    });

    // Монитор
    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.8, 0.05),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    monitor.position.set(2, 2.2, -3.9);
    scene.add(monitor);

    // Экран монитора
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.7, 0.01),
      new THREE.MeshLambertMaterial({ color: 0x4466ff, emissive: 0x2233aa })
    );
    screen.position.set(2, 2.2, -3.87);
    scene.add(screen);

    // Лампа на столе
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.15, 0.05, 8),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    lampBase.position.set(2.8, 1.55, -3.8);
    scene.add(lampBase);

    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.6, 8),
      new THREE.MeshLambertMaterial({ color: 0x888888 })
    );
    lampPole.position.set(2.8, 1.85, -3.8);
    scene.add(lampPole);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.3, 8),
      new THREE.MeshLambertMaterial({ color: 0xFFDD88 })
    );
    lampShade.position.set(2.8, 2.3, -3.8);
    lampShade.rotation.x = Math.PI;
    scene.add(lampShade);

    const lampLight = new THREE.PointLight(0xffee88, 1, 3);
    lampLight.position.set(2.8, 2.1, -3.8);
    scene.add(lampLight);

    // Полка
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.08, 0.3),
      deskMat
    );
    shelf.position.set(-4.5, 3.5, -1);
    scene.add(shelf);

    // Книги на полке
    const bookColors = [0xCC4444, 0x44AA44, 0x4444CC, 0xCCAA00];
    bookColors.forEach((color, i) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.35, 0.25),
        new THREE.MeshLambertMaterial({ color })
      );
      book.position.set(-4.85 + i * 0.28, 3.72, -1);
      scene.add(book);
    });

    // Растение
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.12, 0.3, 8),
      new THREE.MeshLambertMaterial({ color: 0xCC7722 })
    );
    pot.position.set(3.5, 0.15, -4);
    scene.add(pot);

    const plant = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x228B22 })
    );
    plant.position.set(3.5, 0.65, -4);
    scene.add(plant);

    // Анимация
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
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
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <nav className="flex justify-between items-center px-8 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <span className="text-sm text-gray-400">Демо-комната · Минималистичная спальня</span>
      </nav>

      <div className="flex flex-col items-center px-8 py-6">
        <h1 className="text-2xl font-bold mb-2">Твой 3D-концепт готов</h1>
        <p className="text-gray-400 text-sm mb-6">
          Зажми и тяни мышкой чтобы крутить · Колёсико для зума
        </p>

        <div
          ref={mountRef}
          className="w-full rounded-2xl overflow-hidden border border-white/10"
          style={{ height: '70vh' }}
        />

        <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-lg">
          {[
            { name: 'Кровать', price: '€299', color: 'bg-violet-500/20 border-violet-500/30' },
            { name: 'Стол', price: '€189', color: 'bg-blue-500/20 border-blue-500/30' },
            { name: 'Ковёр', price: '€89', color: 'bg-green-500/20 border-green-500/30' },
          ].map((item, i) => (
            <div key={i} className={`${item.color} border rounded-xl p-3 text-center`}>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-gray-400 mt-1">{item.price}</div>
              <button className="text-xs text-violet-400 mt-2 hover:underline">Купить →</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}