'use client';
import { ArrowRight, Sparkles, Box, ShoppingBag } from 'lucide-react';
import { InteractiveBackground } from '@/components/interactive-background';
import { InteractiveBranches } from '../src/components/interactive-branches';

export default function Home() {
  return (
    <main className="relative min-h-screen bg-black text-white overflow-hidden">
      <InteractiveBackground />
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
          <div className="mt-10 flex items-center gap-4 sm:gap-6 text-white/50">
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
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#c8aa72]">Отзывы</span>
          <h2 className="mt-4 font-serif text-3xl font-light text-white sm:text-4xl">Что говорят клиенты</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { name: 'Анна, 24',    room: 'Спальня · Минимализм', text: 'Не могла представить как будет выглядеть комната пока не увидела 3D. Заказала мебель точно по списку — всё встало идеально!', stars: 5 },
            { name: 'Дмитрий, 28', room: 'Gaming Room',           text: 'Крутой сервис. Получил 3D своей будущей комнаты за 2 дня. Мог крутить и смотреть со всех сторон. Стоит каждого цента.', stars: 5 },
            { name: 'Кафе Bloom',  room: 'Коммерческий проект',   text: 'Показали концепт инвесторам ещё до ремонта. Очень помогло в презентации. Рекомендуем всем кто открывает заведение.', stars: 5 },
          ].map((review, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="text-yellow-400 text-sm mb-3">{'★'.repeat(review.stars)}</div>
              <p className="text-white/70 text-sm leading-relaxed mb-4">"{review.text}"</p>
              <div>
                <div className="font-serif text-sm text-white">{review.name}</div>
                <div className="font-mono text-[11px] text-white/40 mt-0.5">{review.room}</div>
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

    </main>
  );
}