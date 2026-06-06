'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ArrowLeft, Check, Loader2, Upload, X } from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Комната' },
  { id: 2, label: 'Стиль' },
  { id: 3, label: 'Размеры' },
  { id: 4, label: 'Фото и детали' },
];

const ROOM_TYPES = [
  { value: 'Спальня',            emoji: '🛏', desc: 'Кровать, шкаф, рабочее место' },
  { value: 'Гостиная',           emoji: '🛋', desc: 'Диван, ТВ зона, столик' },
  { value: 'Кабинет / Home Office', emoji: '💻', desc: 'Стол, полки, кресло' },
  { value: 'Кухня-гостиная',     emoji: '🍳', desc: 'Открытое пространство' },
  { value: 'Gaming Room',        emoji: '🎮', desc: 'Геймерский сетап' },
  { value: 'Другое',             emoji: '✨', desc: 'Опишем вместе' },
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
  { id: 1, label: 'Анализируем фото',         sublabel: 'Mistral изучает комнату',    duration: 10 },
  { id: 2, label: 'Создаём дизайн',           sublabel: 'Подбираем стиль и мебель',   duration: 15 },
  { id: 3, label: 'Подбираем товары JYSK',    sublabel: 'Реальные цены и ссылки',     duration: 5  },
  { id: 4, label: 'Оптимизируем расстановку', sublabel: 'Расставляем мебель',         duration: 20 },
  { id: 5, label: 'Генерируем рендеры',       sublabel: 'Photorealistic 2 варианта',  duration: 90 },
];

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

  const set = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 1) return !!formData.roomType;
    if (step === 2) return !!formData.style;
    if (step === 3) return true; // размеры опциональны
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
        if (renderData.images?.length > 0) {
          localStorage.setItem('roomRenders', JSON.stringify(renderData.images));
        }
        if (renderData.renderLayout && design) {
          const updatedDesign = { ...design, furniture: renderData.renderLayout };
          localStorage.setItem('roomDesign', JSON.stringify(updatedDesign));
        }
      } catch (e) { console.error('Render error:', e); }

      // Отправляем заявку
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

  // ── Экран обработки ──────────────────────────────────────────────────────────
  if (sending) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-1">Создаём дизайн</div>
            <div className="text-gray-500 text-sm">Займёт около 2 минут</div>
          </div>

          <div className="space-y-3 mb-8">
            {PROCESSING_STEPS.map((s) => {
              const done   = currentProcStep > s.id;
              const active = currentProcStep === s.id;
              return (
                <div key={s.id} className={`flex items-center gap-3 transition-opacity ${active || done ? 'opacity-100' : 'opacity-25'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    done   ? 'bg-violet-600' :
                    active ? 'bg-violet-600/20 border border-violet-500' :
                             'bg-white/5 border border-white/10'
                  }`}>
                    {done   ? <Check size={13} /> :
                     active ? <Loader2 size={13} className="animate-spin text-violet-400" /> :
                              <span className="text-white/30 text-xs">{s.id}</span>}
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-gray-400' : 'text-gray-600'}`}>{s.label}</div>
                    {active && <div className="text-xs text-violet-400">{s.sublabel}</div>}
                  </div>
                  {active && <div className="ml-auto text-xs text-gray-600">~{s.duration}с</div>}
                </div>
              );
            })}
          </div>

          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-violet-600 rounded-full"
              animate={{ width: `${(currentProcStep / PROCESSING_STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Форма ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="text-sm text-gray-500">Шаг {step} из {STEPS.length}</div>
      </nav>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full bg-violet-500"
          animate={{ width: `${(step / STEPS.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="max-w-lg mx-auto px-6 py-10">
        {/* Step labels */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex items-center gap-1.5 text-xs transition-colors ${
              s.id === step ? 'text-violet-400' : s.id < step ? 'text-gray-500' : 'text-gray-700'
            }`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                s.id < step  ? 'bg-violet-600' :
                s.id === step ? 'bg-violet-600/20 border border-violet-500' :
                                'bg-white/5 border border-white/10'
              }`}>
                {s.id < step ? <Check size={9} /> : <span className="text-[9px]">{s.id}</span>}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* Шаг 1 — тип комнаты */}
          {step === 1 && (
            <motion.div key="step1"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="text-2xl font-bold mb-1">Какую комнату оформляем?</h1>
              <p className="text-gray-500 text-sm mb-6">Выбери тип — подберём подходящую мебель</p>
              <div className="grid grid-cols-2 gap-3">
                {ROOM_TYPES.map((r) => (
                  <button key={r.value} onClick={() => set('roomType', r.value)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      formData.roomType === r.value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <div className="text-2xl mb-2">{r.emoji}</div>
                    <div className="text-sm font-medium leading-tight">{r.value}</div>
                    <div className="text-xs text-gray-500 mt-0.5 leading-tight">{r.desc}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Шаг 2 — стиль */}
          {step === 2 && (
            <motion.div key="step2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="text-2xl font-bold mb-1">Какой стиль нравится?</h1>
              <p className="text-gray-500 text-sm mb-6">Можно выбрать «Не знаю» — подберём сами</p>
              <div className="grid grid-cols-1 gap-2">
                {STYLES.map((s) => (
                  <button key={s.value} onClick={() => set('style', s.value)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                      formData.style === s.value
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                  >
                    <span className="text-xl w-7 text-center flex-shrink-0">{s.emoji}</span>
                    <span className="text-sm font-medium flex-1">{s.value}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      {s.palette.map((color, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Шаг 3 — размеры */}
          {step === 3 && (
            <motion.div key="step3"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="text-2xl font-bold mb-1">Размеры комнаты</h1>
              <p className="text-gray-500 text-sm mb-6">Необязательно — но улучшает точность расстановки мебели</p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { key: 'length', label: 'Длина', unit: 'м', placeholder: '5' },
                  { key: 'width',  label: 'Ширина', unit: 'м', placeholder: '4' },
                  { key: 'height', label: 'Высота', unit: 'м', placeholder: '2.7' },
                ].map(({ key, label, unit, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1.5">{label}</label>
                    <div className="relative">
                      <input
                        type="number" step="0.1" placeholder={placeholder}
                        value={(formData as any)[key]}
                        onChange={e => set(key, e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-violet-500 transition pr-6"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-600">{unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Пожелания */}
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Пожелания и требования</label>
                <textarea
                  rows={4}
                  placeholder="Например: нужно место для рабочего стола, есть кот поэтому без острых углов, хочу побольше хранения, бюджет до 30 000 MDL..."
                  value={formData.wishes}
                  onChange={e => set('wishes', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition resize-none placeholder:text-gray-600"
                />
              </div>
            </motion.div>
          )}

          {/* Шаг 4 — контакты + фото */}
          {step === 4 && (
            <motion.div key="step4"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              <h1 className="text-2xl font-bold mb-1">Последний шаг</h1>
              <p className="text-gray-500 text-sm mb-6">Пришли фото комнаты и контакты — отправим результат</p>

              {/* Фото */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1.5">Фото комнаты (до 3 фото)</label>
                {formData.photos.length > 0 ? (
                  <div className="flex gap-2 flex-wrap">
                    {formData.photos.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 group">
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                        <button
                          onClick={() => set('photos', formData.photos.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 bg-black/70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                    {formData.photos.length < 3 && (
                      <label className="w-20 h-20 rounded-xl border border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-violet-500/50 transition">
                        <Upload size={16} className="text-gray-500" />
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => set('photos', [...formData.photos, ...Array.from(e.target.files || [])].slice(0, 3))} />
                      </label>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-violet-500/40 transition">
                    <Upload size={20} className="text-gray-600 mb-2" />
                    <span className="text-sm text-gray-500">Нажми чтобы загрузить</span>
                    <span className="text-xs text-gray-700 mt-0.5">Необязательно — AI создаст дизайн и без фото</span>
                    <input type="file" accept="image/*" multiple className="hidden"
                      onChange={e => set('photos', Array.from(e.target.files || []).slice(0, 3))} />
                  </label>
                )}
              </div>

              {/* Имя */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1.5">Ваше имя</label>
                <input
                  type="text" placeholder="Алексей" required
                  value={formData.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 block mb-1.5">Email — пришлём результат</label>
                <input
                  type="email" placeholder="alex@gmail.com" required
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* Summary */}
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-gray-500 space-y-1">
                <div className="flex justify-between"><span>Комната</span><span className="text-gray-300">{formData.roomType}</span></div>
                <div className="flex justify-between"><span>Стиль</span><span className="text-gray-300">{formData.style}</span></div>
                {(formData.width || formData.length) && (
                  <div className="flex justify-between"><span>Размеры</span><span className="text-gray-300">{formData.width||'?'}×{formData.length||'?'} м</span></div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Nav buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-2 px-5 py-3 rounded-full border border-white/15 text-sm font-medium hover:border-white/30 transition">
              <ArrowLeft size={15} /> Назад
            </button>
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition py-3 rounded-full font-semibold text-sm"
            >
              Далее <ArrowRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition py-3 rounded-full font-semibold text-sm"
            >
              Создать дизайн <ArrowRight size={15} />
            </button>
          )}
        </div>

        {step === 4 && (
          <p className="text-center text-xs text-gray-700 mt-4">
            Нажимая кнопку, вы соглашаетесь на обработку данных
          </p>
        )}
      </div>
    </div>
  );
}