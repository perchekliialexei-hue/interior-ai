import { NextRequest, NextResponse } from 'next/server';

function typeToEN(type: string): string {
  const map: Record<string, string> = {
    bed: 'bed', sofa: 'sofa', wardrobe: 'wardrobe', desk: 'writing desk',
    chair: 'chair', chair_office: 'office chair', table: 'coffee table',
    shelf: 'bookshelf', lamp: 'floor lamp', plant: 'potted plant',
    rug: 'area rug', nightstand: 'nightstand', wardrobe2: 'dresser',
  };
  return map[type] || type;
}

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

function colorToEN(hex: string): string {
  if (!hex) return '';
  const h = hex.replace('#', '').toLowerCase();
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (r > 220 && g > 220 && b > 220) return 'white';
  if (r < 60 && g < 60 && b < 60) return 'black';
  if (r > 150 && g > 120 && b < 80) return 'warm oak';
  if (r > 120 && g > 100 && b > 80 && Math.abs(r - g) < 40) return 'beige';
  if (r > 100 && g > 100 && b > 100 && Math.abs(r - g) < 20) return 'light gray';
  if (r > 120 && g < 80 && b < 80) return 'red';
  if (r < 80 && g < 80 && b > 120) return 'navy blue';
  if (r < 80 && g > 100 && b < 80) return 'forest green';
  if (r > 180 && g > 150 && b > 100) return 'warm sand';
  return 'natural wood';
}

