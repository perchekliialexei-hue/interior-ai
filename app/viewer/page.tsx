'use client';
import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// ─── helpers ────────────────────────────────────────────────────────────────
const hex = (s: string | undefined, fallback: number): number =>
  s ? parseInt(s.replace('#', ''), 16) : fallback;

const mat = (color: number, roughness = 0.75, metalness = 0.0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 12) => new THREE.CylinderGeometry(rt, rb, h, seg);

function add(g: THREE.Group, geo: THREE.BufferGeometry, m: THREE.Material, sx = 0, sy = 0, sz = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(sx, sy, sz);
  o.castShadow = true;
  o.receiveShadow = true;
  g.add(o);
  return o;
}

// Snap wall-hugging furniture to the correct wall based on rotation
// rot 0   → back  wall z=0  → z = depth/2
// rot 90  → right wall x=W  → x = W - depth/2
// rot 180 → front wall z=L  → z = L - depth/2
// rot 270 → left  wall x=0  → x = depth/2
function snapWall(px: number, pz: number, sw: number, sd: number, rot: number, W: number, L: number): [number, number] {
  const G = 0.015;
  if (rot === 0)   return [px,       sd/2 + G];
  if (rot === 90)  return [W-sd/2-G, pz];
  if (rot === 180) return [px,       L-sd/2-G];
  if (rot === 270) return [sd/2+G,   pz];
  return [px, pz];
}

const WALL_TYPES = new Set(['bed','wardrobe','shelf','desk','sofa']);

// ── BED ──────────────────────────────────────────────────────────────────────
function addBed(g: THREE.Group, w: number, d: number, c: number) {
  const wood = mat(c, 0.72);
  const fabC = Math.min(0xFFFFFF, c + 0x303030);
  // frame base
  add(g, box(w, 0.08, d), wood, 0, 0.04, 0);
  // legs
  const lh = 0.18;
  [[-w/2+0.07,-d/2+0.07],[w/2-0.07,-d/2+0.07],
   [-w/2+0.07, d/2-0.07],[w/2-0.07, d/2-0.07]].forEach(([lx,lz]) => {
    add(g, box(0.06,lh,0.06), wood, lx, -lh/2, lz);
  });
  // mattress
  add(g, box(w-0.06,0.20,d-0.04), mat(0xF8F5F0,0.95), 0, 0.20, 0);
  // pillows
  const offsets = w > 1.45 ? [-0.32, 0.32] : [0];
  offsets.forEach(ox => add(g, box(0.58,0.10,0.44), mat(0xFFFCF8,0.97), ox, 0.37, -d/2+0.30));
  // blanket
  add(g, box(w-0.08,0.09,d*0.55), mat(Math.max(0x202020, c-0x3A3A3A),0.95), 0, 0.38, d*0.10);
  // headboard
  add(g, box(w,0.55,0.08), wood, 0, 0.44, -d/2+0.04);
  add(g, box(w-0.08,0.40,0.04), mat(fabC,0.92), 0, 0.44, -d/2+0.085);
}

// ── SOFA ─────────────────────────────────────────────────────────────────────
function addSofa(g: THREE.Group, w: number, d: number, c: number) {
  const fab  = mat(c, 0.88);
  const dark = mat(Math.max(0, c-0x1A1A1A), 0.70);
  const leg  = mat(0x5A5A5A, 0.35, 0.65);
  add(g, box(w,0.26,d), dark, 0, 0.13, 0);
  const sw = (w-0.28)/3;
  for (let i=0;i<3;i++) {
    const cx = -w/2+0.14+sw/2+i*sw;
    add(g, box(sw-0.025,0.17,d*0.56), fab, cx, 0.39, d*0.12);
    add(g, box(sw-0.03,0.42,0.18), fab, cx, 0.54, -d/2+0.13);
  }
  [-w/2+0.07, w/2-0.07].forEach(ax => add(g, box(0.12,0.48,d), dark, ax, 0.37, 0));
  [[-w/2+0.08,-d/2+0.08],[w/2-0.08,-d/2+0.08],
   [-w/2+0.08, d/2-0.08],[w/2-0.08, d/2-0.08]].forEach(([lx,lz]) => {
    add(g, cyl(0.025,0.02,0.10,8), leg, lx, -0.05, lz);
  });
}

