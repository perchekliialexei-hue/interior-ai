import { NextRequest, NextResponse } from 'next/server';

// ── Карта типов мебели → английский ──────────────────────────────────────────
function typeToEN(type: string): string {
  const map: Record<string, string> = {
    bed: 'bed', sofa: 'sofa', wardrobe: 'wardrobe', desk: 'writing desk',
    chair: 'chair', chair_office: 'office chair', table: 'coffee table',
    shelf: 'bookshelf', lamp: 'floor lamp', plant: 'potted plant',
    rug: 'area rug', nightstand: 'nightstand',
  };
  return map[type] || type;
}

// ── Позиция предмета в комнате ────────────────────────────────────────────────
function positionToEN(item: any, width: number, length: number): string {
  const x = parseFloat(item.x) || width / 2;
  const z = parseFloat(item.z) || length / 2;
  const relX = x / width;
  const relZ = z / length;
  const h = relZ < 0.35 ? 'back' : relZ > 0.65 ? 'front' : 'center';
  const v = relX < 0.35 ? 'left' : relX > 0.65 ? 'right' : 'center';
  if (h === 'center' && v === 'center') return 'in the center of the room';
  if (v === 'center') return `along the ${h} wall`;
  if (h === 'center') return `along the ${v} wall`;
  return `in the ${h}-${v} corner`;
}

// ── Hex → читаемое описание цвета ────────────────────────────────────────────
function colorToEN(hex: string): string {
  if (!hex) return 'natural';
  const h = hex.replace('#', '').toLowerCase();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const brightness = (r + g + b) / 3;
  if (brightness > 220) return 'white';
  if (brightness < 60)  return 'black';
  if (r > 160 && g > 130 && b < 90) return 'warm oak';
  if (r > 180 && g > 160 && b > 130 && Math.abs(r - g) < 40) return 'beige';
  if (brightness > 150 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25) return 'light gray';
  if (r > 120 && g < 80 && b < 80) return 'red';
  if (r < 80 && g < 80 && b > 120) return 'navy blue';
  if (r < 80 && g > 100 && b < 80) return 'forest green';
  if (r > 180 && g > 150 && b > 100) return 'warm sand';
  if (r > 120 && g > 90 && b > 60) return 'natural wood';
  return 'neutral';
}

