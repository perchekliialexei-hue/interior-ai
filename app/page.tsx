'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Box, ShoppingBag } from 'lucide-react';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', roomType: 'Спальня', style: 'Минимализм', packageType: 'Starter — $35'
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    setSending(false);
    if (res.ok) setSent(true);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">

      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <div className="text-xl font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-violet-600 hover:bg-violet-500 transition px-5 py-2 rounded-full text-sm font-medium"
        >
          Заказать дизайн
        </button>
      </nav>

      <section className="max-w-5xl mx-auto px-8 pt-24 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block bg-violet-500/10 text-violet-400 text-sm px-4 py-1 rounded-full mb-6 border border-violet-500/20">
            AI + Интерактивный 3D
          </span>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
            Твоя комната —{' '}
            <span className="text-violet-400">Pinterest level</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Присылаешь фото комнаты — получаешь интерактивный 3D-концепт
            который можно покрутить и рассмотреть со всех сторон. За 48 часов.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition px-8 py-4 rounded-full text-lg font-semibold"
          >
            Получить концепт <ArrowRight size={20} />
          </button>
        </motion.div>
      </section>

      <section className="max-w-5xl mx-auto px-8 py-16 grid md:grid-cols-3 gap-6">
        {[
          { icon: <Sparkles className="text-violet-400" size={28} />, title: 'AI-референсы', desc: 'Подбираем стили под твои предпочтения — видишь что получится до начала работы' },
          { icon: <Box className="text-violet-400" size={28} />, title: 'Интерактивный 3D', desc: 'Готовую комнату можно крутить, смотреть с разных углов прямо в браузере' },
          { icon: <ShoppingBag className="text-violet-400" size={28} />, title: 'Список покупок', desc: 'Каждый предмет мебели — с ценой и ссылкой где купить' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 * i, duration: 0.5 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-violet-500/40 transition"
          >
            <div className="mb-4">{item.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
          </motion.div>
        ))}
      </section>

      <section className="max-w-5xl mx-auto px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Пакеты</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Starter', price: '$35', desc: '1 комната', features: ['3 варианта дизайна', '2D-рендеры', 'Список мебели', 'Доставка 48ч'], highlight: false },
            { name: 'Pro', price: '$85', desc: 'до 3 комнат', features: ['5 вариантов', 'Интерактивный 3D', 'Мудборд', 'Список с ценами', '1 правка'], highlight: true },
            { name: 'Business', price: '$200+', desc: 'кафе / офис', features: ['Без ограничений', 'Полный 3D-тур', 'Презентация', 'Приоритет'], highlight: false },
          ].map((pkg, i) => (
            <div key={i} className={`rounded-2xl p-6 border ${pkg.highlight ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
              {pkg.highlight && <span className="text-xs bg-violet-500 px-3 py-1 rounded-full mb-4 inline-block">Популярный</span>}
              <div className="text-3xl font-bold mb-1">{pkg.price}</div>
              <div className="text-sm text-gray-400 mb-4">{pkg.name} · {pkg.desc}</div>
              <ul className="space-y-2 mb-6">
                {pkg.features.map((f, j) => (
                  <li key={j} className="text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-violet-400">✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setShowForm(true)}
                className={`w-full py-2 rounded-full text-sm font-medium transition ${pkg.highlight ? 'bg-violet-600 hover:bg-violet-500' : 'border border-white/20 hover:border-violet-400'}`}
              >
                Выбрать
              </button>
            </div>
          ))}
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 rounded-2xl p-8 max-w-lg w-full"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Заказать концепт</h2>
              <button onClick={() => { setShowForm(false); setSent(false); }} className="text-gray-400 hover:text-white text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Ваше имя</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                  placeholder="Алексей"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                  placeholder="alex@email.com"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Тип комнаты</label>
                <select
                  value={formData.roomType}
                  onChange={e => setFormData({...formData, roomType: e.target.value})}
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
                  onChange={e => setFormData({...formData, style: e.target.value})}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                >
                  <option>Минимализм</option>
                  <option>Скандинавский</option>
                  <option>Cozy / Уютный</option>
                  <option>Gaming Setup</option>
                  <option>Индустриальный</option>
                  <option>Не знаю — помогите выбрать</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Пакет</label>
                <select
                  value={formData.packageType}
                  onChange={e => setFormData({...formData, packageType: e.target.value})}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500 transition"
                >
                  <option>Starter — $35</option>
                  <option>Pro — $85</option>
                  <option>Business — $200+</option>
                </select>
              </div>

              {sent ? (
                <div className="text-center py-4">
                  <div className="text-2xl mb-2">✅</div>
                  <p className="text-green-400 font-semibold">Заявка отправлена!</p>
                  <p className="text-gray-400 text-sm mt-1">Свяжемся с вами в течение 24 часов</p>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition py-3 rounded-full font-semibold mt-2"
                >
                  {sending ? 'Отправляем...' : 'Отправить заявку'}
                </button>
              )}
            </form>
          </motion.div>
        </div>
      )}

    </main>
  );
}