// ── WARDROBE ─────────────────────────────────────────────────────────────────
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

// ── DESK ─────────────────────────────────────────────────────────────────────
function addDesk(g: THREE.Group, w: number, d: number, c: number) {
  const wood = mat(c, 0.65);
  const dark = mat(Math.max(0,c-0x181818), 0.55);
  const leg  = mat(Math.max(0,c-0x0A0A0A), 0.50, 0.12);
  add(g, box(w,0.038,d), wood, 0, 0.019, 0);
  [[-w/2+0.04,-d/2+0.04],[w/2-0.04,-d/2+0.04],
   [-w/2+0.04, d/2-0.04],[w/2-0.04, d/2-0.04]].forEach(([lx,lz]) => {
    add(g, box(0.04,0.71,0.04), leg, lx, -0.355, lz);
  });
  add(g, box(w*0.42,0.18,d*0.50), dark, w*0.22, -0.13, 0);
}

// ── CHAIR ────────────────────────────────────────────────────────────────────
function addChair(g: THREE.Group, c: number) {
  const fab = mat(c, 0.85);
  const leg = mat(Math.max(0,c-0x101010), 0.50, 0.2);
  add(g, box(0.48,0.09,0.46), fab, 0, 0.045, 0);
  add(g, box(0.48,0.46,0.07), fab, 0, 0.30, -0.20);
  add(g, box(0.44,0.06,0.42), mat(Math.min(0xFFFFFF,c+0x101010),0.9), 0, 0.105, 0.01);
  [[-0.19,-0.19],[0.19,-0.19],[-0.19,0.19],[0.19,0.19]].forEach(([lx,lz]) => {
    add(g, box(0.035,0.40,0.035), leg, lx, -0.20, lz);
  });
}

// ── TABLE ────────────────────────────────────────────────────────────────────
function addTable(g: THREE.Group, w: number, d: number, c: number) {
  const wood = mat(c, 0.68);
  const leg  = mat(Math.max(0,c-0x141414), 0.55, 0.1);
  add(g, box(w,0.04,d), wood, 0, 0.02, 0);
  [[-w/2+0.05,-d/2+0.05],[w/2-0.05,-d/2+0.05],
   [-w/2+0.05, d/2-0.05],[w/2-0.05, d/2-0.05]].forEach(([lx,lz]) => {
    add(g, box(0.04,0.38,0.04), leg, lx, -0.19, lz);
  });
}

// ── SHELF ────────────────────────────────────────────────────────────────────
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

// ── NIGHTSTAND ───────────────────────────────────────────────────────────────
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

// ── LAMP ─────────────────────────────────────────────────────────────────────
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

// ── PLANT ────────────────────────────────────────────────────────────────────
function addPlant(g: THREE.Group, c: number) {
  add(g, cyl(0.11,0.08,0.20,12), mat(c||0x8B6A2A,0.88), 0, 0.10, 0);
  add(g, cyl(0.10,0.10,0.018,12), mat(0x3A2A18), 0, 0.209, 0);
  const lm = mat(0x2D6A35,0.9);
  for (let i=0;i<8;i++) {
    const a=(i/8)*Math.PI*2, r=0.055+(i%3)*0.04;
    const o=new THREE.Mesh(new THREE.SphereGeometry(0.11+(i%3)*0.03,6,5),lm);
    o.scale.y=1.9; o.position.set(Math.cos(a)*r,0.34+(i%3)*0.07,Math.sin(a)*r);
    o.castShadow=true; g.add(o);
  }
}

