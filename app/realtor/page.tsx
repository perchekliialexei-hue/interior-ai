'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Building2, TrendingUp, Clock, Users, ArrowRight,
  Check, Loader2, Star, ChevronRight, Send, Eye
} from 'lucide-react';

// ─── Шаги генерации (риелторский флоу) ────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Анализируем фото объекта',   sublabel: 'Mistral изучает пространство',      duration: 10 },
  { id: 2, label: 'Создаём концепт обстановки',  sublabel: 'Подбираем мебель под метраж',       duration: 15 },
  { id: 3, label: 'Подбираем товары JYSK',       sublabel: 'Реальные цены и артикулы',          duration: 5  },
  { id: 4, label: 'Расставляем мебель',          sublabel: 'Оптимизируем планировку',           duration: 20 },
  { id: 5, label: 'Генерируем 3D-рендер',        sublabel: '2 варианта обстановки',             duration: 90 },
  { id: 6, label: 'Готовим презентацию',         sublabel: 'PDF + ссылка для клиента',          duration: 3  },
];

const STATS = [
  { value: '3×', label: 'больше показов конвертируются в сделку' },
  { value: '48ч', label: 'от фото до готовой визуализации' },
  { value: '528', label: 'реальных товаров JYSK с ценами' },
];

const CASES = [
  {
    tag: 'Пустая квартира → продана за 12 дней',
    before: 'Объект 3 месяца без просмотров',
    after: 'После визуализации — 4 показа, 1 сделка',
    area: '62 м² · 3 комн. · Буюканы',
  },
  {
    tag: 'Застройщик · 14 квартир',
    before: 'Стандартный рендер от застройщика',
    after: 'Персональный концепт для каждого покупателя',
    area: 'ЖК Botanica · от 45 м²',
  },
  {
    tag: 'Апартаменты посуточно',
    before: 'Пустые фото на Airbnb',
    after: '+38% к стоимости суток после ремонта по списку',
    area: 'Центр · Студия 35 м²',
  },
];

// ─── Тарифы ──────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Один объект',
    price: '$49',
    per: 'за объект',
    desc: 'Для разовых задач',
    features: ['2 варианта обстановки', 'Список мебели с ценами', 'Ссылка для клиента', 'Доставка 48ч'],
    cta: 'Попробовать',
    highlight: false,
  },
  {
    name: 'Агент',
    price: '$120',
    per: '/ месяц',
    desc: 'До 5 объектов в месяц',
    features: ['Всё из «Один объект»', 'PDF-презентация для клиента', 'Брендирование логотипом', 'Приоритетная обработка'],
    cta: 'Выбрать тариф',
    highlight: true,
  },
  {
    name: 'Агентство',
    price: 'По запросу',
    per: '',
    desc: 'Неограниченно объектов',
    features: ['Белый лейбл', 'API-интеграция на сайт', 'Менеджер аккаунта', 'SLA 24ч'],
    cta: 'Написать нам',
    highlight: false,
  },
];

