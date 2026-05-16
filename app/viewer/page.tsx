'use client';
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const JYSK_CATALOG: Record<string, { name: string; price: string; url: string; color: string }[]> = {
  'Минимализм': [
    { name: 'Кровать HVEN 160×200', price: '5 999 MDL', url: 'https://jysk.md/dormitor/paturi', color: '#E8E0D0' },
    { name: 'Стол THYGE 120×60', price: '2 499 MDL', url: 'https://jysk.md/birou/birouri', color: '#C8B89A' },
    { name: 'Ковёр TEBSTRUP 160×230', price: '1 299 MDL', url: 'https://jysk.md/textile/covoare', color: '#D4C5B0' },
    { name: 'Шкаф TVILUM 3 двери', price: '4 999 MDL', url: 'https://jysk.md/dormitor/dulapuri', color: '#F0EBE3' },
    { name: 'Тумба NATTDAL', price: '799 MDL', url: 'https://jysk.md/dormitor/noptiere', color: '#E0D8C8' },
    { name: 'Лампа NITTA настольная', price: '449 MDL', url: 'https://jysk.md/iluminat/lampi-de-masa', color: '#FFD580' },
  ],
  'Скандинавский': [
    { name: 'Кровать RAMBERG 140×200', price: '4 799 MDL', url: 'https://jysk.md/dormitor/paturi', color: '#F5F0E8' },
    { name: 'Стол HORNSLET 140×70', price: '3 299 MDL', url: 'https://jysk.md/birou/birouri', color: '#D4B896' },
    { name: 'Ковёр HAMPEN 160×230', price: '1 599 MDL', url: 'https://jysk.md/textile/covoare', color: '#8FB5C4' },
    { name: 'Шкаф HAUGA 3 двери', price: '5 499 MDL', url: 'https://jysk.md/dormitor/dulapuri', color: '#FFFFFF' },
    { name: 'Кресло SKOVBY', price: '2 199 MDL', url: 'https://jysk.md/living/fotolii', color: '#E8E0D0' },
    { name: 'Лампа GULV напольная', price: '899 MDL', url: 'https://jysk.md/iluminat/lampi-de-podea', color: '#F5E6C8' },
  ],
  'Cozy / Уютный': [
    { name: 'Кровать SENGBAK 160×200', price: '6 299 MDL', url: 'https://jysk.md/dormitor/paturi', color: '#8B4513' },
    { name: 'Диван FASTER 3-местный', price: '9 999 MDL', url: 'https://jysk.md/living/canapele', color: '#6B3A2A' },
    { name: 'Ковёр LANGSTED 160×230', price: '1 899 MDL', url: 'https://jysk.md/textile/covoare', color: '#CC7722' },
    { name: 'Шкаф WESTERFIELD дуб', price: '7 499 MDL', url: 'https://jysk.md/dormitor/dulapuri', color: '#8B6914' },
    { name: 'Кресло POMOSE серый', price: '2 799 MDL', url: 'https://jysk.md/living/fotolii', color: '#9E8E7E' },
    { name: 'Лампа TORDENSKJOLD', price: '699 MDL', url: 'https://jysk.md/iluminat/lampi-de-masa', color: '#FFB347' },
  ],
  'Gaming Setup': [
    { name: 'Стол FREDDE игровой', price: '5 999 MDL', url: 'https://jysk.md/birou/birouri', color: '#1A1A2E' },
    { name: 'Кресло VOJENS gaming', price: '4 499 MDL', url: 'https://jysk.md/birou/scaune-de-birou', color: '#7F77DD' },
    { name: 'Полка KALLAX 2×4', price: '1 899 MDL', url: 'https://jysk.md/living/rafturi', color: '#16213E' },
    { name: 'Кровать RAMBERG чёрная', price: '4 999 MDL', url: 'https://jysk.md/dormitor/paturi', color: '#0D0D1A' },
    { name: 'Ковёр TEBSTRUP тёмный', price: '1 299 MDL', url: 'https://jysk.md/textile/covoare', color: '#2D2D4E' },
    { name: 'Лента LED RGB 3м', price: '349 MDL', url: 'https://jysk.md/iluminat', color: '#7F77DD' },
  ],
  'Индустриальный': [
    { name: 'Стол FJÄLLBO металл', price: '3 999 MDL', url: 'https://jysk.md/birou/birouri', color: '#5C5C5C' },
    { name: 'Стеллаж GNEDBY чёрный', price: '2 799 MDL', url: 'https://jysk.md/living/rafturi', color: '#3D3D3D' },
    { name: 'Ковёр STOENSE серый', price: '1 099 MDL', url: 'https://jysk.md/textile/covoare', color: '#4A3728' },
    { name: 'Диван FASTER антрацит', price: '8 999 MDL', url: 'https://jysk.md/living/canapele', color: '#2C2C2C' },
    { name: 'Лампа HEKTAR напольная', price: '1 299 MDL', url: 'https://jysk.md/iluminat/lampi-de-podea', color: '#888888' },
    { name: 'Шкаф PAX антрацит', price: '6 499 MDL', url: 'https://jysk.md/dormitor/dulapuri', color: '#444444' },
  ],
};