// ── RUG ──────────────────────────────────────────────────────────────────────
function addRug(g: THREE.Group, w: number, d: number, c: number) {
  add(g, box(w,0.016,d), mat(c,0.98), 0, 0.008, 0);
  const bw=0.055, bc=Math.max(0,c-0x252525);
  [[w,bw,0,d/2-bw/2],[w,bw,0,-d/2+bw/2],
   [bw,d-bw*2,-w/2+bw/2,0],[bw,d-bw*2,w/2-bw/2,0]].forEach(([W,D,X,Z]) => {
    add(g, box(W as number,0.018,D as number), mat(bc,0.98), X as number, 0.009, Z as number);
  });
}

// ── MASTER PLACER ────────────────────────────────────────────────────────────
function place(scene: THREE.Scene, item: any, roomW: number, roomL: number) {
  const c  = hex(item.color, 0x8B7355);
  const iw = Math.max(0.3, Math.min(item.width  ?? 1.0, roomW*0.9));
  const id = Math.max(0.3, Math.min(item.depth  ?? 0.6, roomL*0.9));
  const ih = Math.max(0.3, item.height ?? 0.8);

  const rotDeg = ((item.rotation ?? 0) % 360 + 360) % 360;
  const rot90  = rotDeg === 90 || rotDeg === 270;
  const snapW  = rot90 ? id : iw;
  const snapD  = rot90 ? iw : id;

  let px = typeof item.x==='number' && !isNaN(item.x) ? item.x : roomW/2;
  let pz = typeof item.z==='number' && !isNaN(item.z) ? item.z : roomL/2;

  // clamp inside room
  px = Math.max(snapW/2+0.02, Math.min(roomW-snapW/2-0.02, px));
  pz = Math.max(snapD/2+0.02, Math.min(roomL-snapD/2-0.02, pz));

  if (WALL_TYPES.has(item.type)) [px, pz] = snapWall(px, pz, snapW, snapD, rotDeg, roomW, roomL);

  const g = new THREE.Group();
  g.position.set(px, 0, pz);
  g.rotation.y = (rotDeg * Math.PI) / 180;
  scene.add(g);

  switch (item.type) {
    case 'bed':        addBed(g, iw, id, c);                         break;
    case 'sofa':       addSofa(g, iw, id, c);                        break;
    case 'wardrobe':   addWardrobe(g, iw, id, Math.max(1.6,ih), c);  break;
    case 'desk':       addDesk(g, iw, id, c);                        break;
    case 'chair':      addChair(g, c);                                break;
    case 'table':      addTable(g, iw, id, c);                       break;
    case 'shelf':      addShelf(g, iw, id, Math.max(1.4,ih), c);     break;
    case 'lamp':       addLamp(g, c);                                 break;
    case 'plant':      addPlant(g, c);                                break;
    case 'rug':        addRug(g, iw, id, c);                         break;
    case 'nightstand': addNightstand(g, iw, id, Math.max(0.5,ih), c);break;
    default:           add(g, box(iw,ih,id), mat(c), 0, ih/2, 0);
  }
}

