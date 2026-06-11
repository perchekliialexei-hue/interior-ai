'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Share2, Check, Copy, ExternalLink } from 'lucide-react';

export default function Result() {
  const [renders, setRenders] = useState<string[]>([]);
  const [selected, setSelected] = useState(0);
  const [design, setDesign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenProgress, setRegenProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const savedRenders = localStorage.getItem('roomRenders');
    const savedDesign = localStorage.getItem('roomDesign');
    if (savedRenders) setRenders(JSON.parse(savedRenders));
    if (savedDesign) setDesign(JSON.parse(savedDesign));
    setLoading(false);
  }, []);

  const handleShare = async () => {
    if (shareUrl) { copyToClipboard(shareUrl); return; }
    setSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design, renders }),
      });
      const data = await res.json();
      if (data.success) {
        const url = `${window.location.origin}${data.url}`;
        setShareUrl(url);
        copyToClipboard(url);
      }
    } catch (e) { console.error(e); }
    finally { setSharing(false); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleRegenerate = async () => {
    if (!design) return;
    setRegenerating(true);
    setRegenProgress(10);
    try {
      const res = await fetch('/api/render-pixtral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomType: design.roomType || 'Спальня',
          style:    design.style   || 'Минимализм',
          width:    design.width   || '4',
          length:   design.length  || '5',
          height:   design.height  || '2.7',
          wishes:   design.wishes  || '',
          design,
        }),
      });
      setRegenProgress(80);
      const data = await res.json();
      if (data.images?.length > 0) {
        localStorage.setItem('roomRenders', JSON.stringify(data.images));
        setRenders(data.images);
        setSelected(0);
      }
      if (data.renderLayout && design) {
        const updatedDesign = { ...design, furniture: data.renderLayout };
        localStorage.setItem('roomDesign', JSON.stringify(updatedDesign));
        setDesign(updatedDesign);
      }
      setRegenProgress(100);
    } catch (e) { console.error('Regen error:', e); }
    finally { setRegenerating(false); setRegenProgress(0); }
  };

  const furniture = design?.furniture || [];
  const total = furniture.reduce((sum: number, item: any) => {
    const price = parseInt(String(item.jysk_price || item.price || '0').replace(/\D/g, ''));
    return sum + (isNaN(price) ? 0 : price);
  }, 0);

  const handleViewIn3D = () => {
    const d = design || {};
    router.push(`/viewer?width=${d.width || 4}&length=${d.length || 5}&height=${d.height || 2.7}&style=${encodeURIComponent(d.style || 'Минимализм')}&fromDesign=1`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-white text-xl animate-pulse">Загружаем результат...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="flex flex-wrap justify-between items-center px-4 sm:px-8 py-4 gap-2 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 transition px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {regenerating
              ? <span className="animate-pulse">Генерируем... {regenProgress}%</span>
              : <>🔄 Перегенерировать</>}
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 transition px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50"
          >
            {sharing ? <span className="animate-pulse">Сохраняем...</span>
              : copied ? <><Check size={14} className="text-green-400" /> Скопировано!</>
              : shareUrl ? <><Copy size={14} /> Копировать ссылку</>
              : <><Share2 size={14} /> Поделиться</>}
          </button>
          <div className="text-right hidden sm:block">
            <div className="text-sm text-violet-400 font-medium">{design?.style || 'Дизайн'}</div>
            <div className="text-xs text-gray-500">{design?.width || 4}м × {design?.length || 5}м × {design?.height || 2.7}м</div>
          </div>
        </div>
      </nav>

      {shareUrl && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-violet-500/10 border-b border-violet-500/20 px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Check size={14} className="text-violet-400" />
            <span className="text-gray-300">Ссылка создана:</span>
            <span className="text-violet-400 font-mono text-xs truncate max-w-[120px] sm:max-w-xs">{shareUrl}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => copyToClipboard(shareUrl)}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition">
              <Copy size={12} /> Копировать
            </button>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition">
              <ExternalLink size={12} /> Открыть
            </a>
          </div>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Варианты дизайна</h2>
            <div className="space-y-4">
              {renders.length > 0 ? renders.map((src, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }} onClick={() => setSelected(i)}
                  className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all ${
                    selected === i ? 'border-violet-500 shadow-lg shadow-violet-500/20' : 'border-white/10 hover:border-white/30'
                  }`}>
                  <img src={src} alt={`Вариант ${i + 1}`} className="w-full object-cover" />
                  <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium">
                    Вариант {i + 1}
                  </div>
                  {selected === i && (
                    <div className="absolute top-3 right-3 bg-violet-500 px-3 py-1 rounded-full text-xs font-semibold">
                      ✓ Выбрано
                    </div>
                  )}
                </motion.div>
              )) : (
                <div className="aspect-video bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <p className="text-gray-500 text-sm">Рендеры не найдены</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {design?.concept && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5">
                <div className="text-xs text-violet-400 font-medium mb-2 uppercase tracking-wider">✨ Концепт дизайна</div>
                <p className="text-sm text-gray-300 leading-relaxed">{design.concept}</p>
              </motion.div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Мебель из дизайна</h2>
                <a href="https://jysk.md" target="_blank" className="text-xs text-gray-500 hover:text-violet-400 transition">
                  jysk.md →
                </a>
              </div>
              <div className="space-y-2">
                {furniture.map((item: any, i: number) => (
                  <motion.a key={i} href={item.jysk_url || item.shop_url || 'https://jysk.md'}
                    target="_blank" rel="noopener noreferrer"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-violet-500/40 hover:bg-violet-500/5 transition-all group">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color || '#888' }} />
                      <span className="text-sm text-gray-300 group-hover:text-white transition truncate max-w-[200px]">
                        {item.jysk_name || item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-violet-400 font-semibold text-sm">{item.jysk_price || item.price || '—'}</span>
                      <span className="text-gray-600 text-xs group-hover:text-gray-400 transition">→</span>
                    </div>
                  </motion.a>
                ))}
              </div>
              {total > 0 && (
                <div className="mt-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-sm text-gray-400 font-medium">Итого</span>
                  <span className="text-white font-bold">{total.toLocaleString('ru-RU')} MDL</span>
                </div>
              )}
            </div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              onClick={handleViewIn3D}
              className="w-full bg-violet-600 hover:bg-violet-500 transition py-4 rounded-2xl font-semibold text-lg">
              Смотреть в 3D →
            </motion.button>

            <p className="text-center text-xs text-gray-600">
              Нравится дизайн? <a href="/" className="text-violet-400 hover:underline">Заказать персональный концепт</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}