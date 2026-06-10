'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Loader2, Upload, X } from 'lucide-react';
import OrderBackground from '@/src/components/order-background';

const STEPS = [
  { id: 1, label: 'Комната' },
  { id: 2, label: 'Стиль' },
  { id: 3, label: 'Размеры' },
  { id: 4, label: 'Детали' },
];

const ROOM_TYPES = [
  { value: 'Спальня',               emoji: '🛏', desc: 'Кровать, шкаф, рабочее место' },
  { value: 'Гостиная',              emoji: '🛋', desc: 'Диван, ТВ зона, столик' },
  { value: 'Кабинет / Home Office', emoji: '💻', desc: 'Стол, полки, кресло' },
  { value: 'Кухня-гостиная',        emoji: '🍳', desc: 'Открытое пространство' },
  { value: 'Gaming Room',           emoji: '🎮', desc: 'Геймерский сетап' },
  { value: 'Другое',                emoji: '✨', desc: 'Опишем вместе' },
];

const STYLES = [
  { value: 'Минимализм',    emoji: '◻', palette: ['#F5F5F0', '#E0DDD8', '#1A1A1A'] },
  { value: 'Japandi',       emoji: '🎋', palette: ['#E8E0D4', '#C4A882', '#2C2416'] },
  { value: 'Скандинавский', emoji: '🌿', palette: ['#FFFFFF', '#D4C5B0', '#4A6741'] },
  { value: 'Современный',   emoji: '⬡', palette: ['#F0EDE8', '#C8B99A', '#2A2A2A'] },
  { value: 'Cozy / Уютный', emoji: '🕯', palette: ['#F5ECD7', '#D4956A', '#3D2B1F'] },
  { value: 'Бохо',          emoji: '🪴', palette: ['#F2E8D9', '#C4956A', '#5C4033'] },
  { value: 'Классический',  emoji: '🏛', palette: ['#F8F4EE', '#C8A882', '#1A1208'] },
  { value: 'Индустриальный',emoji: '⚙', palette: ['#2A2A2A', '#8B7355', '#C4A882'] },
  { value: 'Loft',          emoji: '🏙', palette: ['#E8E4DF', '#9A9090', '#1C1C1C'] },
  { value: 'Не знаю — помогите выбрать', emoji: '🤔', palette: ['#F0EDE8', '#D4C5B0', '#8B7355'] },
];

const PROCESSING_STEPS = [
  { id: 1, label: 'Анализируем фото',         sublabel: 'Mistral изучает комнату',   duration: 10 },
  { id: 2, label: 'Создаём дизайн',           sublabel: 'Подбираем стиль и мебель',  duration: 15 },
  { id: 3, label: 'Подбираем товары JYSK',    sublabel: 'Реальные цены и ссылки',    duration: 5  },
  { id: 4, label: 'Оптимизируем расстановку', sublabel: 'Расставляем мебель',        duration: 20 },
  { id: 5, label: 'Генерируем рендеры',       sublabel: 'Photorealistic 2 варианта', duration: 90 },
];

/* ─── Per-step scene SVGs ─────────────────────────────────────────────── */