export default function RealtorPage() {
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sent, setSent] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    area: '',
    roomCount: '2',
    style: 'Современный',
    plan: 'Агент',
    photos: [] as File[],
    notes: '',
  });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setCurrentStep(1);

    try {
      // Конвертируем первое фото
      let photoBase64 = null;
      if (form.photos.length > 0) {
        const file = form.photos[0];
        photoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      // Шаг 2-4: design API
      setCurrentStep(2);
      const aiRes = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64,
          roomType: `Квартира (${form.roomCount} комн.)`,
          style: form.style,
          width: '4',
          length: '5',
          height: '2.7',
          wishes: `Адрес: ${form.address}. Площадь: ${form.area} м². ${form.notes}. Это объект для продажи/аренды — обстановка должна подчёркивать пространство.`,
        }),
      });
      setCurrentStep(3);
      const aiData = await aiRes.json();
      const design = aiData.design;
      if (design) localStorage.setItem('roomDesign', JSON.stringify(design));

      // Шаг 5: рендер
      setCurrentStep(4);
      setCurrentStep(5);
      const renderRes = await fetch('/api/render-pixtral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: `Квартира (${form.roomCount} комн.)`,
          style: form.style,
          width: '4', length: '5', height: '2.7',
          wishes: `Пустой объект для продажи. Адрес: ${form.address}.`,
          design,
        }),
      });
      const renderData = await renderRes.json();
      if (renderData.images?.length > 0) {
        localStorage.setItem('roomRenders', JSON.stringify(renderData.images));
      }

      // Шаг 6: заявка
      setCurrentStep(6);
      await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          roomType: `[B2B РИЕЛТОР] Квартира ${form.roomCount} комн. · ${form.area} м²`,
          style: form.style,
          packageType: form.plan,
          wishes: `Адрес: ${form.address}. ${form.notes}`,
          photoCount: form.photos.length,
          designPlan: design ? JSON.stringify(design, null, 2) : 'Не удалось',
        }),
      });

      setSent(true);
      setTimeout(() => { window.location.href = '/result'; }, 1400);

    } catch (err) {
      console.error(err);
      setSending(false);
      setCurrentStep(0);
    }
  };

  return (
    <main className="min-h-screen bg-[#07080a] text-white overflow-x-hidden" style={{ fontFamily: "'Geist', sans-serif" }}>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/8 sticky top-0 z-40 bg-[#07080a]/90 backdrop-blur-md">
        <a href="/" className="text-xl font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
          <span className="ml-2 text-xs font-normal text-gray-500 border border-gray-700 px-2 py-0.5 rounded-full">для риелторов</span>
        </a>
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-300 transition hidden md:block">← Обычный режим</a>
          <button
            onClick={() => setShowForm(true)}
            className="bg-violet-600 hover:bg-violet-500 transition px-5 py-2 rounded-full text-sm font-semibold"
          >
            Заказать визуализацию
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-8 pt-20 pb-20">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="text-center relative">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 text-sm px-4 py-1.5 rounded-full mb-8 border border-amber-500/20">
            <Building2 size={14} />
            B2B · Для агентств недвижимости и риелторов
          </div>

          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] mb-6 tracking-tight">
            Продавайте пустые{' '}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-amber-400">
              квартиры быстрее
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Загружаете фото пустого объекта — клиент видит готовую обстановку
            с реальной мебелью JYSK, ценами и 3D-концептом. За 48 часов.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-4 rounded-full text-base font-semibold"
            >
              Попробовать бесплатно <ArrowRight size={18} />
            </button>
            <a href="#cases"
              className="inline-flex items-center gap-2 border border-white/15 hover:border-violet-400/50 transition px-8 py-4 rounded-full text-base font-medium text-gray-300">
              <Eye size={16} /> Примеры работ
            </a>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
          className="grid grid-cols-3 gap-4 mt-20 max-w-2xl mx-auto">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-violet-400 mb-1">{s.value}</div>
              <div className="text-xs text-gray-500 leading-tight">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Как работает ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-3">Как это работает</h2>
        <p className="text-gray-500 text-center text-sm mb-12">Три шага от пустой квартиры до готовой презентации</p>

        <div className="grid md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-10 left-[calc(33%+1rem)] right-[calc(33%+1rem)] h-px bg-gradient-to-r from-violet-500/30 via-violet-500/60 to-violet-500/30" />

          {[
            {
              num: '01',
              icon: <Building2 size={20} className="text-violet-400" />,
              title: 'Загружаете фото объекта',
              desc: 'Пустая квартира, любое качество съёмки. Указываете метраж и пожелания по стилю.',
            },
            {
              num: '02',
              icon: <TrendingUp size={20} className="text-amber-400" />,
              title: 'AI создаёт 3 варианта обстановки',
              desc: 'Mistral + Pixtral генерируют планировку с реальными товарами JYSK и ценами.',
            },
            {
              num: '03',
              icon: <Send size={20} className="text-green-400" />,
              title: 'Отправляете клиенту ссылку',
              desc: 'Клиент открывает 3D-концепт на телефоне, видит мебель и может сразу купить.',
            },
          ].map((step, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}
              className="relative bg-white/4 border border-white/8 rounded-2xl p-6 hover:border-violet-500/30 transition">
              <div className="text-5xl font-black text-white/4 absolute top-4 right-5 leading-none">{step.num}</div>
              <div className="w-9 h-9 rounded-xl bg-white/6 flex items-center justify-center mb-4">{step.icon}</div>
              <h3 className="font-semibold mb-2 text-sm">{step.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Преимущества ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 py-8">
        <div className="grid md:grid-cols-2 gap-5">
          {[
            {
              icon: <Clock size={18} className="text-violet-400" />,
              title: 'Экономит время на показах',
              desc: 'Клиент приходит уже с пониманием как будет выглядеть его квартира. Меньше "подумаю" — больше сделок.',
            },
            {
              icon: <Users size={18} className="text-amber-400" />,
              title: 'Выигрывает у конкурентов',
              desc: 'Пока другие агенты показывают пустые стены — вы показываете готовый дом. Это продаёт.',
            },
            {
              icon: <Star size={18} className="text-green-400" />,
              title: 'Инструмент для застройщиков',
              desc: 'Для каждой планировки — персональный концепт. Покупатель видит свой будущий интерьер, а не типовой рендер.',
            },
            {
              icon: <TrendingUp size={18} className="text-blue-400" />,
              title: 'Аренда дороже на 20–40%',
              desc: 'Обставленные квартиры сдаются быстрее и дороже. Список мебели помогает хозяину купить нужное.',
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 bg-white/4 border border-white/8 rounded-2xl p-5 hover:border-white/15 transition">
              <div className="w-8 h-8 rounded-lg bg-white/6 flex items-center justify-center flex-shrink-0 mt-0.5">{item.icon}</div>
              <div>
                <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Кейсы ───────────────────────────────────────────────────────── */}
      <section id="cases" className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-2xl font-bold text-center mb-3">Примеры использования</h2>
        <p className="text-gray-500 text-center text-sm mb-12">Реальные сценарии для рынка Молдовы</p>

        <div className="grid md:grid-cols-3 gap-5">
          {CASES.map((c, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
              className="bg-white/4 border border-white/8 rounded-2xl p-5 hover:border-violet-500/30 transition group">
              <div className="text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full inline-block mb-4">
                {c.tag}
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 text-xs mt-0.5 flex-shrink-0">До</span>
                  <span className="text-gray-500 text-xs">{c.before}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">После</span>
                  <span className="text-gray-300 text-xs">{c.after}</span>
                </div>
              </div>
              <div className="text-xs text-gray-600 border-t border-white/6 pt-3">{c.area}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Тарифы ──────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-8 py-8 pb-20">
        <h2 className="text-2xl font-bold text-center mb-3">Тарифы</h2>
        <p className="text-gray-500 text-center text-sm mb-12">Без подписок. Платите только за результат.</p>

        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => (
            <div key={i} className={`rounded-2xl p-6 border transition relative ${
              plan.highlight
                ? 'border-violet-500 bg-violet-500/8'
                : 'border-white/8 bg-white/4 hover:border-white/15'
            }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-xs px-4 py-1 rounded-full font-medium">
                  Популярный
                </div>
              )}
              <div className="mb-4">
                <div className="text-xs text-gray-500 mb-1">{plan.name}</div>
                <div className="text-3xl font-bold">{plan.price}</div>
                {plan.per && <div className="text-xs text-gray-500 mt-0.5">{plan.per}</div>}
                <div className="text-xs text-gray-600 mt-1">{plan.desc}</div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-xs text-gray-400">
                    <Check size={12} className="text-violet-400 flex-shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => { setForm(f => ({ ...f, plan: plan.name })); setShowForm(true); }}
                className={`w-full py-2.5 rounded-full text-sm font-medium transition ${
                  plan.highlight
                    ? 'bg-violet-600 hover:bg-violet-500'
                    : 'border border-white/15 hover:border-violet-400/50 text-gray-300'
                }`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        {/* JYSK partnership hint */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-600">
            Интересует интеграция Interior AI на сайт вашего агентства или магазина?{' '}
            <button onClick={() => setShowForm(true)} className="text-violet-400 hover:underline">
              Напишите нам →
            </button>
          </p>
        </div>
      </section>

      {/* ── Модальная форма ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="bg-[#0f1012] border border-white/10 rounded-2xl p-7 max-w-lg w-full my-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold">Заявка на визуализацию</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Для агентств и риелторов</p>
                </div>
                {!sending && (
                  <button
                    onClick={() => { setShowForm(false); setSent(false); setCurrentStep(0); }}
                    className="text-gray-600 hover:text-white text-2xl leading-none transition"
                  >×</button>
                )}
              </div>

              {/* Прогресс */}
              <AnimatePresence>
                {sending && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mb-6 overflow-hidden">
                    <div className="space-y-2">
                      {STEPS.map((step) => {
                        const isDone = currentStep > step.id;
                        const isActive = currentStep === step.id;
                        return (
                          <motion.div key={step.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isActive || isDone ? 1 : 0.25, x: 0 }}
                            className="flex items-center gap-3 py-1">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                              isDone ? 'bg-violet-600' : isActive ? 'bg-violet-600/30 border border-violet-500' : 'bg-white/4 border border-white/10'
                            }`}>
                              {isDone ? <Check size={10} /> : isActive ? <Loader2 size={10} className="animate-spin text-violet-400" /> : <span className="text-white/20 text-[10px]">{step.id}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-xs font-medium transition-colors ${isActive ? 'text-white' : isDone ? 'text-gray-500' : 'text-gray-700'}`}>
                                {step.label}
                              </div>
                              {isActive && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-violet-400 mt-0.5">
                                  {step.sublabel}
                                </motion.div>
                              )}
                            </div>
                            {isActive && <div className="text-[10px] text-gray-600">~{step.duration}с</div>}
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="mt-4 h-0.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div className="h-full bg-violet-600 rounded-full"
                        animate={{ width: `${(currentStep / STEPS.length) * 100}%` }}
                        transition={{ duration: 0.5 }} />
                    </div>
                    <p className="text-center text-[11px] text-gray-600 mt-2">Около 2 минут — не закрывайте вкладку</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Форма */}
              <AnimatePresence>
                {!sending && !sent && (
                  <motion.form onSubmit={handleSubmit} className="space-y-3" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>

                    {/* Фото */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">Фото объекта (до 3 фото)</label>
                      <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/15 rounded-xl cursor-pointer hover:border-violet-500/50 transition">
                        <span className="text-gray-500 mb-1">🏠</span>
                        <span className="text-xs text-gray-500">
                          {form.photos.length > 0 ? `${form.photos.length} фото выбрано` : 'Фото квартиры / планировка'}
                        </span>
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={e => set('photos', Array.from(e.target.files || []))} />
                      </label>
                    </div>

                    {/* Имя + email */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Ваше имя</label>
                        <input type="text" required placeholder="Алексей"
                          value={form.name} onChange={e => set('name', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Телефон</label>
                        <input type="tel" placeholder="+373 ···"
                          value={form.phone} onChange={e => set('phone', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Email</label>
                      <input type="email" required placeholder="agent@agency.md"
                        value={form.email} onChange={e => set('email', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                    </div>

                    {/* Адрес объекта */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Адрес объекта</label>
                      <input type="text" placeholder="ул. Пушкина 22, Буюканы, Кишинёв"
                        value={form.address} onChange={e => set('address', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                    </div>

                    {/* Метраж + комнаты */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Площадь (м²)</label>
                        <input type="number" placeholder="65"
                          value={form.area} onChange={e => set('area', e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition" />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Количество комнат</label>
                        <select value={form.roomCount} onChange={e => set('roomCount', e.target.value)}
                          className="w-full bg-[#0f1012] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition">
                          <option value="1">1 комната / студия</option>
                          <option value="2">2 комнаты</option>
                          <option value="3">3 комнаты</option>
                          <option value="4">4+ комнаты</option>
                        </select>
                      </div>
                    </div>

                    {/* Стиль */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Стиль обстановки</label>
                      <select value={form.style} onChange={e => set('style', e.target.value)}
                        className="w-full bg-[#0f1012] border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition">
                        <option>Современный</option>
                        <option>Минимализм</option>
                        <option>Скандинавский</option>
                        <option>Cozy / Уютный</option>
                        <option>Индустриальный</option>
                        <option>Не знаю — подберите сами</option>
                      </select>
                    </div>

                    {/* Пакет */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1.5">Тариф</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Один объект', 'Агент', 'Агентство'].map(p => (
                          <button type="button" key={p}
                            onClick={() => set('plan', p)}
                            className={`py-2 rounded-xl text-xs font-medium border transition ${
                              form.plan === p
                                ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                                : 'border-white/10 text-gray-500 hover:border-white/25'
                            }`}>
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Пожелания */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Пожелания (необязательно)</label>
                      <textarea
                        placeholder="Например: семья с детьми, нужен кабинет, продаём срочно..."
                        value={form.notes} onChange={e => set('notes', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition resize-none"
                        rows={2} />
                    </div>

                    <button type="submit"
                      className="w-full bg-violet-600 hover:bg-violet-500 transition py-3 rounded-full font-semibold text-sm mt-1 flex items-center justify-center gap-2">
                      <Building2 size={15} /> Создать визуализацию объекта
                    </button>

                    <p className="text-center text-[11px] text-gray-600">
                      Результат за 48 часов · Ссылка для клиента · Список мебели с ценами
                    </p>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Успех */}
              {sent && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <div className="w-14 h-14 bg-violet-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check size={28} />
                  </div>
                  <p className="font-semibold text-lg mb-1">Готово!</p>
                  <p className="text-gray-500 text-sm">Переходим к визуализации...</p>
                </motion.div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