// ── Очистка румынского/молдавского названия для промпта ──────────────────────
// Убираем диакритику и переводим ключевые слова
function cleanProductName(name: string | undefined, type: string): string {
  if (!name) return typeToEN(type);
  return name
    .replace(/[ăâîșțĂÂÎȘȚ]/g, (c) => ({ ă:'a', â:'a', î:'i', ș:'s', ț:'t', Ă:'A', Â:'A', Î:'I', Ș:'S', Ț:'T' }[c] || c))
    .replace(/\bpat\b/gi, 'bed')
    .replace(/\bTablie\b/gi, 'headboard')
    .replace(/\bComoda\b/gi, 'chest of drawers')
    .replace(/\bNoptiera\b/gi, 'nightstand')
    .replace(/\bBirou\b/gi, 'desk')
    .replace(/\bScaun\b/gi, 'chair')
    .replace(/\bEtajera\b/gi, 'shelf')
    .replace(/\bLampadar\b/gi, 'floor lamp')
    .replace(/\bCovor\b/gi, 'rug')
    .replace(/\bdulap\b/gi, 'wardrobe')
    .replace(/\bsofa\b/gi, 'sofa')
    .replace(/\bcanapea\b/gi, 'sofa');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    const W = parseFloat(width) || 4;
    const L = parseFloat(length) || 5;
    const H = parseFloat(height) || 2.7;

    const furniture = design?.furniture || [];
    const wallColor  = design?.colors?.walls   || '#F4F0EA';
    const floorColor = design?.colors?.floor   || '#C8B89A';
    const accentColor = design?.colors?.accent || '#8B7355';

    console.log('render-pixtral start, furniture:', furniture.length);

    // ── Строим детальное описание мебели ─────────────────────────────────────
    // Включаем: очищенное название, тип, цвет, позицию
    const furnitureLines = furniture.map((f: any) => {
      const cleanName = cleanProductName(f.jysk_name || f.name, f.type);
      const colorDesc = colorToEN(f.color);
      const position  = positionToEN(f, W, L);
      const sizeHint  = f.width && f.depth
        ? `(${f.width}m × ${f.depth}m)`
        : '';
      return `- ${colorDesc} ${typeToEN(f.type)} "${cleanName}" ${sizeHint}, ${position}`;
    }).join('\n');

    // ── Pixtral анализирует фото реальных товаров ─────────────────────────────
    const furnitureWithImages = furniture
      .filter((f: any) => f.image && ['bed', 'sofa', 'wardrobe', 'desk', 'chair'].includes(f.type))
      .slice(0, 3);

    let pixtralContext = '';
    if (furnitureWithImages.length > 0) {
      const imageContents: any[] = [];
      for (const item of furnitureWithImages) {
        try {
          const res = await fetch(item.image);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mime = res.headers.get('content-type') || 'image/jpeg';
            const cleanedName = cleanProductName(item.jysk_name || item.name, item.type);
            imageContents.push({ type: 'image_url', image_url: `data:${mime};base64,${base64}` });
            imageContents.push({ type: 'text', text: `This is a ${typeToEN(item.type)} called "${cleanedName}". Color: ${colorToEN(item.color)}.` });
          }
        } catch {}
      }

      if (imageContents.length > 0) {
        try {
          const pixtralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
            body: JSON.stringify({
              model: 'pixtral-12b-2409',
              messages: [{
                role: 'user',
                content: [
                  ...imageContents,
                  { type: 'text', text: `For each furniture piece, describe in ONE sentence: exact color tone, material finish, and key visual details that would help an artist render it realistically. Be specific: "warm beige oak veneer with brushed brass legs" not just "wooden".` }
                ],
              }],
              max_tokens: 250,
              temperature: 0.1,
            }),
          });
          const pixtralData = await pixtralRes.json();
          pixtralContext = pixtralData.choices?.[0]?.message?.content || '';
          console.log('Pixtral context:', pixtralContext.substring(0, 200));
        } catch (e) {
          console.error('Pixtral context error:', e);
        }
      }
    }

    // ── Стили ─────────────────────────────────────────────────────────────────
    const styleMap: Record<string, { mood: string; lighting: string; materials: string; atmosphere: string }> = {
      'Минимализм': {
        mood: 'minimalist Japandi interior design',
        lighting: 'soft diffused daylight from large windows, subtle warm shadows, 2700K ambient glow',
        materials: 'white oak wood grain, matte plaster walls, natural linen textiles, brushed brass hardware',
        atmosphere: 'serene, uncluttered, zen-like tranquility',
      },
      'Скандинавский': {
        mood: 'Scandinavian hygge interior design',
        lighting: 'warm afternoon golden-hour sunlight through sheer linen curtains',
        materials: 'light birch veneer, chunky wool, sheepskin throws, white-painted wood, rattan accents',
        atmosphere: 'warm, inviting, cozy Nordic atmosphere',
      },
      'Cozy / Уютный': {
        mood: 'cozy eclectic bohemian interior design',
        lighting: 'warm layered lighting — floor lamps and table lamps creating pools of amber light',
        materials: 'terracotta ceramics, plush velvet, macrame, mixed wood tones, aged brass',
        atmosphere: 'rich, layered, personal and warm',
      },
      'Gaming Setup': {
        mood: 'premium gaming room interior design',
        lighting: 'dramatic RGB LED ambient in blue-purple tones, focused desk lighting',
        materials: 'matte black surfaces, tempered glass, RGB peripherals, carbon fiber, LED strips',
        atmosphere: 'high-tech, dramatic, immersive gaming cave',
      },
      'Индустриальный': {
        mood: 'industrial loft interior design',
        lighting: 'warm Edison bulb pendants against cool daylight, deep shadows',
        materials: 'exposed brick, raw steel, aged leather, reclaimed dark wood, concrete',
        atmosphere: 'raw, bold, sophisticated urban',
      },
      'Современный': {
        mood: 'contemporary modern interior design',
        lighting: 'bright even lighting with recessed LED, clean crisp shadows',
        materials: 'glossy lacquer, chrome hardware, glass surfaces, smooth leather, neutral tones',
        atmosphere: 'sleek, polished, sophisticated',
      },
      'Классический': {
        mood: 'classic traditional interior design',
        lighting: 'warm chandelier light with soft window daylight',
        materials: 'carved wood moldings, velvet upholstery, brass fixtures, parquet flooring, crown molding',
        atmosphere: 'elegant, timeless, refined',
      },
    };

    const styleData = styleMap[style] || {
      mood: `${style} interior design`,
      lighting: 'beautiful natural light',
      materials: 'high-quality furniture and premium finishes',
      atmosphere: 'elegant and comfortable',
    };

    const wallColorDesc  = colorToEN(wallColor);
    const floorColorDesc = colorToEN(floorColor);
    const accentColorDesc = colorToEN(accentColor);

    const wallDesc =
      wallColorDesc === 'white'      ? 'crisp matte white plaster walls' :
      wallColorDesc === 'beige'      ? 'warm sand beige painted walls' :
      wallColorDesc === 'light gray' ? 'sophisticated light greige walls' :
      wallColorDesc === 'warm sand'  ? 'warm sand-toned textured walls' :
      `${wallColorDesc} painted walls`;

    const floorDesc =
      floorColorDesc === 'warm oak'    ? 'wide-plank warm oak hardwood flooring' :
      floorColorDesc === 'beige'       ? 'light travertine stone tile flooring' :
      floorColorDesc === 'natural wood'? 'brushed natural oak plank flooring' :
      floorColorDesc === 'white'       ? 'white polished concrete flooring' :
      `${floorColorDesc} flooring`;

    const roomTypeEN = (roomType || 'living room').toLowerCase()
      .replace('спальня', 'bedroom')
      .replace('гостиная', 'living room')
      .replace('кухня-гостиная', 'open-plan kitchen living room')
      .replace('студия', 'studio apartment')
      .replace('кабинет', 'home office');

    // ── Базовый промпт ────────────────────────────────────────────────────────
    const basePrompt = `Professional architectural interior photography, ${styleData.mood}.
${roomTypeEN}, ${W}m wide by ${L}m deep, ${H}m ceiling height.
${wallDesc}, ${floorDesc}, accent color ${accentColorDesc}, clean baseboards.
Atmosphere: ${styleData.atmosphere}. Lighting: ${styleData.lighting}.
Material palette: ${styleData.materials}.

Furniture (render each piece accurately matching its real appearance):
${furnitureLines}

${pixtralContext ? `Exact visual descriptions from product photos: ${pixtralContext.substring(0, 400)}` : ''}
${wishes ? `Client requirements: ${wishes}` : ''}

Shot on Phase One IQ4 150MP, 24mm tilt-shift lens, f/8, ISO 100.
Ultra-photorealistic, 8K, ray-traced global illumination, physically accurate materials,
professional color grading, magazine editorial quality, no people, no text.`;

    const negativePrompt = [
      'cartoon', 'illustration', 'painting', 'sketch', 'anime', 'CGI look',
      'plastic', 'blurry', 'oversaturated', 'distorted', 'fish-eye',
      'people', 'humans', 'text', 'watermark', 'logo',
      'low quality', 'dark', 'overexposed', 'noise', 'bad proportions',
    ].join(', ');

    // ── Два варианта — разные углы ────────────────────────────────────────────
    const variants = [
      `${basePrompt} Camera: wide establishing shot from corner near doorway, showing complete room, slight upward angle.`,
      `${basePrompt} Camera: dynamic 3/4 perspective from 1.5m height, diagonal composition showing depth between furniture.`,
    ];

    const images: string[] = [];

    for (const promptVariant of variants) {
      const seed = Math.floor(Math.random() * 9999999);
      const encodedPrompt = encodeURIComponent(promptVariant);
      const encodedNeg    = encodeURIComponent(negativePrompt);

      const urls = [
        `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1344&height=896&nologo=true&enhance=true&seed=${seed}&model=flux-pro&negative=${encodedNeg}`,
        `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1344&height=896&nologo=true&enhance=true&seed=${seed}&model=flux&negative=${encodedNeg}`,
      ];

      let generated = false;
      for (const url of urls) {
        if (generated) break;
        try {
          console.log('Trying:', url.includes('flux-pro') ? 'flux-pro' : 'flux');
          const imgRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(90000),
          });
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mime = imgRes.headers.get('content-type') || 'image/jpeg';
            images.push(`data:${mime};base64,${base64}`);
            console.log('✅ Image generated:', Math.round(buffer.byteLength / 1024), 'KB');
            generated = true;
          } else {
            console.error('❌ Pollinations failed:', imgRes.status);
          }
        } catch (e) {
          console.error('❌ Fetch error:', e);
        }
      }
    }

    console.log('Total images:', images.length);

    // ── Pixtral анализирует рендер и возвращает позиции для 3D ───────────────
    let renderLayout: any[] = [];
    if (images.length > 0) {
      try {
        // Берём base64 первого рендера (убираем data:image/...;base64, prefix)
        const firstImageBase64 = images[0].split(',')[1];
        const firstImageMime = images[0].split(';')[0].split(':')[1];

        const layoutRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
          body: JSON.stringify({
            model: 'pixtral-12b-2409',
            messages: [{
              role: 'user',
              content: [
                { type: 'image_url', image_url: `data:${firstImageMime};base64,${firstImageBase64}` },
                { type: 'text', text: `Analyze this interior render. The room is ${W}m wide (x-axis: 0=left wall, ${W}=right wall) and ${L}m deep (z-axis: 0=back wall, ${L}=front/viewer side).

For each furniture piece clearly visible, estimate its position and properties.
Return ONLY a valid JSON array, no text before or after:
[
  {"type":"sofa","x":2.0,"z":1.2,"rotation":0,"wall":"back","shape":"straight"},
  {"type":"table","x":2.5,"z":2.8,"rotation":0,"wall":"none","shape":"rectangular"}
]

Rules:
- type: bed|sofa|wardrobe|dresser|desk|chair|table|shelf|lamp|plant|rug|nightstand|curtains|painting|blanket|cushions|mirror
- x: distance from LEFT wall (0 to ${W})
- z: distance from BACK wall (0 to ${L})  
- rotation: 0=facing viewer, 90=facing right wall, 180=facing back wall, 270=facing left wall
- wall: which wall it's against (back/left/right/front/none)
- shape for sofa: straight|L-shaped|corner|sectional
- shape for bed: platform|panel|sleigh|standard
- shape for table: round|rectangular|oval
- Only include items clearly visible, max 12 items` }
              ]
            }],
            max_tokens: 800,
            temperature: 0.1,
          }),
        });

        const layoutData = await layoutRes.json();
        const layoutText = layoutData.choices?.[0]?.message?.content || '';
        console.log('Render layout from Pixtral:', layoutText.substring(0, 400));

        const arrMatch = layoutText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const parsed: any[] = JSON.parse(arrMatch[0]);

          // Мержим с оригинальным design.furniture — сохраняем цвета, цены, ссылки
          // Начинаем с оригинального списка — не теряем предметы
const usedTypes = new Set<string>();
renderLayout = furniture.map((original: any) => {
  // Ищем соответствие в том что Pixtral увидел на рендере
  const layoutItem = parsed.find(
    (p: any) => p.type === original.type && !usedTypes.has(p.type + '_' + parsed.indexOf(p))
  );
  if (layoutItem) {
    usedTypes.add(layoutItem.type + '_' + parsed.indexOf(layoutItem));
    return {
      ...original,
      x: layoutItem.x,
      z: layoutItem.z,
      rotation: layoutItem.rotation ?? original.rotation ?? 0,
      wall: layoutItem.wall ?? original.wall,
      shape: layoutItem.shape,
    };
  }
  // Pixtral не увидел этот предмет — оставляем оригинальные координаты
  return original;
});

          console.log('✅ Render layout merged:', renderLayout.length, 'items');
        }
      } catch (e) {
        console.error('Render layout analysis error:', e);
      }
    }

    return NextResponse.json({
      success: true,
      images,
      // Если Pixtral прочитал рендер — передаём обновлённый layout
      // page.tsx сохранит его в localStorage вместо оригинального design
      renderLayout: renderLayout.length > 0 ? renderLayout : null,
    });

  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}