const STYLES: Record<string, any> = {
  'Минимализм': {
    bg: 0x1C1C24, wall: 0xF4F0EA, floor: 0xC8B89A, floorDark: 0xA89070,
    ceiling: 0xFAF8F5, accent: 0x2A2A2A, rug: 0xD4C5B0,
    furniture: 0xE8E2D8, furniture2: 0xD0C8B8,
    ambient: { color: 0xFFF5E6, int: 0.5 }, sun: { color: 0xFFF0D0, int: 1.4 },
    fill: { color: 0xE8F0FF, int: 0.35 }, lampColor: 0xFFAA44, lampInt: 2.5,
    windowColor: 0xCCE8FF, windowInt: 4, screenEmissive: 0x2244AA,
  },
  'Скандинавский': {
    bg: 0x141E2E, wall: 0xFFFFFF, floor: 0xD4B896, floorDark: 0xB89070,
    ceiling: 0xFAFAFA, accent: 0x4A7C8A, rug: 0x8FB5C4,
    furniture: 0xF5F0E8, furniture2: 0xE8E0D0,
    ambient: { color: 0xF0F8FF, int: 0.6 }, sun: { color: 0xFFFFFF, int: 1.2 },
    fill: { color: 0xD0E8FF, int: 0.45 }, lampColor: 0x88CCFF, lampInt: 2,
    windowColor: 0xE8F4FF, windowInt: 5, screenEmissive: 0x3355BB,
  },
  'Cozy / Уютный': {
    bg: 0x0E0A06, wall: 0xE8D5B7, floor: 0x7A5C3A, floorDark: 0x5A3C1A,
    ceiling: 0xF0E6D3, accent: 0x8B4513, rug: 0xCC7722,
    furniture: 0x7A4A2A, furniture2: 0x6B3A2A,
    ambient: { color: 0xFF9944, int: 0.4 }, sun: { color: 0xFFCC66, int: 0.9 },
    fill: { color: 0xFF6600, int: 0.15 }, lampColor: 0xFF7700, lampInt: 3.5,
    windowColor: 0xFFAA55, windowInt: 2.5, screenEmissive: 0xAA6611,
  },
  'Gaming Setup': {
    bg: 0x050510, wall: 0x0D0D1A, floor: 0x1A1A2E, floorDark: 0x111120,
    ceiling: 0x080810, accent: 0x7F77DD, rug: 0x3D3580,
    furniture: 0x16213E, furniture2: 0x0F1A30,
    ambient: { color: 0x2200FF, int: 0.2 }, sun: { color: 0x8866FF, int: 0.5 },
    fill: { color: 0x00FFFF, int: 0.25 }, lampColor: 0x7F77DD, lampInt: 4,
    windowColor: 0x5533FF, windowInt: 3, screenEmissive: 0x4455FF,
  },
  'Индустриальный': {
    bg: 0x0C0C0C, wall: 0x7A7A7A, floor: 0x3D3D3D, floorDark: 0x2A2A2A,
    ceiling: 0x666666, accent: 0xCC4400, rug: 0x4A3728,
    furniture: 0x5C5C5C, furniture2: 0x444444,
    ambient: { color: 0xFFA060, int: 0.35 }, sun: { color: 0xFFD0A0, int: 1.1 },
    fill: { color: 0xFF8844, int: 0.25 }, lampColor: 0xFF6600, lampInt: 3,
    windowColor: 0xFFCC88, windowInt: 3, screenEmissive: 0xFF4400,
  },
};export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();

  const width = parseFloat(searchParams.get('width') || '4');
  const length = parseFloat(searchParams.get('length') || '5');
  const height = parseFloat(searchParams.get('height') || '2.7');
  const style = searchParams.get('style') || 'Минимализм';

  const S = STYLES[style] || STYLES['Минимализм'];
  const catalog = JYSK_CATALOG[style] || JYSK_CATALOG['Минимализм'];

  useEffect(() => {
    if (!mountRef.current) return;
    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(S.bg);
    scene.fog = new THREE.FogExp2(S.bg, 0.035);

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
    controls.maxDistance = Math.max(width, length) * 2.2;
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

    // Материалы
    const wallMat = new THREE.MeshStandardMaterial({ color: S.wall, roughness: 0.92 });
    const ceilMat = new THREE.MeshStandardMaterial({ color: S.ceiling, roughness: 1 });
    const furnitureMat = new THREE.MeshStandardMaterial({ color: S.furniture, roughness: 0.7, metalness: 0.05 });
    const accentMat = new THREE.MeshStandardMaterial({ color: S.accent, roughness: 0.5, metalness: 0.15 });
    const rugMat = new THREE.MeshStandardMaterial({ color: S.rug, roughness: 1 });
    const mattressMat = new THREE.MeshStandardMaterial({ color: 0xF5F0E8, roughness: 0.95 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xFFFFFF, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xAAAAAA, roughness: 0.2, metalness: 0.9 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x88CCFF, transparent: true, opacity: 0.2, roughness: 0.05 });

    // Паркетный пол
    const boardW = 0.18;
    const cols = Math.ceil(width / boardW);
    for (let i = 0; i < cols; i++) {
      const bMat = new THREE.MeshStandardMaterial({ color: i % 3 === 1 ? S.floorDark : S.floor, roughness: 0.75, metalness: 0.02 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(boardW - 0.01, 0.04, length), bMat);
      board.position.set(i * boardW + boardW / 2, 0.02, length / 2);
      board.receiveShadow = true;
      scene.add(board);
    }

    // Потолок
    const ceil = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, length), ceilMat);
    ceil.position.set(width / 2, height + 0.05, length / 2);
    scene.add(ceil);

    // Стены
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.12), wallMat);
    backWall.position.set(width / 2, height / 2, 0);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.12, height, length), wallMat);
    leftWall.position.set(0, height / 2, length / 2);
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightMat = new THREE.MeshStandardMaterial({ color: S.wall, transparent: true, opacity: 0.12 });
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
    const glass = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.05), glassMat);
    glass.position.set(winX, winY, 0.04);
    scene.add(glass);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.2, 0.04, 0.2), frameMat);
    sill.position.set(winX, winY - winH/2 - 0.02, 0.12);
    scene.add(sill);
    const winLight = new THREE.RectAreaLight(S.windowColor, S.windowInt, winW, winH);
    winLight.position.set(winX, winY, 0.5);
    winLight.lookAt(winX, winY, 5);
    scene.add(winLight);

    const sc = Math.min(width, length) / 5;

    // КРОВАТЬ
    const bedW = Math.min(1.75 * sc, width * 0.42);
    const bedL = Math.min(2.05 * sc, length * 0.38);
    const bedH = 0.18;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.1, bedH, bedL + 0.1), accentMat);
    frame.position.set(bedW/2 + 0.22, bedH/2, bedL/2 + 0.22);
    frame.castShadow = true;
    scene.add(frame);
    // Ножки кровати
    [[bedW/2-0.07, -bedL/2+0.07], [-bedW/2+0.07, -bedL/2+0.07], [bedW/2-0.07, bedL/2-0.07], [-bedW/2+0.07, bedL/2-0.07]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.12, 8), metalMat);
      leg.position.set(bedW/2+0.22+dx, 0.06, bedL/2+0.22+dz);
      scene.add(leg);
    });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW - 0.06, 0.22, bedL - 0.06), mattressMat);
    mattress.position.set(bedW/2+0.22, bedH + 0.11, bedL/2+0.22);
    mattress.castShadow = true;
    scene.add(mattress);
    const headboard = new THREE.Mesh(new THREE.BoxGeometry(bedW + 0.06, 0.7*sc, 0.14), accentMat);
    headboard.position.set(bedW/2+0.22, bedH + 0.35*sc, 0.29);
    headboard.castShadow = true;
    scene.add(headboard);
    [-bedW/4, bedW/4].forEach(dx => {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.6*sc, 0.14*sc, 0.45*sc), pillowMat);
      pillow.position.set(bedW/2+0.22+dx*0.8, bedH+0.22+0.07*sc, bedL/2+0.22-bedL/2+0.28);
      scene.add(pillow);
    });
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(bedW-0.08, 0.08*sc, bedL*0.55), rugMat);
    blanket.position.set(bedW/2+0.22, bedH+0.22+0.04*sc, bedL/2+0.22+bedL*0.08);
    scene.add(blanket);

    // ТУМБОЧКА
    const ns = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.42), furnitureMat);
    ns.position.set(bedW + 0.68, 0.26, 0.48);
    ns.castShadow = true;
    scene.add(ns);
    const nsHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), metalMat);
    nsHandle.rotation.x = Math.PI / 2;
    nsHandle.position.set(bedW + 0.68, 0.26, 0.25);
    scene.add(nsHandle);
    // Лампа на тумбочке
    const lBase = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12), accentMat);
    lBase.position.set(bedW+0.68, 0.54, 0.48);
    scene.add(lBase);
    const lPole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.32, 8), accentMat);
    lPole.position.set(bedW+0.68, 0.70, 0.48);
    scene.add(lPole);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0xFFF0CC, roughness: 0.8, emissive: 0xFFAA44, emissiveIntensity: 0.4 });
    const lShade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 16), shadeMat);
    lShade.position.set(bedW+0.68, 0.95, 0.48);
    lShade.rotation.x = Math.PI;
    scene.add(lShade);

    // СТОЛ
    const dW = Math.min(1.35*sc, width*0.3);
    const dD = Math.min(0.68*sc, length*0.14);
    const dH = 0.76;
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(dW, 0.04, dD), accentMat);
    deskTop.position.set(width-dW/2-0.18, dH, dD/2+0.18);
    deskTop.castShadow = true;
    scene.add(deskTop);
    [[-dW/2+0.05, -dD/2+0.05], [dW/2-0.05, -dD/2+0.05], [-dW/2+0.05, dD/2-0.05], [dW/2-0.05, dD/2-0.05]].forEach(([dx, dz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.04, dH, 0.04), metalMat);
      leg.position.set(width-dW/2-0.18+dx, dH/2, dD/2+0.18+dz);
      scene.add(leg);
    });
    const monMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.85 });
    const screenMat = new THREE.MeshStandardMaterial({ color: 0x0A1020, emissive: S.screenEmissive, emissiveIntensity: 0.9, roughness: 0.05 });
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.72*sc, 0.42*sc, 0.03), monMat);
    mon.position.set(width-dW/2-0.18, dH+0.24*sc, 0.22);
    mon.castShadow = true;
    scene.add(mon);
    const scr = new THREE.Mesh(new THREE.BoxGeometry(0.68*sc, 0.38*sc, 0.01), screenMat);
    scr.position.set(width-dW/2-0.18, dH+0.24*sc, 0.21);
    scene.add(scr);
    const mBase = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.16), monMat);
    mBase.position.set(width-dW/2-0.18, dH+0.01, 0.26);
    scene.add(mBase);
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.35*sc, 0.02, 0.12*sc), monMat);
    kb.position.set(width-dW/2-0.18, dH+0.025, dD/2+0.18-0.1);
    scene.add(kb);

    // ШКАФ
    const wW = Math.min(1.3, width*0.3);
    const wH = Math.min(height*0.9, 2.25);
    const ward = new THREE.Mesh(new THREE.BoxGeometry(wW, wH, 0.58), furnitureMat);
    ward.position.set(wW/2+0.08, wH/2, length-0.37);
    ward.castShadow = true;
    scene.add(ward);
    [-wW/4, wW/4].forEach(dx => {
      const wH2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), metalMat);
      wH2.rotation.x = Math.PI/2;
      wH2.position.set(wW/2+0.08+dx+0.08, wH/2, length-0.09);
      scene.add(wH2);
    });
    const wBase = new THREE.Mesh(new THREE.BoxGeometry(wW, 0.08, 0.58), accentMat);
    wBase.position.set(wW/2+0.08, 0.04, length-0.37);
    scene.add(wBase);

    // КОВЁР
    const rW = Math.min(width*0.52, 3.2);
    const rL = Math.min(length*0.44, 2.8);
    const rug = new THREE.Mesh(new THREE.BoxGeometry(rW, 0.018, rL), rugMat);
    rug.position.set(width/2, 0.009, length/2);
    rug.receiveShadow = true;
    scene.add(rug);
    const borderMat = new THREE.MeshStandardMaterial({ color: S.accent, roughness: 1 });
    [[rW, 0.02, 0.06, width/2, 0.01, length/2-rL/2+0.03], [rW, 0.02, 0.06, width/2, 0.01, length/2+rL/2-0.03],
     [0.06, 0.02, rL-0.12, width/2-rW/2+0.03, 0.01, length/2], [0.06, 0.02, rL-0.12, width/2+rW/2-0.03, 0.01, length/2]
    ].forEach(([bw, bh, bd, bx, by, bz]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), borderMat);
      b.position.set(bx, by, bz);
      scene.add(b);
    });

    // ПОЛКА
    const shelfW = Math.min(0.95, width*0.22);
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(shelfW, 0.04, 0.24), accentMat);
    shelf.position.set(shelfW/2+0.1, height*0.62, 0.14);
    shelf.castShadow = true;
    scene.add(shelf);
    [-shelfW/2+0.06, shelfW/2-0.06].forEach(dx => {
      const br = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.22), metalMat);
      br.position.set(shelfW/2+0.1+dx, height*0.62-0.09, 0.14);
      scene.add(br);
    });
    const bColors = [0xCC3333, 0x2244BB, 0x229933, 0xCC9922, 0x883388];
    let bx2 = 0.1+0.06;
    bColors.forEach((c, i) => {
      const bw = 0.055 + (i%3)*0.01;
      const bh2 = 0.18 + (i%4)*0.03;
      const book = new THREE.Mesh(new THREE.BoxGeometry(bw, bh2, 0.14), new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
      book.position.set(bx2+bw/2, height*0.62+0.02+bh2/2, 0.14);
      scene.add(book);
      bx2 += bw+0.01;
    });

    // РАСТЕНИЕ
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 12), new THREE.MeshStandardMaterial({ color: 0xCC7744, roughness: 0.85 }));
    pot.position.set(width-0.22, 0.12, length-0.22);
    pot.castShadow = true;
    scene.add(pot);
    [[0,0.55,0],[0.1,0.65,0.06],[-0.08,0.60,-0.05],[0.05,0.75,-0.08],[-0.1,0.70,0.08]].forEach(([dx, dy, dz], i) => {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1+i*0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2A7A2A, roughness: 0.9 }));
      leaf.scale.set(1, 0.5, 0.8);
      leaf.position.set(width-0.22+dx, dy*sc, length-0.22+dz);
      scene.add(leaf);
    });

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
            <a href="https://jysk.md" target="_blank" className="text-xs text-gray-500 hover:text-violet-400 transition">jysk.md →</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {catalog.map((item, i) => (
              <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                className="group bg-white/5 border border-white/10 rounded-xl p-3 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 rounded-sm flex-shrink-0 border border-white/10" style={{ backgroundColor: item.color }} />
                  <div className="text-xs font-medium text-gray-300 group-hover:text-white transition truncate">{item.name}</div>
                </div>
                <div className="text-violet-400 font-semibold text-sm">{item.price}</div>
                <div className="text-xs text-gray-600 mt-1 group-hover:text-gray-400 transition">Купить на JYSK →</div>
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
    </div>
  );
}