// Step 1: dark empty room entrance — floor lines vanishing to center
const Scene1 = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* bg */}
    <rect width="1440" height="900" fill="#0c0a08" />
    {/* ceiling plane */}
    <rect width="1440" height="260" fill="#110e0b" />
    {/* floor plane */}
    <rect y="640" width="1440" height="260" fill="#0e0c09" />
    {/* back wall */}
    <rect y="260" width="1440" height="380" fill="#141008" />
    {/* perspective floor lines */}
    {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((t, i) => (
      <line
        key={i}
        x1={1440 * t} y1="900"
        x2="720" y2="640"
        stroke="#c8aa7210" strokeWidth="1"
      />
    ))}
    {/* perspective ceiling lines */}
    {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((t, i) => (
      <line
        key={i}
        x1={1440 * t} y1="0"
        x2="720" y2="260"
        stroke="#c8aa7210" strokeWidth="1"
      />
    ))}
    {/* horizon glow */}
    <ellipse cx="720" cy="450" rx="340" ry="120" fill="#c8aa7206" />
    {/* floor boards — horizontal */}
    {[680, 720, 760, 800, 840, 880].map((y, i) => (
      <line key={i} x1="0" y1={y} x2="1440" y2={y} stroke="#c8aa720a" strokeWidth="0.8" />
    ))}
    {/* subtle door outline far wall */}
    <rect x="620" y="310" width="200" height="330" rx="2" fill="none" stroke="#c8aa7218" strokeWidth="1" />
    <rect x="710" y="460" width="1" height="1" fill="none" />
    <circle cx="630" cy="475" r="4" fill="#c8aa7222" />
    {/* vignette */}
    <radialGradient id="vig1" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stopColor="transparent" />
      <stop offset="100%" stopColor="#00000088" />
    </radialGradient>
    <rect width="1440" height="900" fill="url(#vig1)" />
  </svg>
);

// Step 2: warm wall texture appears — you've stepped inside
const Scene2 = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="1440" height="900" fill="#0f0d0a" />
    {/* floor */}
    <rect y="620" width="1440" height="280" fill="#0d0b08" />
    {/* wall */}
    <rect y="0" width="1440" height="620" fill="#131008" />
    {/* wall panels / wainscoting lines */}
    {[200, 400, 600, 800, 1000, 1200].map((x, i) => (
      <line key={i} x1={x} y1="40" x2={x} y2="620" stroke="#c8aa7212" strokeWidth="0.8" />
    ))}
    <line x1="0" y1="140" x2="1440" y2="140" stroke="#c8aa7210" strokeWidth="0.8" />
    <line x1="0" y1="520" x2="1440" y2="520" stroke="#c8aa7210" strokeWidth="0.8" />
    {/* side window — warm light leak */}
    <rect x="0" y="180" width="60" height="280" fill="#c8aa7218" />
    <rect x="0" y="180" width="60" height="280">
      <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite" />
    </rect>
    {/* window light bar on floor */}
    <polygon points="60,460 60,460 320,620 60,620" fill="#c8aa720c" />
    {/* perspective floor lines */}
    {[0.1, 0.3, 0.5, 0.7, 0.9].map((t, i) => (
      <line key={i} x1={1440 * t} y1="900" x2={1440 * t} y2="620" stroke="#c8aa7209" strokeWidth="0.8" />
    ))}
    {/* warm glow from window */}
    <ellipse cx="60" cy="340" rx="220" ry="180" fill="#c8aa7209" />
    {/* vignette */}
    <radialGradient id="vig2" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stopColor="transparent" />
      <stop offset="100%" stopColor="#00000077" />
    </radialGradient>
    <rect width="1440" height="900" fill="url(#vig2)" />
  </svg>
);