// ── VIEWER ───────────────────────────────────────────────────────────────────
function ViewerContent() {
  const mountRef     = useRef<HTMLDivElement>(null);
  const sp           = useSearchParams();
  const [design, setDesign]         = useState<any>(null);
  const [selected, setSelected]     = useState<number|null>(null);
  const [showConcept, setShowConcept] = useState(false);

  const W  = parseFloat(sp.get('width')  || '4');
  const L  = parseFloat(sp.get('length') || '5');
  const H  = parseFloat(sp.get('height') || '2.7');
  const SN = sp.get('style') || 'Минимализм';

  useEffect(() => {
    try { const s=localStorage.getItem('roomDesign'); if(s) setDesign(JSON.parse(s)); } catch {}
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const el = mountRef.current;
    const cW = el.clientWidth, cH = el.clientHeight;

    let d: any = null;
    try { const s=localStorage.getItem('roomDesign'); if(s) d=JSON.parse(s); } catch {}

    const wallC  = hex(d?.colors?.walls,   0xF0EBE3);
    const floorC = hex(d?.colors?.floor,   0xC5B494);
    const ceilC  = hex(d?.colors?.ceiling, 0xF8F6F2);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0E0E16);
    scene.fog = new THREE.FogExp2(0x0E0E16, 0.016);

    const camera = new THREE.PerspectiveCamera(48, cW/cH, 0.1, 120);
    camera.position.set(W*0.85, H*1.35, L*1.15);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(cW, cH);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.maxPolarAngle = Math.PI/2.02;
    controls.minDistance   = 1.2;
    controls.maxDistance   = Math.max(W,L)*3.2;
    controls.target.set(W/2, H*0.22, L/2);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.55));
    const sun = new THREE.DirectionalLight(0xFFF8F0, 1.3);
    sun.position.set(W*0.6, H*2.4, L*0.35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -W*0.5; sun.shadow.camera.right = W*1.5;
    sun.shadow.camera.top  =  H*2.2; sun.shadow.camera.bottom = -0.5;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xD8E8FF, 0.38);
    fill.position.set(-W*0.5, H*0.8, L*0.9);
    scene.add(fill);
    const ceilPt = new THREE.PointLight(0xFFFFF0, 0.9, Math.max(W,L)*2.2);
    ceilPt.position.set(W/2, H*0.92, L/2);
    scene.add(ceilPt);

    // Window light
    const winW = Math.min(W*0.42, 1.6);
    const winH = Math.min(H*0.50, 1.38);
    const winY = H*0.58;
    const wl = new THREE.RectAreaLight(0xCCE8FF, 6, winW*0.88, winH*0.88);
    wl.position.set(W/2, winY, 0.5); wl.lookAt(W/2, winY, L/2);
    scene.add(wl);

    // ── Floor parquet ──
    const bw = 0.15, cols = Math.ceil(W/bw);
    for (let i=0;i<cols;i++) {
      const shade = i%4===1 ? -0x141414 : i%4===3 ? 0x080808 : 0;
      const c = Math.max(0,Math.min(0xFFFFFF, floorC+shade));
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw-0.007, 0.028, L),
        new THREE.MeshStandardMaterial({color:c, roughness:0.76, metalness:0.01})
      );
      b.position.set(i*bw+bw/2, 0.014, L/2);
      b.receiveShadow = true;
      scene.add(b);
    }

    // ── Ceiling ──
    const ceilMesh = new THREE.Mesh(box(W,0.06,L), mat(ceilC,0.97));
    ceilMesh.position.set(W/2, H+0.03, L/2);
    scene.add(ceilMesh);

    // ── Walls ──
    const wm = new THREE.MeshStandardMaterial({color:wallC, roughness:0.90});
    const backW = new THREE.Mesh(box(W+0.22,H+0.06,0.10), wm);
    backW.position.set(W/2,H/2,-0.05); backW.receiveShadow=true; scene.add(backW);
    const leftW = new THREE.Mesh(box(0.10,H+0.06,L+0.22), wm);
    leftW.position.set(-0.05,H/2,L/2); leftW.receiveShadow=true; scene.add(leftW);

    const rightMat = new THREE.MeshStandardMaterial({color:wallC,roughness:0.90,transparent:true,opacity:0.06,side:THREE.FrontSide,depthWrite:false});
    const frontMat = new THREE.MeshStandardMaterial({color:wallC,roughness:0.90,transparent:true,opacity:0.06,side:THREE.BackSide,depthWrite:false});
    const rightW = new THREE.Mesh(box(0.10,H+0.06,L+0.22), rightMat);
    rightW.position.set(W+0.05,H/2,L/2); scene.add(rightW);
    const frontW = new THREE.Mesh(box(W+0.22,H+0.06,0.10), frontMat);
    frontW.position.set(W/2,H/2,L+0.05); scene.add(frontW);

    // ── Skirting ──
    const sm2 = mat(Math.min(0xFFFFFF,wallC+0x060606),0.55);
    const sh=0.065, sd=0.022;
    [
      [W,sh,sd, W/2, sh/2, sd/2],
      [W,sh,sd, W/2, sh/2, L-sd/2],
      [sd,sh,L, sd/2, sh/2, L/2],
      [sd,sh,L, W-sd/2, sh/2, L/2],
    ].forEach(([bW,bH,bD,bx,by,bz]) => {
      const s = new THREE.Mesh(box(bW,bH,bD), sm2);
      s.position.set(bx,by,bz); scene.add(s);
    });

    // ── Window ──
    const fm = mat(Math.min(0xFFFFFF,wallC+0x0A0A0A),0.40);
    const ft=0.055, wx=W/2;
    [[winW+ft*2,ft, wx, winY+winH/2+ft/2, 0.05],[winW+ft*2,ft, wx, winY-winH/2-ft/2, 0.05]].forEach(([fw,,bx,by,bz]) => {
      const f=new THREE.Mesh(box(fw as number,ft,0.07),fm); f.position.set(bx as number,by as number,bz as number); scene.add(f);
    });
    [[ft,winH, wx-winW/2-ft/2, winY, 0.05],[ft,winH, wx+winW/2+ft/2, winY, 0.05]].forEach(([fw,fh,bx,by,bz]) => {
      const f=new THREE.Mesh(box(fw as number,fh as number,0.07),fm); f.position.set(bx as number,by as number,bz as number); scene.add(f);
    });
    const gl=new THREE.Mesh(box(winW,winH,0.04),new THREE.MeshStandardMaterial({color:0x99CCFF,transparent:true,opacity:0.15,roughness:0.04}));
    gl.position.set(wx,winY,0.02); scene.add(gl);
    const cross=new THREE.Mesh(box(winW,ft*0.6,0.04),fm);
    cross.position.set(wx,winY,0.03); scene.add(cross);

    // ── Furniture ──
    if (d?.furniture?.length > 0) {
      d.furniture.forEach((item: any) => place(scene, item, W, L));
    } else {
      place(scene,{type:'bed',       x:W*0.5, z:L*0.20,width:1.6,depth:2.0,height:0.5, color:'#8B7355',rotation:180},W,L);
      place(scene,{type:'nightstand',x:W*0.22,z:L*0.14,width:0.5,depth:0.4,height:0.55,color:'#7A6345',rotation:180},W,L);
      place(scene,{type:'wardrobe',  x:W*0.12,z:L*0.55,width:1.0,depth:0.5,height:2.0, color:'#9A8365',rotation:270},W,L);
      place(scene,{type:'lamp',      x:W*0.82,z:L*0.72,width:0.3,depth:0.3,height:1.5, color:'#A09070',rotation:0  },W,L);
      place(scene,{type:'plant',     x:W*0.88,z:L*0.88,width:0.3,depth:0.3,height:0.55,color:'#4A7A5A',rotation:0  },W,L);
    }

    // ── Loop ──
    let raf: number;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      const behind = camera.position.x>W*0.75 || camera.position.z>L*0.75;
      const to = behind ? 0.04 : 0.07;
      rightMat.opacity += (to-rightMat.opacity)*0.08;
      frontMat.opacity += (to-frontMat.opacity)*0.08;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!el) return;
      const w=el.clientWidth, h=el.clientHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [W, L, H, SN]);

  const furniture = design?.furniture ?? [];

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
                    selected===i ? 'border-violet-500/60 bg-violet-500/8' : 'border-white/10 hover:border-violet-500/40'
                  }`}
                >
                  {item.image && (
                    <div className="w-full h-28 bg-white overflow-hidden">
                      <img src={item.image} alt={item.jysk_name||item.name}
                        className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-white/20"
                        style={{backgroundColor: item.color||'#888'}} />
                      <div className="text-xs font-medium text-gray-300 group-hover:text-white transition truncate leading-tight">
                        {item.jysk_name||item.name}
                      </div>
                    </div>
                    <div className="text-violet-400 font-semibold text-xs">{item.jysk_price||'—'}</div>
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
                      const n=parseInt((f.jysk_price||'0').replace(/[^0-9]/g,''));
                      return sum+(isNaN(n)?0:n);
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