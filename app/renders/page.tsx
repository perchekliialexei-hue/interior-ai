'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function Renders() {
  const [renders, setRenders] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loaded, setLoaded] = useState<boolean[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem('roomRenders');
    if (saved) {
      const imgs = JSON.parse(saved);
      setRenders(imgs);
      setLoaded(new Array(imgs.length).fill(false));
    }
  }, []);

  const handleContinue = async () => {
    if (selected === null) return;
    setAnalyzing(true);

    try {
      const selectedImage = renders[selected];
      const savedDesign = localStorage.getItem('roomDesign');
      const baseDesign = savedDesign ? JSON.parse(savedDesign) : {};
      const base64 = selectedImage.split(',')[1];

    console.log('Sheets raw:', JSON.stringify(sheetsData).substring(0, 300));
    console.log('Products count:', products.length);
    console.log('Image type:', selectedImage?.substring(0, 50));
    console.log('Base64 length:', base64?.length);
      const res = await fetch('/api/analyze-render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          roomType: baseDesign.roomType || 'Спальня',
          style: baseDesign.style || 'Минимализм',
          width: baseDesign.width || '4',
          length: baseDesign.length || '5',
          height: baseDesign.height || '2.7',
        }),
      });

      const data = await res.json();
      console.log('Analyze result:', data);

      if (data.design) {
        localStorage.setItem('roomDesign', JSON.stringify({
          ...baseDesign,
          ...data.design,
          roomType: baseDesign.roomType,
          style: baseDesign.style,
          width: baseDesign.width,
          length: baseDesign.length,
          height: baseDesign.height,
          selectedRender: selectedImage,
        }));
      }

      const d = baseDesign;
      router.push(`/viewer?width=${d.width || 4}&length=${d.length || 5}&height=${d.height || 2.7}&style=${encodeURIComponent(d.style || 'Минимализм')}&fromDesign=1`);
    } catch (e) {
      console.error(e);
      const d = JSON.parse(localStorage.getItem('roomDesign') || '{}');
      router.push(`/viewer?width=${d.width || 4}&length=${d.length || 5}&height=${d.height || 2.7}&style=${encodeURIComponent(d.style || 'Минимализм')}&fromDesign=1`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <nav className="flex justify-between items-center px-8 py-6 border-b border-white/10">
        <a href="/" className="text-xl font-bold tracking-tight">
          Interior<span className="text-violet-400">AI</span>
        </a>
      </nav>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Выбери понравившийся вариант</h1>
          <p className="text-gray-400">Нажми на рендер — и увидишь его в 3D</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {renders.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              onClick={() => setSelected(i)}
              className={`relative cursor-pointer rounded-2xl overflow-hidden border-2 transition-all aspect-video bg-white/5 flex items-center justify-center ${
                selected === i ? 'border-violet-500 shadow-lg shadow-violet-500/30' : 'border-white/10 hover:border-white/30'
              }`}
            >
              {!loaded[i] && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-gray-500 text-sm">Генерируется...</div>
                </div>
              )}
              <img
                src={src}
                alt={`Вариант ${i + 1}`}
                className="w-full h-full object-cover"
                onLoad={() => setLoaded(prev => { const n = [...prev]; n[i] = true; return n; })}
              />
              <div className="absolute top-3 left-3 bg-black/60 px-3 py-1 rounded-full text-sm font-medium">
                Вариант {i + 1}
              </div>
              {selected === i && (
                <div className="absolute inset-0 bg-violet-500/10 flex items-center justify-center">
                  <div className="bg-violet-500 rounded-full px-4 py-2 font-semibold text-sm">✓ Выбрано</div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {selected !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <button
              onClick={handleContinue}
              disabled={analyzing}
              className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 transition px-10 py-4 rounded-full text-lg font-semibold"
            >
              {analyzing ? '⏳ Анализируем рендер...' : 'Смотреть в 3D →'}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}