function colorToHex(hex: string): string {
  return hex || '#F4F0EA';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    const W = parseFloat(width) || 4;
    const L = parseFloat(length) || 5;
    const H = parseFloat(height) || 2.7;

    console.log('render-pixtral start, furniture:', design?.furniture?.length);

    const furniture = design?.furniture || [];
    const wallColor = design?.colors?.walls || '#F4F0EA';
    const floorColor = design?.colors?.floor || '#C8B89A';

    const furnitureDetails = furniture.map((f: any) => {
      const name = f.jysk_name || f.name || typeToEN(f.type);
      const color = colorToEN(f.color);
      const position = positionToEN(f, W, L);
      return `- ${name}${color ? ', ' + color : ''}, positioned ${position}`;
    }).join('\n');

    // Pixtral: анализ реальных фото товаров
    const furnitureWithImages = furniture
      .filter((f: any) => f.image && ['bed', 'sofa', 'wardrobe', 'desk', 'chair', 'chair_office'].includes(f.type))
      .slice(0, 3);

    console.log('furniture with images:', furnitureWithImages.length);

    let pixtralContext = '';

    if (furnitureWithImages.length > 0) {
      const imageContents: any[] = [];
      for (const item of furnitureWithImages) {
        try {
          const res = await fetch(item.image);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = res.headers.get('content-type') || 'image/jpeg';
            imageContents.push({ type: 'image_url', image_url: `data:${mimeType};base64,${base64}` });
            imageContents.push({ type: 'text', text: `Item: ${item.jysk_name || item.name}` });
          }
        } catch {}
      }

      if (imageContents.length > 0) {
        const pixtralPrompt = `Describe each furniture piece's exact visual appearance in 1 sentence: 
material finish, texture, color tone, style details. Be precise and concise.`;

        try {
          const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'pixtral-12b-2409',
              messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: pixtralPrompt }] }],
              max_tokens: 200,
              temperature: 0.2,
            }),
          });
          const data = await response.json();
          pixtralContext = data.choices?.[0]?.message?.content || '';
          console.log('Pixtral context length:', pixtralContext.length);
        } catch (e) {
          console.error('Pixtral error:', e);
        }
      }
    }

    // Детальный маппинг стилей
    const styleMap: Record<string, { mood: string; lighting: string; materials: string; atmosphere: string }> = {
      'Минимализм': {
        mood: 'minimalist Japandi interior design',
        lighting: 'soft diffused daylight from large windows, subtle warm shadows, 2700K ambient glow',
        materials: 'white oak wood grain, matte plaster walls, natural linen textiles, brushed brass hardware',
        atmosphere: 'serene, uncluttered, zen-like tranquility',
      },
      'Скандинавский': {
        mood: 'Scandinavian hygge interior design',
        lighting: 'warm afternoon golden-hour sunlight through sheer linen curtains, cozy glow',
        materials: 'light birch veneer, chunky wool knits, sheepskin throws, white-painted wood, rattan accents',
        atmosphere: 'warm, inviting, cozy Nordic atmosphere',
      },
      'Cozy / Уютный': {
        mood: 'cozy eclectic bohemian interior design',
        lighting: 'warm layered lighting — floor lamps and table lamps creating pools of amber light',
        materials: 'terracotta ceramics, plush velvet, macrame wall art, mixed wood tones, aged brass',
        atmosphere: 'rich, layered, personal and warm',
      },
      'Gaming Setup': {
        mood: 'premium gaming room interior design',
        lighting: 'dramatic RGB LED ambient strips in blue-purple tones, focused desk lighting',
        materials: 'matte black surfaces, tempered glass, RGB peripherals, carbon fiber texture, LED strips',
        atmosphere: 'high-tech, dramatic, immersive gaming cave',
      },
      'Индустриальный': {
        mood: 'industrial loft interior design, urban chic',
        lighting: 'dramatic contrast — warm Edison bulb pendants against cool daylight, deep shadows',
        materials: 'exposed red brick, raw blackened steel, aged saddle leather, reclaimed dark wood, concrete',
        atmosphere: 'raw, bold, sophisticated urban aesthetic',
      },
      'Современный': {
        mood: 'contemporary modern interior design',
        lighting: 'bright even lighting with recessed LED, clean and crisp shadows',
        materials: 'glossy lacquer, chrome hardware, glass surfaces, smooth leather, neutral tones',
        atmosphere: 'sleek, polished, sophisticated modernity',
      },
    };

    const styleData = styleMap[style] || {
      mood: `${style} interior design`,
      lighting: 'beautiful natural light filling the space',
      materials: 'high-quality furniture and premium finishes',
      atmosphere: 'elegant and comfortable living space',
    };

    // Цвета стен и пола
    const wallColorEN = colorToEN(wallColor);
    const floorColorEN = colorToEN(floorColor);

    const wallDesc =
      wallColorEN === 'white' ? 'crisp matte white plaster walls' :
      wallColorEN === 'beige' ? 'warm sand beige painted walls' :
      wallColorEN === 'light gray' ? 'sophisticated light greige walls' :
      wallColorEN === 'warm sand' ? 'warm sand-toned textured walls' :
      `${wallColorEN} painted walls`;

    const floorDesc =
      floorColorEN === 'warm oak' ? 'wide-plank warm oak hardwood flooring with natural grain' :
      floorColorEN === 'beige' ? 'light travertine stone tile flooring' :
      floorColorEN === 'natural wood' ? 'brushed natural oak plank flooring' :
      floorColorEN === 'white' ? 'white polished concrete flooring' :
      `${floorColorEN} flooring`;

    const roomTypeEN = roomType?.toLowerCase() || 'living room';

    const basePrompt = `Professional architectural interior photography, ${styleData.mood}.
${roomTypeEN}, ${W}m wide by ${L}m deep, ${H}m ceiling height.
${wallDesc}, ${floorDesc}, clean baseboards and trim details.
Atmosphere: ${styleData.atmosphere}.
Lighting: ${styleData.lighting}.
Material palette: ${styleData.materials}.

Furniture layout (render exactly as described, accurate product appearance):
${furnitureDetails}

${pixtralContext ? `Product appearance reference from real photos: ${pixtralContext.substring(0, 300)}` : ''}
${wishes ? `Special design requirements: ${wishes}` : ''}

Technical: Shot on Phase One IQ4 150MP, 24mm tilt-shift lens, f/8, ISO 100.
Ultra-photorealistic, 8K resolution, ray-traced global illumination, 
physically accurate materials and reflections, accurate shadows and ambient occlusion,
professional color grading, magazine editorial quality, no people, no text overlays.`;

    const negativePrompt = [
      'cartoon', 'illustration', 'painting', 'sketch', 'anime', '3d render look', 'CGI',
      'plastic looking', 'blurry', 'oversaturated', 'distorted perspective', 'fish-eye',
      'people', 'humans', 'text', 'watermark', 'logo', 'signature',
      'low quality', 'amateur photography', 'dark', 'overexposed', 'noise grain',
      'ugly furniture', 'cluttered mess', 'bad proportions',
    ].join(', ');

    const variants = [
      `${basePrompt} Camera angle: wide establishing shot from corner near doorway, showing complete room layout, all furniture visible, slight upward angle.`,
      `${basePrompt} Camera angle: dynamic 3/4 perspective from elevated position (eye level 1.5m), diagonal composition showing depth and spatial relationship between furniture pieces.`,
    ];

    console.log('Prompt length:', basePrompt.length);

    const images: string[] = [];

    for (const promptVariant of variants) {
      const seed = Math.floor(Math.random() * 9999999);
      const encodedPrompt = encodeURIComponent(promptVariant);
      const encodedNeg = encodeURIComponent(negativePrompt);

      // Пробуем flux-pro сначала, потом обычный flux
      const urls = [
        `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1344&height=896&nologo=true&enhance=true&seed=${seed}&model=flux-pro&negative=${encodedNeg}`,
        `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1344&height=896&nologo=true&enhance=true&seed=${seed}&model=flux&negative=${encodedNeg}`,
      ];

      let generated = false;
      for (const url of urls) {
        if (generated) break;
        try {
          console.log('Trying URL model:', url.includes('flux-pro') ? 'flux-pro' : 'flux');
          const imgRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(60000),
          });
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            images.push(`data:${mimeType};base64,${base64}`);
            console.log('✅ Image generated, size:', Math.round(buffer.byteLength / 1024), 'KB');
            generated = true;
          } else {
            console.error('❌ Pollinations failed:', imgRes.status, url.includes('flux-pro') ? 'flux-pro' : 'flux');
          }
        } catch (e) {
          console.error('❌ Fetch error:', e);
        }
      }
    }

    console.log('Total images:', images.length);
    return NextResponse.json({ success: true, images });

  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}