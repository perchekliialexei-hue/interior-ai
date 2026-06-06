'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Loader2, Building2, TrendingUp, Users, FileText, Send, Star, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const STEPS = [
  { id: 1, label: 'Анализируем фото',         sublabel: 'AI изучает объект',             duration: 10 },
  { id: 2, label: 'Создаём staging-концепт',   sublabel: 'Подбираем стиль под продажу',   duration: 15 },
  { id: 3, label: 'Подбираем мебель JYSK',     sublabel: 'Реальные цены и ссылки',        duration: 5  },
  { id: 4, label: 'Оптимизируем расстановку',  sublabel: 'AI расставляет мебель',         duration: 20 },
  { id: 5, label: 'Генерируем рендеры',        sublabel: '2 фотореалистичных варианта',   duration: 90 },
  { id: 6, label: 'Отправляем на почту',       sublabel: 'Готово для клиента',            duration: 3  },
];

const STATS = [
  { val: '73%', label: 'меньше времени на рынке при виртуальном staging' },
  { val: '25%', label: 'рост кликов на объявление с 3D-визуализацией' },
  { val: '83%', label: 'агентов: staging помогает клиенту "увидеть" жильё' },
];

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition placeholder-gray-600';
const selectCls = 'w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition text-white';

export default function RealtorPage() {
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [controller, setController]   = useState<AbortController | null>(null);

  const [formData, setFormData] = useState({
    name:        '',
    email:       '',
    agency:      '',
    address:     '',
    goal:        'Продажа',
    roomType:    'Гостиная',
    style:       'Современный',
    length:      '',
    width:       '',
    height:      '',
    wishes:      '',
    photos:      [] as File[],
  });

  const set = (k: string, v: string) => setFormData(p => ({ ...p, [k]: v }));

  const closeModal = () => {
    controller?.abort();
    setShowForm(false);
    setSent(false);
    setSending(false);
    setCurrentStep(0);
    setController(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ac = new AbortController();
    setController(ac);
    setSending(true);
    setCurrentStep(1);

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

      setCurrentStep(2);
      const aiRes = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          photoBase64,
          roomType: formData.roomType,
          style:    formData.style,
          width:    formData.width  || '4',
          length:   formData.length || '5',
          height:   formData.height || '2.7',
          wishes:   `[Объект: ${formData.address}] [Цель: ${formData.goal}] ${formData.wishes}`,
        }),
      });

      setCurrentStep(3);
      await new Promise(r => setTimeout(r, 300));
      const aiData = await aiRes.json();
      const design = aiData.design ?? null;
      if (!design) console.error('Design failed:', aiData.error);

      setCurrentStep(4);
      await new Promise(r => setTimeout(r, 300));
      if (design) localStorage.setItem('roomDesign', JSON.stringify(design));

      setCurrentStep(5);
      let renderImages: string[] = [];
      try {
        const renderRes = await fetch('/api/render-pixtral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: ac.signal,
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
        const rd = await renderRes.json();
        renderImages = rd.images ?? [];
      } catch (err) {
        console.error('Render failed (non-fatal):', err);
      }
      if (renderImages.length > 0) localStorage.setItem('roomRenders', JSON.stringify(renderImages));

      setCurrentStep(6);
      const { photos: _p, ...rest } = formData;
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          ...rest,
          photoCount: formData.photos.length,
          isRealtor:  true,
          designPlan: design ? JSON.stringify(design, null, 2) : 'Не удалось сгенерировать',
        }),
      });

      setSent(true);
      setSending(false);
      setTimeout(() => { window.location.href = '/result'; }, 1200);

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error(err);
      setSending(false);
      setCurrentStep(0);
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── Nav ── */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10">
        <a href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition group">
          <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-white">
            Interior<span className="text-violet-400">AI</span>
          </span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-xs text-gray-500 border border-white/10 px-3 py-1.5 rounded-full">
            Для риелторов и агентств
          </span>
          <button
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-500 transition px-5 py-2 rounded-full text-sm font-medium"
          >
            Заказать staging
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-8 pt-20 pb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 bg-violet-500/10 text-violet-400 text-sm px-4 py-1 rounded-full mb-6 border border-violet-500/20">
            <Building2 size={13} /> B2B · Виртуальный staging
          </span>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-5">
            Продавайте квартиры{' '}
            <span className="text-violet-400">быстрее</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Загружаете фото пустого объекта — AI создаёт интерактивный 3D staging-концепт
            с реальной мебелью. Клиент видит жильё "живым" ещё до показа.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-7 py-3.5 rounded-full text-base font-semibold"
            >
              Попробовать бесплатно <ArrowRight size={18} />
            </button>
            <a
              href="/viewer"
              className="inline-flex items-center gap-2 border border-white/20 hover:border-violet-400 transition px-7 py-3.5 rounded-full text-base font-semibold"
            >
              3D демо →
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── Stats ── */}
      <section className="max-w-4xl mx-auto px-8 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i + 0.3, duration: 0.5 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
            >
              <div className="text-4xl font-bold text-violet-400 mb-2">{s.val}</div>
              <div className="text-xs text-gray-400 leading-relaxed">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works for realtors ── */}
      <section className="max-w-5xl mx-auto px-8 py-8 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">Как это работает для риелтора</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { num: '01', icon: '📸', title: 'Фото объекта',    desc: 'Загружаешь фото пустой или меблированной комнаты' },
            { num: '02', icon: '🤖', title: 'AI создаёт staging', desc: 'Нейросеть расставляет мебель, подбирает стиль под продажу' },
            { num: '03', icon: '🎯', title: '3D концепт',      desc: 'Клиент открывает ссылку и крутит готовую комнату' },
            { num: '04', icon: '✅', title: 'Быстрая сделка',  desc: 'Покупатель "видит" себя в квартире — принимает решение' },
          ].map((step, i) => (
            <div key={i} className="relative">
              {i < 3 && (
                <div className="hidden md:block absolute top-6 left-[calc(100%-8px)] w-4 text-gray-700 text-lg z-10">→</div>
              )}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition h-full">
                <div className="text-2xl mb-3">{step.icon}</div>
                <div className="text-xs text-violet-400/60 font-mono mb-1">{step.num}</div>
                <h3 className="font-semibold text-sm mb-2">{step.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
<section className="max-w-5xl mx-auto px-8 py-8 pb-20">
  <div className="text-center mb-12">
    <h2 className="text-2xl font-bold mb-3">Всё что нужно риелтору — уже готово</h2>
    <p className="text-gray-400 text-sm max-w-lg mx-auto">
      Никакой установки, никаких подписок. Загружаешь фото — получаешь результат.
    </p>
  </div>
  <div className="grid md:grid-cols-2 gap-4">
    {[
      { icon: '⚡', title: 'Результат за 2 минуты', desc: 'Staging-концепт готов пока клиент едет на показ. Не нужно ждать дни.' },
      { icon: '🛋️', title: 'Реальная мебель с ценами', desc: 'Каждый предмет — из каталога JYSK с ценой и ссылкой. Клиент сразу видит бюджет.' },
      { icon: '📐', title: 'Интерактивный 3D', desc: 'Клиент крутит комнату прямо в телефоне. Никаких приложений — просто ссылка.' },
      { icon: '🔗', title: 'Ссылка для клиента', desc: 'Отправляешь одну ссылку в Viber — клиент открывает готовый концепт с любого устройства.' },
      { icon: '🏠', title: 'Любой тип объекта', desc: 'Гостиная, спальня, студия, кухня-гостиная — AI подберёт расстановку под каждый тип.' },
      { icon: '🎨', title: 'Нейтральный стиль под продажу', desc: 'Современный, скандинавский, минимализм — стили которые нравятся большинству покупателей.' },
    ].map((f, i) => (
      <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-violet-500/30 transition flex gap-4">
        <span className="text-2xl flex-shrink-0">{f.icon}</span>
        <div>
          <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
          <p className="text-gray-400 text-xs leading-relaxed">{f.desc}</p>
        </div>
      </div>
    ))}
  </div>

  <div className="mt-6 bg-violet-500/5 border border-violet-500/20 rounded-2xl p-6">
    <div className="flex items-start gap-3">
      <Star size={16} className="text-violet-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-sm font-semibold text-white mb-1">Единственный инструмент с реальными ценами для Молдовы</div>
        <p className="text-xs text-gray-400 leading-relaxed">
          REimagineHome и Collov AI дают красивую картинку. Но никто из них не даёт список реальной мебели с ценами и ссылками для молдавского рынка. Interior AI + JYSK Молдова = инструмент который помогает клиенту принять решение.
        </p>
      </div>
    </div>
  </div>
</section>

      {/* ── CTA Banner ── */}
      <section className="max-w-5xl mx-auto px-8 pb-20">
        <div className="bg-gradient-to-r from-violet-600/20 to-violet-500/10 border border-violet-500/30 rounded-3xl p-10 text-center">
          <h2 className="text-2xl font-bold mb-3">Попробуйте бесплатно</h2>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            Первый объект — бесплатно. Загрузите фото и убедитесь сами как это работает.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-3.5 rounded-full font-semibold"
          >
            Создать staging-концепт <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* ── Order Modal ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-lg w-full my-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold">Заказать staging-концепт</h2>
                <p className="text-xs text-gray-500 mt-0.5">Первый объект бесплатно</p>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-white text-2xl leading-none" aria-label="Закрыть">×</button>
            </div>

            {/* Progress */}
            <AnimatePresence>
              {sending && (
                <motion.div
                  key="progress"
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="space-y-2">
                    {STEPS.map((step) => {
                      const isDone   = currentStep > step.id;
                      const isActive = currentStep === step.id;
                      return (
                        <motion.div key={step.id} initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isActive || isDone ? 1 : 0.3, x: 0 }}
                          className="flex items-center gap-3 py-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            isDone ? 'bg-violet-600' : isActive ? 'bg-violet-600/30 border border-violet-500' : 'bg-white/5 border border-white/10'
                          }`}>
                            {isDone   ? <Check   size={12} className="text-white" /> :
                             isActive ? <Loader2 size={12} className="text-violet-400 animate-spin" /> :
                                        <span className="text-white/20 text-xs">{step.id}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isActive ? 'text-white' : isDone ? 'text-gray-400' : 'text-gray-600'}`}>
                              {step.label}
                            </div>
                            {isActive && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-violet-400 mt-0.5">
                                {step.sublabel}
                              </motion.div>
                            )}
                          </div>
                          {isActive && <div className="text-xs text-gray-500">~{step.duration}с</div>}
                        </motion.div>
                      );
                    })}
                  </div>
                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-violet-600 rounded-full"
                      animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                      transition={{ duration: 0.5 }} />
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-2">~2 минуты — не закрывай вкладку</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <AnimatePresence>
              {!sending && !sent && (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  {/* Photo upload */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Фото объекта</label>
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-violet-500/50 transition">
                      <span className="text-gray-500 mb-1">📷</span>
                      <span className="text-sm text-gray-500">
                        {formData.photos.length > 0 ? `${formData.photos.length} фото выбрано` : 'Нажми чтобы загрузить'}
                      </span>
                      <input type="file" accept="image/*" multiple className="hidden"
                        onChange={e => setFormData(p => ({ ...p, photos: Array.from(e.target.files || []) }))} />
                    </label>
                  </div>

                  {/* Name + Agency */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Имя</label>
                      <input type="text" required value={formData.name} onChange={e => set('name', e.target.value)}
                        className={inputCls} placeholder="Алексей" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Агентство</label>
                      <input type="text" value={formData.agency} onChange={e => set('agency', e.target.value)}
                        className={inputCls} placeholder="NeoImobil" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email</label>
                    <input type="email" required value={formData.email} onChange={e => set('email', e.target.value)}
                      className={inputCls} placeholder="alex@agency.md" />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Адрес объекта</label>
                    <input type="text" value={formData.address} onChange={e => set('address', e.target.value)}
                      className={inputCls} placeholder="ул. Штефан чел Маре, 12, Кишинёв" />
                  </div>

                  {/* Goal + Room type */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Цель</label>
                      <select value={formData.goal} onChange={e => set('goal', e.target.value)} className={selectCls}>
                        <option>Продажа</option>
                        <option>Аренда</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Тип помещения</label>
                      <select value={formData.roomType} onChange={e => set('roomType', e.target.value)} className={selectCls}>
                        <option>Гостиная</option>
                        <option>Спальня</option>
                        <option>Кабинет</option>
                        <option>Кухня-гостиная</option>
                        <option>Студия</option>
                      </select>
                    </div>
                  </div>

                  {/* Style */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Стиль</label>
                    <select value={formData.style} onChange={e => set('style', e.target.value)} className={selectCls}>
                      <option>Современный</option>
                      <option>Скандинавский</option>
                      <option>Минимализм</option>
                      <option>Классический</option>
                      <option>Не знаю — подберите сами</option>
                    </select>
                  </div>

                  {/* Dimensions */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Размеры (необязательно)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: 'length', ph: 'Длина (м)' },
                        { key: 'width',  ph: 'Ширина (м)' },
                        { key: 'height', ph: 'Высота (м)' },
                      ] as const).map(({ key, ph }) => (
                        <input key={key} type="number" placeholder={ph} value={formData[key]}
                          onChange={e => set(key, e.target.value)} className={inputCls} />
                      ))}
                    </div>
                  </div>

                  {/* Wishes */}
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Пожелания (необязательно)</label>
                    <textarea placeholder="Например: светлые тона, нейтральный стиль, высокий этаж с видом..."
                      value={formData.wishes} onChange={e => set('wishes', e.target.value)}
                      className={`${inputCls} resize-none`} rows={2} />
                  </div>

                  <button type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-500 transition py-3 rounded-full font-semibold mt-1 flex items-center justify-center gap-2">
                    <Send size={16} /> Создать staging-концепт
                  </button>

                  <p className="text-center text-xs text-gray-600">
                    Первый объект бесплатно · Результат за ~2 минуты
                  </p>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Success */}
            {sent && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                <div className="w-14 h-14 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-white" />
                </div>
                <p className="text-white font-semibold text-lg mb-1">Концепт готов!</p>
                <p className="text-gray-400 text-sm">Переходим к результатам...</p>
              </motion.div>
            )}

          </motion.div>
        </div>
      )}

    </main>
  );
}