// Step 3: center of room — floor tiles, perspective depth, ceiling visible
const Scene3 = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="1440" height="900" fill="#110e0a" />
    {/* ceiling */}
    <rect y="0" width="1440" height="220" fill="#0f0c09" />
    {/* walls */}
    <rect y="220" width="1440" height="460" fill="#141108" />
    {/* floor */}
    <rect y="680" width="1440" height="220" fill="#0d0b07" />
    {/* ceiling cornice */}
    <line x1="0" y1="220" x2="1440" y2="220" stroke="#c8aa7214" strokeWidth="1" />
    {/* floor skirting */}
    <line x1="0" y1="680" x2="1440" y2="680" stroke="#c8aa7214" strokeWidth="1" />
    {/* floor tile grid — perspective */}
    {[-4,-3,-2,-1,0,1,2,3,4].map((d, i) => (
      <line
        key={`v${i}`}
        x1={720 + d * 160} y1="680"
        x2={720 + d * 60} y2="900"
        stroke="#c8aa720d" strokeWidth="0.8"
      />
    ))}
    {[0,1,2,3].map((r, i) => {
      const y = 680 + r * 55;
      return <line key={`h${i}`} x1="0" y1={y} x2="1440" y2={y} stroke="#c8aa720a" strokeWidth="0.8" />;
    })}
    {/* ceiling light fixture */}
    <ellipse cx="720" cy="220" rx="60" ry="16" fill="#c8aa7220" />
    <ellipse cx="720" cy="220" rx="100" ry="60" fill="#c8aa720a" />
    {/* two windows far wall */}
    <rect x="440" y="270" width="160" height="260" rx="2" fill="none" stroke="#c8aa7220" strokeWidth="1" />
    <rect x="840" y="270" width="160" height="260" rx="2" fill="none" stroke="#c8aa7220" strokeWidth="1" />
    <rect x="440" y="270" width="160" height="260" fill="#c8aa7206" />
    <rect x="840" y="270" width="160" height="260" fill="#c8aa7206" />
    {/* window cross-bars */}
    <line x1="520" y1="270" x2="520" y2="530" stroke="#c8aa7214" strokeWidth="0.8" />
    <line x1="440" y1="400" x2="600" y2="400" stroke="#c8aa7214" strokeWidth="0.8" />
    <line x1="920" y1="270" x2="920" y2="530" stroke="#c8aa7214" strokeWidth="0.8" />
    <line x1="840" y1="400" x2="1000" y2="400" stroke="#c8aa7214" strokeWidth="0.8" />
    {/* vignette */}
    <radialGradient id="vig3" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stopColor="transparent" />
      <stop offset="100%" stopColor="#00000066" />
    </radialGradient>
    <rect width="1440" height="900" fill="url(#vig3)" />
  </svg>
);

// Step 4: near the window — warm golden light, almost ready
const Scene4 = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <rect width="1440" height="900" fill="#130f09" />
    {/* floor */}
    <rect y="640" width="1440" height="260" fill="#0f0c07" />
    {/* wall */}
    <rect y="0" width="1440" height="640" fill="#161208" />
    {/* large window — right side */}
    <rect x="940" y="80" width="360" height="560" rx="2" fill="#c8aa7222" />
    <rect x="940" y="80" width="360" height="560" rx="2" fill="none" stroke="#c8aa7230" strokeWidth="1.5" />
    {/* window bars */}
    <line x1="1120" y1="80" x2="1120" y2="640" stroke="#c8aa7228" strokeWidth="1" />
    <line x1="940" y1="360" x2="1300" y2="360" stroke="#c8aa7228" strokeWidth="1" />
    {/* window light cast on floor */}
    <polygon points="940,640 1300,640 1440,900 760,900" fill="#c8aa7210" />
    {/* window light cast on wall / left side */}
    <polygon points="940,80 940,640 600,640 480,80" fill="#c8aa7205" />
    {/* warm glow from window */}
    <ellipse cx="1120" cy="360" rx="420" ry="340" fill="#c8aa720d" />
    {/* subtle silhouette of a plant */}
    <ellipse cx="920" cy="600" rx="38" ry="44" fill="#0d0b07" />
    <line x1="920" y1="556" x2="920" y2="640" stroke="#0d0b07" strokeWidth="6" />
    <ellipse cx="896" cy="572" rx="22" ry="28" fill="#0d0b07" />
    <ellipse cx="944" cy="568" rx="20" ry="26" fill="#0d0b07" />
    {/* floor planks */}
    {[660, 700, 740, 780, 820, 860].map((y, i) => (
      <line key={i} x1="0" y1={y} x2="1440" y2={y} stroke="#c8aa7209" strokeWidth="0.8" />
    ))}
    {/* vignette — lighter on the right to let light in */}
    <radialGradient id="vig4" cx="80%" cy="50%" r="80%">
      <stop offset="0%" stopColor="transparent" />
      <stop offset="100%" stopColor="#00000060" />
    </radialGradient>
    <rect width="1440" height="900" fill="url(#vig4)" />
    {/* left vignette edge */}
    <linearGradient id="leftvig" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stopColor="#00000055" />
      <stop offset="40%" stopColor="transparent" />
    </linearGradient>
    <rect width="1440" height="900" fill="url(#leftvig)" />
  </svg>
);

