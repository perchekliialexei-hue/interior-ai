'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Box, ShoppingBag, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { InteractiveBackground } from '@/components/interactive-background';
// FIX 1: import InteractiveBranches from its own file (was incorrectly defined inline in JSX)
import { InteractiveBranches } from '../src/components/interactive-branches';

const STEPS = [
  { id: 1, label: 'Анализируем фото',         sublabel: 'Mistral изучает комнату',       duration: 10 },
  { id: 2, label: 'Создаём дизайн',           sublabel: 'Подбираем стиль и мебель',      duration: 15 },
  { id: 3, label: 'Подбираем товары JYSK',    sublabel: 'Реальные цены и ссылки',        duration: 5  },
  { id: 4, label: 'Оптимизируем расстановку', sublabel: 'Pixtral расставляет мебель',    duration: 20 },
  { id: 5, label: 'Генерируем рендеры',       sublabel: 'Photorealistic 2 варианта',     duration: 90 },
  { id: 6, label: 'Отправляем заявку',        sublabel: 'Письмо на почту',               duration: 3  },
];

export default function Home() {
  const [showForm, setShowForm]     = useState(false);
  const [formData, setFormData]     = useState({
    name: '', email: '', roomType: 'Спальня', style: 'Минимализм',
    packageType: 'Starter — $35', photos: [] as File[],
    length: '', width: '', height: '', wishes: '',
  });
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [controller, setController] = useState<AbortController | null>(null);

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
          wishes:   formData.wishes,
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
        const renderData = await renderRes.json();
        if (renderData.images?.length > 0) {
          localStorage.setItem('roomRenders', JSON.stringify(renderData.images));
        }
        if (renderData.renderLayout && design) {
          const updatedDesign = { ...design, furniture: renderData.renderLayout };
          localStorage.setItem('roomDesign', JSON.stringify(updatedDesign));
        }
      } catch (renderError) {
        console.error('Render error:', renderError);
      }

      setCurrentStep(6);
      const { photos: _photos, ...orderPayload } = formData;
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          ...orderPayload,
          photoCount:  formData.photos.length,
          designPlan:  design ? JSON.stringify(design, null, 2) : 'Не удалось сгенерировать',
        }),
      });

      setSent(true);
      setSending(false);
      setTimeout(() => {
        window.location.href = '/result';
      }, 1200);

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error(error);
      setSending(false);
      setCurrentStep(0);
    }
  };

  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <InteractiveBackground />
      {/* FIX 2: InteractiveBranches now rendered correctly as a component, not defined inline */}
      <InteractiveBranches />

      {/* Nav */}
      <nav className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <div className="flex w-full max-w-5xl items-center justify-between rounded-full border border-white/10 bg-[oklch(0.16_0.018_56_/_0.7)] px-5 py-2.5 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[oklch(0.78_0.13_62_/_0.15)] ring-1 ring-[oklch(0.78_0.13_62_/_0.3)]">
              <Sparkles size={13} className="text-[#c8aa72]" />
            </span>
            <span className="font-serif text-lg tracking-wide text-white">
              Interior<span className="text-[#c8aa72]">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/realtor"
              className="hidden sm:block text-sm text-white/50 hover:text-white/80 transition-colors border border-white/10 px-3.5 py-1.5 rounded-full"
            >
              Для риелторов
            </a>
            <button
              onClick={() => window.location.href = '/order'}
              className="bg-[oklch(0.78_0.13_62)] hover:bg-[oklch(0.75_0.13_62)] transition px-5 py-2 rounded-full text-sm font-medium text-[oklch(0.2_0.04_50)]"
            >
              Заказать дизайн
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[80vh] w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, oklch(0.12 0.014 50 / 0.8), oklch(0.13 0.015 50 / 0.5) 55%, transparent 78%)" }}
          aria-hidden="true"
        />
        <div className="flex max-w-3xl flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.78_0.13_62_/_0.3)] bg-[oklch(0.78_0.13_62_/_0.1)] px-4 py-1.5 backdrop-blur-sm">
            <Sparkles size={13} className="text-[#c8aa72]" />
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8aa72]">
              Interior AI · дизайн интерьера
            </span>
          </div>
          <h1 className="mt-6 font-serif text-5xl font-light leading-[1.07] tracking-tight text-white sm:text-6xl md:text-7xl">
            Твоя комната —<br />
            <em className="not-italic text-[#d4b472]">Pinterest level</em>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Присылаешь фото комнаты — получаешь интерактивный 3D-концепт
            с реальной мебелью и ценами. За 2 минуты.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <button
              onClick={() => window.location.href = '/order'}
              className="group flex h-12 items-center gap-2 rounded-full bg-[oklch(0.78_0.13_62)] px-7 text-base font-medium text-[oklch(0.2_0.04_50)] shadow-xl shadow-black/30 hover:bg-[oklch(0.75_0.13_62)] transition"
            >
              Получить концепт
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </button>
            <a
              href="/viewer"
              className="flex h-12 items-center rounded-full border border-white/20 bg-white/5 px-7 text-base font-medium text-white backdrop-blur-sm hover:bg-white/10 transition"
            >
              Посмотреть 3D демо
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 text-white/50">
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl text-white">528</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">товаров JYSK</span>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl text-white">2 мин</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">на проект</span>
            </div>
            <div className="h-8 w-px bg-white/15" />
            <div className="flex flex-col items-center">
              <span className="font-serif text-2xl text-white">3D</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">интерактив</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-white/40">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]">листайте</span>
          <div className="h-10 w-px animate-pulse bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8aa72]">
            Возможности
          </span>
          <h2 className="mt-4 font-serif text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl max-w-2xl">
            Всё что нужно — уже готово
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: <Sparkles size={20} />, title: 'AI-референсы', desc: 'Подбираем стили под твои предпочтения — видишь что получится до начала работы' },
            { icon: <Box size={20} />, title: 'Интерактивный 3D', desc: 'Готовую комнату можно крутить, смотреть с разных углов прямо в браузере' },
            { icon: <ShoppingBag size={20} />, title: 'Список покупок', desc: 'Каждый предмет мебели — с ценой и ссылкой где купить' },
            { icon: <Sparkles size={20} />, title: 'Результат за 2 минуты', desc: 'Не нужно ждать дни — концепт готов пока пьёшь кофе' },
            { icon: <Box size={20} />, title: '528 товаров JYSK', desc: 'Реальный каталог с ценами для Молдовы — не абстрактная мебель' },
            { icon: <ShoppingBag size={20} />, title: 'Ссылка для клиента', desc: 'Отправь одну ссылку — клиент откроет готовый концепт с любого устройства' },
          ].map((f, i) => (
            <div
              key={i}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md transition-colors hover:border-[oklch(0.78_0.13_62_/_0.3)]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.78_0.13_62_/_0.12)] ring-1 ring-[oklch(0.78_0.13_62_/_0.25)] text-[#c8aa72]">
                {f.icon}
              </span>
              <div>
                <h3 className="font-serif text-lg text-white mb-1">{f.title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-28">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8aa72]">
            Как это работает
          </span>
          <h2 className="mt-4 font-serif text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl max-w-2xl">
            Три шага до интерьера
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { num: '01', title: 'Описываешь комнату', desc: 'Рассказываешь о размерах, стиле и пожеланиях. Можно загрузить фото.' },
            { num: '02', title: 'AI создаёт дизайн', desc: 'Mistral генерирует план, подбирает мебель JYSK с реальными ценами.' },
            { num: '03', title: 'Получаешь результат', desc: 'Интерактивный 3D + фотореалистичный рендер + список покупок со ссылками.' },
          ].map((s, i) => (
            <div
              key={i}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md transition-colors hover:border-[oklch(0.78_0.13_62_/_0.3)]"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[oklch(0.78_0.13_62_/_0.12)] ring-1 ring-[oklch(0.78_0.13_62_/_0.25)] text-[#c8aa72] font-mono text-sm">
                  {s.num}
                </span>
                <span className="font-serif text-3xl text-white/15">{s.num}</span>
              </div>
              <h3 className="font-serif text-xl text-white mb-3">{s.title}</h3>
              <p className="text-sm leading-relaxed text-white/55">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="max-w-5xl mx-auto px-8 py-8">
        <h2 className="text-3xl font-bold text-center mb-12">Что говорят клиенты</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Анна, 24',    room: 'Спальня · Минимализм', text: 'Не могла представить как будет выглядеть комната пока не увидела 3D. Заказала мебель точно по списку — всё встало идеально!', stars: 5 },
            { name: 'Дмитрий, 28', room: 'Gaming Room',           text: 'Крутой сервис. Получил 3D своей будущей комнаты за 2 дня. Мог крутить и смотреть со всех сторон. Стоит каждого цента.', stars: 5 },
            { name: 'Кафе Bloom',  room: 'Коммерческий проект',   text: 'Показали концепт инвесторам ещё до ремонта. Очень помогло в презентации. Рекомендуем всем кто открывает заведение.', stars: 5 },
          ].map((review, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-yellow-400 text-sm mb-3">{'★'.repeat(review.stars)}</div>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">"{review.text}"</p>
              <div>
                <div className="font-medium text-sm">{review.name}</div>
                <div className="text-gray-500 text-xs">{review.room}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-28">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[oklch(0.78_0.13_62_/_0.2)] bg-[oklch(0.2_0.03_56_/_0.6)] px-8 py-16 text-center backdrop-blur-xl">
          <div
            className="pointer-events-none absolute inset-x-0 -top-1/3 mx-auto h-2/3 w-2/3 rounded-full blur-3xl"
            style={{ background: "radial-gradient(closest-side, oklch(0.78 0.13 62 / 0.25), transparent)" }}
            aria-hidden="true"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.78_0.13_62_/_0.3)] bg-[oklch(0.78_0.13_62_/_0.1)] px-4 py-1.5">
              <Sparkles size={13} className="text-[#c8aa72]" />
              <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8aa72]">
                Попробовать бесплатно
              </span>
            </span>
            <h2 className="mt-6 font-serif text-3xl font-light leading-tight text-white sm:text-4xl md:text-5xl">
              Увидь свою комнату<br />
              <em className="not-italic text-[#d4b472]">до ремонта</em>
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/60 text-sm">
              Загрузи фото и получи 3D концепт с реальной мебелью за 2 минуты.
              Без карты, без обязательств.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => window.location.href = '/order'}
                className="group flex h-12 items-center gap-2 rounded-full bg-[oklch(0.78_0.13_62)] px-8 text-base font-medium text-[oklch(0.2_0.04_50)] shadow-xl shadow-black/30 hover:bg-[oklch(0.75_0.13_62)] transition"
              >
                Создать дизайн
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="/realtor"
                className="flex h-12 items-center rounded-full border border-white/20 bg-white/5 px-8 text-base font-medium text-white backdrop-blur-sm hover:bg-white/10 transition"
              >
                Для риелторов →
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[oklch(0.78_0.13_62_/_0.15)] ring-1 ring-[oklch(0.78_0.13_62_/_0.3)]">
              <Sparkles size={13} className="text-[#c8aa72]" />
            </span>
            <span className="font-serif text-lg text-white">InteriorAI</span>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/35">
            © 2026 InteriorAI · Молдова · JYSK каталог
          </p>
        </footer>
      </section>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-lg w-full my-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Заказать концепт</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-2xl leading-none"
                aria-label={sending ? 'Отменить' : 'Закрыть'}
              >
                ×
              </button>
            </div>

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
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: isActive || isDone ? 1 : 0.3, x: 0 }}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                            isDone   ? 'bg-violet-600' :
                            isActive ? 'bg-violet-600/30 border border-violet-500' :
                                       'bg-white/5 border border-white/10'
                          }`}>
                            {isDone   ? <Check   size={12} className="text-white" /> :
                             isActive ? <Loader2 size={12} className="text-violet-400 animate-spin" /> :
                                        <span className="text-white/20 text-xs">{step.id}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium transition-colors ${isActive ? 'text-white' : isDone ? 'text-gray-400' : 'text-gray-600'}`}>
                              {step.label}
                            </div>
                            {isActive && (
                              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-violet-400 mt-0.5">
                                {step.sublabel}
                              </motion.div>
                            )}
                          </div>
                          {isActive && (
                            <div className="text-xs text-gray-500">~{step.duration}с</div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-violet-600 rounded-full"
                      animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-500 mt-2">
                    Это займёт около 2 минут — не закрывай вкладку
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {!sending && !sent && (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="space-y-4"
                  initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                >
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Фото комнаты (до 3 фото)</label>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-violet-500/50 transition">
                      <span className="text-gray-500 mb-2">📷</span>
                      <span className="text-sm text-gray-500">
                        {formData.photos.length > 0 ? `${formData.photos.length} фото выбрано` : 'Нажми чтобы загрузить'}
                      </span>
                      <input
                        type="file" accept="image/*" multiple className="hidden"
                        onChange={e => setFormData({ ...formData, photos: Array.from(e.target.files || []) })}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Ваше имя</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                      placeholder="Алексей"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Email</label>
                    <input
                      type="email" required value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                      placeholder="alex@email.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Тип комнаты</label>
                    <select
                      value={formData.roomType}
                      onChange={e => setFormData({ ...formData, roomType: e.target.value })}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                    >
                      <option>Спальня</option>
                      <option>Гостиная</option>
                      <option>Кабинет / Home Office</option>
                      <option>Gaming Room</option>
                      <option>Кафе / Офис</option>
                      <option>Другое</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Стиль</label>
                    <select
                      value={formData.style}
                      onChange={e => setFormData({ ...formData, style: e.target.value })}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                    >
                      <option>Минимализм</option>
                      <option>Japandi</option>
                      <option>Скандинавский</option>
                      <option>Современный</option>
                      <option>Cozy / Уютный</option>
                      <option>Бохо</option>
                      <option>Классический</option>
                      <option>Средиземноморский</option>
                      <option>Индустриальный</option>
                      <option>Loft</option>
                      <option>Gaming Setup</option>
                      <option>Не знаю — помогите выбрать</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Размеры комнаты</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { key: 'length', ph: 'Длина (м)' },
                        { key: 'width',  ph: 'Ширина (м)' },
                        { key: 'height', ph: 'Высота (м)' },
                      ] as const).map(({ key, ph }) => (
                        <input
                          key={key} type="number" placeholder={ph}
                          value={formData[key] || ''}
                          onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Пожелания (необязательно)</label>
                    <textarea
                      placeholder="Например: хочу много света, нужно рабочее место, есть кот..."
                      value={formData.wishes}
                      onChange={e => setFormData({ ...formData, wishes: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">Пакет</label>
                    <select
                      value={formData.packageType}
                      onChange={e => setFormData({ ...formData, packageType: e.target.value })}
                      className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                    >
                      <option>Starter — $35</option>
                      <option>Pro — $85</option>
                      <option>Business — $200+</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-500 transition py-3 rounded-full font-semibold mt-2"
                  >
                    Создать дизайн
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {sent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-14 h-14 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-white" />
                </div>
                <p className="text-white font-semibold text-lg mb-1">Дизайн готов!</p>
                <p className="text-gray-400 text-sm">Переходим к результатам...</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </main>
  );
}