const SCENES = [Scene1, Scene2, Scene3, Scene4];

const STEP_BG: Record<number, { pos: string; scale: string; brightness: string }> = {
  1: { pos: '50% 85%', scale: 'scale(1.0)',  brightness: 'brightness(0.65)' },
  2: { pos: '50% 65%', scale: 'scale(1.08)', brightness: 'brightness(0.60)' },
  3: { pos: '50% 40%', scale: 'scale(1.18)', brightness: 'brightness(0.55)' },
  4: { pos: '50% 15%', scale: 'scale(1.28)', brightness: 'brightness(0.52)' },
};

export default function OrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [currentProcStep, setCurrentProcStep] = useState(0);

  const [formData, setFormData] = useState({
    roomType: '',
    style: '',
    width: '',
    length: '',
    height: '',
    wishes: '',
    name: '',
    email: '',
    photos: [] as File[],
  });

  const set = (key: string, val: any) =>
    setFormData(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 1) return !!formData.roomType;
    if (step === 2) return !!formData.style;
    if (step === 3) return true;
    if (step === 4) return !!formData.name && !!formData.email;
    return false;
  };

  const handleSubmit = async () => {
    setSending(true);
    setCurrentProcStep(1);
    try {
      let photoBase64: string | null = null;
      if (formData.photos.length > 0) {
        const file = formData.photos[0];
        photoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error('FileReader failed'));
          reader.readAsDataURL(file);
        });
      }

      setCurrentProcStep(2);
      const aiRes = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64,
          roomType: formData.roomType,
          style:    formData.style,
          width:    formData.width  || '4',
          length:   formData.length || '5',
          height:   formData.height || '2.7',
          wishes:   formData.wishes,
        }),
      });

      setCurrentProcStep(3);
      const aiData = await aiRes.json();
      const design = aiData.design ?? null;
      if (design) {
        localStorage.setItem('roomDesign', JSON.stringify({
          ...design,
          roomType: formData.roomType,
          style:    formData.style,
          width:    formData.width  || '4',
          length:   formData.length || '5',
          height:   formData.height || '2.7',
          wishes:   formData.wishes,
        }));
      }

      setCurrentProcStep(4);
      setCurrentProcStep(5);

      try {
        const renderRes = await fetch('/api/render-pixtral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomType: formData.roomType,
            style:    formData.style,
            width:    formData.width  || '4',
            length:   formData.length || '5',
            height:   formData.height || '2.7',
            wishes:   formData.wishes,
            design,
          }),
        });
        const renderData = await renderRes.json();
        if (renderData.images?.length > 0)
          localStorage.setItem('roomRenders', JSON.stringify(renderData.images));
        if (renderData.renderLayout && design) {
          const updatedDesign = { ...design, furniture: renderData.renderLayout };
          localStorage.setItem('roomDesign', JSON.stringify(updatedDesign));
        }
      } catch (e) { console.error('Render error:', e); }

      const { photos: _photos, ...orderPayload } = formData;
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderPayload, photoCount: formData.photos.length }),
      }).catch(() => {});

      router.push('/result');
    } catch (e) {
      console.error(e);
      setSending(false);
      setCurrentProcStep(0);
    }
  };

  /* ── Processing screen ──────────────────────────────────────────── */
  if (sending) {
    return (
      <div className="min-h-screen bg-[#0a0a08] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.01em' }}
            >
              Создаём дизайн
            </div>
            <div className="text-sm mt-1" style={{ color: '#c8aa7266' }}>Займёт около 2 минут</div>
          </div>

          <div className="space-y-4 mb-10">
            {PROCESSING_STEPS.map((s) => {
              const done   = currentProcStep > s.id;
              const active = currentProcStep === s.id;
              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-4 transition-opacity duration-500 ${
                    active || done ? 'opacity-100' : 'opacity-20'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      background: done ? '#c8aa72' : active ? 'rgba(200,170,114,0.12)' : 'rgba(255,255,255,0.04)',
                      border: done ? 'none' : `1px solid ${active ? 'rgba(200,170,114,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    {done
                      ? <Check size={14} color="#0a0a08" />
                      : active
                        ? <Loader2 size={14} className="animate-spin" style={{ color: '#c8aa72' }} />
                        : <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{s.id}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{ color: done ? 'rgba(255,255,255,0.4)' : active ? '#fff' : 'rgba(255,255,255,0.25)' }}
                    >
                      {s.label}
                    </div>
                    {active && (
                      <div className="text-xs mt-0.5" style={{ color: '#c8aa7299' }}>{s.sublabel}</div>
                    )}
                  </div>
                  {active && (
                    <div className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>
                      ~{s.duration}с
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="h-px rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#c8aa72' }}
              animate={{ width: `${(currentProcStep / PROCESSING_STEPS.length) * 100}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────────── */
  const SceneBg = SCENES[step - 1];

  return (
  <div className="min-h-screen text-white relative overflow-hidden">

<OrderBackground />

    {/* контент поверх */}
    <div className="relative z-10 min-h-screen flex flex-col">

        {/* Nav */}
        <nav
          className="flex justify-between items-center px-6 py-4"
          style={{ borderBottom: '1px solid rgba(200,170,114,0.1)' }}
        >
          <a href="/" className="flex items-center gap-2">
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.88)' }}>
              Interior<span style={{ color: '#c8aa72' }}>AI</span>
            </span>
          </a>
          <div style={{ fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>
            Шаг {step} из {STEPS.length}
          </div>
        </nav>

        {/* Progress line */}
        <div className="h-px" style={{ background: 'rgba(200,170,114,0.1)' }}>
          <motion.div
            className="h-full"
            style={{ background: '#c8aa72' }}
            animate={{ width: `${(step / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 flex items-start justify-center">
          <div className="w-full max-w-lg px-6 py-10">

            {/* Step indicators */}
            <div className="flex gap-6 mb-10">
              {STEPS.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 text-xs transition-all duration-300"
                  style={{
                    color: s.id === step
                      ? '#c8aa72'
                      : s.id < step
                        ? 'rgba(200,170,114,0.45)'
                        : 'rgba(255,255,255,0.18)',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
                    style={{
                      background: s.id < step
                        ? '#c8aa72'
                        : s.id === step
                          ? 'rgba(200,170,114,0.15)'
                          : 'rgba(255,255,255,0.04)',
                      border: s.id < step
                        ? 'none'
                        : `1px solid ${s.id === step ? 'rgba(200,170,114,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    }}
                  >
                    {s.id < step
                      ? <Check size={10} color="#0a0a08" />
                      : <span style={{ fontSize: 9, color: s.id === step ? '#c8aa72' : 'rgba(255,255,255,0.2)' }}>{s.id}</span>
                    }
                  </div>
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* ── Step 1: Room type ──────────────────────────────── */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.01em' }}
                  >
                    Какую комнату оформляем?
                  </h1>
                  <p className="text-sm mb-8" style={{ color: 'rgba(200,170,114,0.55)' }}>
                    Выбери тип — подберём подходящую мебель
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {ROOM_TYPES.map((r) => {
                      const selected = formData.roomType === r.value;
                      return (
                        <button
                          key={r.value}
                          onClick={() => set('roomType', r.value)}
                          className="text-left p-4 rounded-2xl transition-all duration-200"
                          style={{
                            background: selected
                              ? 'rgba(200,170,114,0.12)'
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${selected ? 'rgba(200,170,114,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <div className="text-2xl mb-3">{r.emoji}</div>
                          <div
                            className="text-sm font-medium leading-tight"
                            style={{ color: selected ? '#c8aa72' : 'rgba(255,255,255,0.85)' }}
                          >
                            {r.value}
                          </div>
                          <div className="text-xs mt-1 leading-tight" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            {r.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Style ──────────────────────────────────── */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1
                    className="text-3xl font-bold mb-1"
                    style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.01em' }}
                  >
                    Какой стиль нравится?
                  </h1>
                  <p className="text-sm mb-8" style={{ color: 'rgba(200,170,114,0.55)' }}>
                    Можно выбрать «Не знаю» — подберём сами
                  </p>

                  <div className="flex flex-col gap-2">
                    {STYLES.map((s) => {
                      const selected = formData.style === s.value;
                      return (
                        <button
                          key={s.value}
                          onClick={() => set('style', s.value)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: selected
                              ? 'rgba(200,170,114,0.12)'
                              : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${selected ? 'rgba(200,170,114,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <span className="text-lg w-7 text-center flex-shrink-0">{s.emoji}</span>
                          <span
                            className="text-sm font-medium flex-1"
                            style={{ color: selected ? '#c8aa72' : 'rgba(255,255,255,0.85)' }}
                          >
                            {s.value}
                          </span>
                          <div className="flex gap-1.5 flex-shrink-0">
                            {s.palette.map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded-full"
                                style={{
                                  backgroundColor: color,
                                  border: '1px solid rgba(255,255,255,0.12)',
                                }}
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Dimensions ─────────────────────────────── */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1
                    className="text-3xl mb-1"
                    style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.01em' }}
                  >
                    Размеры комнаты
                  </h1>
                  <p className="text-sm mb-8" style={{ color: 'rgba(200,170,114,0.55)' }}>
                    Необязательно — но улучшает точность расстановки мебели
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { key: 'length', label: 'Длина',  unit: 'м', placeholder: '5' },
                      { key: 'width',  label: 'Ширина', unit: 'м', placeholder: '4' },
                      { key: 'height', label: 'Высота', unit: 'м', placeholder: '2.7' },
                    ].map(({ key, label, unit, placeholder }) => (
                      <div key={key}>
                        <label
                          className="text-xs block mb-1.5"
                          style={{ color: 'rgba(200,170,114,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                        >
                          {label}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            placeholder={placeholder}
                            value={(formData as any)[key]}
                            onChange={e => set(key, e.target.value)}
                            className="w-full rounded-xl px-3 py-3 text-sm transition-all focus:outline-none"
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(200,170,114,0.15)',
                              color: '#fff',
                              paddingRight: '2rem',
                            }}
                            onFocus={e => (e.target.style.borderColor = 'rgba(200,170,114,0.5)')}
                            onBlur={e => (e.target.style.borderColor = 'rgba(200,170,114,0.15)')}
                          />
                          <span
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                            style={{ color: 'rgba(200,170,114,0.4)' }}
                          >
                            {unit}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label
                      className="text-xs block mb-1.5"
                      style={{ color: 'rgba(200,170,114,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                      Пожелания
                    </label>
                    <textarea
                      rows={5}
                      placeholder="Например: нужно место для рабочего стола, есть кот — без острых углов, хочу побольше хранения, бюджет до 30 000 MDL..."
                      value={formData.wishes}
                      onChange={e => set('wishes', e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none resize-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(200,170,114,0.15)',
                        color: '#fff',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(200,170,114,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(200,170,114,0.15)')}
                    />
                  </div>
                </motion.div>
              )}

              {/* ── Step 4: Photo + contacts ────────────────────────── */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1
                    className="text-3xl mb-1"
                    style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.01em' }}
                  >
                    Последний шаг
                  </h1>
                  <p className="text-sm mb-8" style={{ color: 'rgba(200,170,114,0.55)' }}>
                    Пришли фото комнаты и контакты — отправим результат
                  </p>

                  {/* Photo upload */}
                  <div className="mb-5">
                    <label
                      className="text-xs block mb-1.5"
                      style={{ color: 'rgba(200,170,114,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                      Фото комнаты (до 3)
                    </label>

                    {formData.photos.length > 0 ? (
                      <div className="flex gap-2 flex-wrap">
                        {formData.photos.map((f, i) => (
                          <div
                            key={i}
                            className="relative w-24 h-24 rounded-xl overflow-hidden group"
                            style={{ border: '1px solid rgba(200,170,114,0.2)' }}
                          >
                            <img
                              src={URL.createObjectURL(f)}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                            <button
                              onClick={() => set('photos', formData.photos.filter((_, j) => j !== i))}
                              className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: 'rgba(0,0,0,0.7)' }}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                        {formData.photos.length < 3 && (
                          <label
                            className="w-24 h-24 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                            style={{ border: '1px dashed rgba(200,170,114,0.25)' }}
                          >
                            <Upload size={18} style={{ color: 'rgba(200,170,114,0.4)' }} />
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={e => set('photos', [...formData.photos, ...Array.from(e.target.files || [])].slice(0, 3))}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <label
                        className="flex flex-col items-center justify-center w-full h-32 rounded-xl cursor-pointer transition-all"
                        style={{ border: '1px dashed rgba(200,170,114,0.2)', background: 'rgba(200,170,114,0.03)' }}
                      >
                        <Upload size={20} style={{ color: 'rgba(200,170,114,0.35)', marginBottom: 8 }} />
                        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Нажми чтобы загрузить</span>
                        <span className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                          Необязательно — AI создаст дизайн и без фото
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => set('photos', Array.from(e.target.files || []).slice(0, 3))}
                        />
                      </label>
                    )}
                  </div>

                  {/* Name */}
                  <div className="mb-3">
                    <label
                      className="text-xs block mb-1.5"
                      style={{ color: 'rgba(200,170,114,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                      Ваше имя
                    </label>
                    <input
                      type="text"
                      placeholder="Алексей"
                      value={formData.name}
                      onChange={e => set('name', e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(200,170,114,0.15)',
                        color: '#fff',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(200,170,114,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(200,170,114,0.15)')}
                    />
                  </div>

                  {/* Email */}
                  <div className="mb-5">
                    <label
                      className="text-xs block mb-1.5"
                      style={{ color: 'rgba(200,170,114,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                    >
                      Email — пришлём результат
                    </label>
                    <input
                      type="email"
                      placeholder="alex@gmail.com"
                      value={formData.email}
                      onChange={e => set('email', e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm transition-all focus:outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(200,170,114,0.15)',
                        color: '#fff',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(200,170,114,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(200,170,114,0.15)')}
                    />
                  </div>

                  {/* Summary card */}
                  <div
                    className="rounded-xl px-4 py-3 text-xs space-y-2"
                    style={{
                      background: 'rgba(200,170,114,0.06)',
                      border: '1px solid rgba(200,170,114,0.15)',
                    }}
                  >
                    {[
                      ['Комната', formData.roomType],
                      ['Стиль', formData.style],
                      ...(formData.width || formData.length
                        ? [['Размеры', `${formData.width || '?'} × ${formData.length || '?'} м`]]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between">
                        <span style={{ color: 'rgba(200,170,114,0.45)' }}>{label}</span>
                        <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>

            {/* Navigation */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-medium transition-all duration-200"
                  style={{
                    border: '1px solid rgba(200,170,114,0.2)',
                    color: 'rgba(255,255,255,0.6)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <ArrowLeft size={14} />
                  Назад
                </button>
              )}

              {step < STEPS.length ? (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canNext()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm transition-all duration-200"
                  style={{
                    background: canNext() ? '#c8aa72' : 'rgba(200,170,114,0.15)',
                    color: canNext() ? '#0a0a08' : 'rgba(200,170,114,0.35)',
                    cursor: canNext() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Далее <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!canNext()}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-medium text-sm transition-all duration-200"
                  style={{
                    background: canNext() ? '#c8aa72' : 'rgba(200,170,114,0.15)',
                    color: canNext() ? '#0a0a08' : 'rgba(200,170,114,0.35)',
                    cursor: canNext() ? 'pointer' : 'not-allowed',
                  }}
                >
                  Создать дизайн <ArrowRight size={14} />
                </button>
              )}
            </div>

            {step === 4 && (
              <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.18)' }}>
                Нажимая кнопку, вы соглашаетесь на обработку данных
              </p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}