import { NextRequest, NextResponse } from 'next/server';

function typeToEN(type: string): string {
  const map: Record<string, string> = {
    bed: 'bed', sofa: 'sofa', wardrobe: 'wardrobe', desk: 'writing desk',
    chair: 'chair', chair_office: 'office chair', table: 'coffee table',
    shelf: 'bookshelf', lamp: 'floor lamp', plant: 'potted plant',
    rug: 'area rug', nightstand: 'nightstand',
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

function cleanProductName(name: string | undefined, type: string): string {
  if (!name) return typeToEN(type);
  return name
    .replace(/[ăâîșțĂÂÎȘȚ]/g, (c) => ({ ă:'a', â:'a', î:'i', ș:'s', ț:'t', Ă:'A', Â:'A', Î:'I', Ș:'S', Ț:'T' }[c] || c))
    .replace(/\bpat\b/gi, 'bed').replace(/\bTablie\b/gi, 'headboard')
    .replace(/\bComoda\b/gi, 'chest of drawers').replace(/\bNoptiera\b/gi, 'nightstand')
    .replace(/\bBirou\b/gi, 'desk').replace(/\bScaun\b/gi, 'chair')
    .replace(/\bEtajera\b/gi, 'shelf').replace(/\bLampadar\b/gi, 'floor lamp')
    .replace(/\bCovor\b/gi, 'rug').replace(/\bdulap\b/gi, 'wardrobe')
    .replace(/\bsofa\b/gi, 'sofa').replace(/\bcanapea\b/gi, 'sofa');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    const W = parseFloat(width) || 4;
    const L = parseFloat(length) || 5;
    const H = parseFloat(height) || 2.7;

    const furniture = design?.furniture || [];
    const wallColor   = design?.colors?.walls  || '#F4F0EA';
    const floorColor  = design?.colors?.floor  || '#C8B89A';
    const accentColor = design?.colors?.accent || '#8B7355';

    console.log('render-pixtral start, furniture:', furniture.length);

    const furnitureLines = furniture
      .filter((f: any) => !['curtains', 'painting', 'blanket', 'cushions', 'mirror'].includes(f.type))
      .map((f: any) => {
        const jyskName  = f.jysk_name || f.name || '';
        const colorDesc = colorToEN(f.color);
        const hex       = f.color ? ` (exact hex ${f.color})` : '';
        const position  = positionToEN(f, W, L);
        const exactSize = f.width && f.depth && f.height
          ? `exactly ${f.width}m wide x ${f.depth}m deep x ${f.height}m tall` : '';
        const price = f.jysk_price ? `, ${f.jysk_price}` : '';
        return `- ${typeToEN(f.type)} "${jyskName}"${price}: color ${colorDesc}${hex}, ${exactSize}, ${position}`;
      }).join('\n');

    const furnitureWithImages = furniture
      .filter((f: any) => f.image && ['bed', 'sofa', 'wardrobe', 'desk', 'chair'].includes(f.type))
      .slice(0, 5);

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
            imageContents.push({ type: 'image_url', image_url: `data:${mime};base64,${base64}` });
            imageContents.push({ type: 'text', text: `This is a ${typeToEN(item.type)} called "${cleanProductName(item.jysk_name || item.name, item.type)}". Color: ${colorToEN(item.color)}.` });
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
              messages: [{ role: 'user', content: [
                ...imageContents,
                { type: 'text', text: `For each furniture piece shown, describe in ONE sentence its EXACT color (must match: ${furnitureWithImages.map((f: any) => `${f.jysk_name}=${f.color}`).join(', ')}), material finish, and key visual details. Example: "warm beige fabric sofa with light oak legs matching hex #D4B896".` },
              ]}],
              max_tokens: 250, temperature: 0.1,
            }),
          });
          const pixtralData = await pixtralRes.json();
          pixtralContext = pixtralData.choices?.[0]?.message?.content || '';
        } catch (e) { console.error('Pixtral context error:', e); }
      }
    }

    // ── 11 стилей ─────────────────────────────────────────────────────────────
    const styleMap: Record<string, { mood: string; materials: string; atmosphere: string }> = {
      'Минимализм': {
        mood: 'minimalist interior design, clean lines, neutral palette, intentional empty space',
        materials: 'white oak wood, smooth matte plaster walls in white or light grey, natural linen curtains, simple geometric furniture with no ornamentation',
        atmosphere: 'serene, uncluttered, calm — every object has a purpose, nothing is excessive',
      },
      'Japandi': {
        mood: 'Japandi interior design — fusion of Japanese minimalism and Scandinavian warmth',
        materials: 'light ash and walnut wood, wabi-sabi textured plaster in warm white, tatami-inspired textures, natural jute and linen, muted earth tones, simple black iron hardware',
        atmosphere: 'peaceful, grounded, harmonious — warm minimalism with organic natural beauty',
      },
      'Скандинавский': {
        mood: 'Scandinavian hygge interior design, bright and airy Nordic home',
        materials: 'white painted walls, light birch and pine wood furniture, chunky knit wool throws, sheepskin rugs, linen cushions, rattan accents, simple black metal details',
        atmosphere: 'warm, bright, inviting — cozy Nordic home filled with natural light and comfort',
      },
      'Современный': {
        mood: 'contemporary modern interior design, clean sophisticated urban home',
        materials: 'warm greige walls, smooth plaster, light oak or walnut veneer furniture, linen and cotton upholstery in cream and taupe, brushed brass hardware, large windows with sheer curtains',
        atmosphere: 'sleek, polished, liveable — sophisticated but warm, modern without being cold',
      },
      'Cozy / Уютный': {
        mood: 'cozy warm interior design, inviting comfortable home with soft layered textiles and warm amber lighting',
        materials: 'warm white or soft cream painted walls, honey oak and walnut wood furniture, plush linen sofas, layered soft rugs, cotton throw blankets in warm tones, warm Edison bulb floor lamps, ceramic vases',
        atmosphere: 'warm, soft, enveloping — like a hug, pools of warm amber light and soft textures everywhere',
      },
      'Бохо': {
        mood: 'bohemian boho interior design, eclectic free-spirited home with global influences',
        materials: 'terracotta and warm white walls, rattan and wicker furniture, macrame wall hangings, layered patterned rugs, mixed warm wood tones, velvet cushions in mustard and rust, abundant green plants, woven baskets',
        atmosphere: 'free-spirited, artistic, layered — personal and collected, full of character and warmth',
      },
      'Классический': {
        mood: 'classic traditional interior design, elegant timeless home with rich details',
        materials: 'warm white walls with crown molding, herringbone parquet flooring, mahogany and dark walnut furniture, velvet upholstery in deep navy or emerald, brass and gold fixtures, ornate framed mirrors, heavy draped curtains',
        atmosphere: 'elegant, refined, timeless — graceful symmetry and rich materials that never go out of style',
      },
      'Средиземноморский': {
        mood: 'Mediterranean coastal interior design, sun-drenched villa with white walls and warm terracotta',
        materials: 'crisp white stucco walls, terracotta tile flooring, wrought iron details, natural linen and cotton in white and azure blue, hand-painted ceramic tiles, wooden beam ceiling, arched doorways, olive plants',
        atmosphere: 'bright, airy, sun-filled — relaxed coastal warmth with the charm of a Greek island villa',
      },
      'Индустриальный': {
        mood: 'industrial loft interior design, urban warehouse apartment with exposed materials',
        materials: 'exposed red brick walls, raw concrete ceiling, reclaimed dark wood furniture, aged black steel frames, cognac leather upholstery, Edison bulb pendant lights, metal pipe shelving',
        atmosphere: 'raw, bold, urban — honest materials and dramatic masculine energy in an open space',
      },
      'Loft': {
        mood: 'modern loft interior design, open-plan urban living space with high ceilings',
        materials: 'light concrete walls, polished concrete floors, white painted brick accents, mid-century modern walnut furniture, open metal shelving, industrial pendant lights, floor-to-ceiling windows, minimal decor',
        atmosphere: 'open, spacious, modern — the freedom of loft living with architectural character and light',
      },
      'Gaming Setup': {
        mood: 'premium gaming room interior design, high-end esports battlestation setup',
        materials: 'dark charcoal walls, RGB LED strip lighting in blue and purple, tempered glass and black matte desk surfaces, ergonomic gaming chair in black, monitor arms, acoustic foam panels, subtle ambient underlighting',
        atmosphere: 'high-tech, dramatic, immersive — a serious gaming cave that means business',
      },
      'Не знаю — помогите выбрать': {
        mood: 'contemporary Scandinavian interior design, universally appealing warm modern home',
        materials: 'warm white walls, light oak wood furniture, natural linen textiles, soft grey and beige tones, clean-lined simple furniture, warm ambient lighting from floor lamp',
        atmosphere: 'warm, bright, universally appealing — clean modern Scandinavian style that works for everyone',
      },
    };

    const styleData = styleMap[style] || {
      mood: `${style} interior design`,
      materials: 'high-quality furniture and premium finishes',
      atmosphere: 'elegant and comfortable',
    };

    const wallColorDesc   = colorToEN(wallColor);
    const floorColorDesc  = colorToEN(floorColor);
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
      .replace('спальня', 'bedroom').replace('гостиная', 'living room')
      .replace('кухня-гостиная', 'open-plan kitchen living room')
      .replace('студия', 'studio apartment').replace('кабинет', 'home office');

    // ── Сценарии освещения ────────────────────────────────────────────────────
    const lightingScenarios = [
      {
        name: 'morning',
        light: 'soft early morning light streaming from left window at low angle, long gentle shadows across floor, cool-to-warm gradient, mist-like atmosphere, 5500K natural daylight',
        camera: 'wide establishing shot from corner near doorway, showing complete room, slight upward angle',
      },
      {
        name: 'golden_hour',
        light: 'warm golden-hour sunlight at 15-degree angle through window, deep amber pools on floor, long dramatic shadows, warm 3200K glow, dust particles visible in light beams',
        camera: 'dynamic 3/4 perspective from 1.5m height, diagonal composition showing depth between furniture',
      },
      {
        name: 'overcast',
        light: 'soft overcast Nordic daylight, perfectly diffused shadowless light from large window, even cool-white illumination 6000K, no harsh shadows, milky sky visible outside',
        camera: 'wide establishing shot from corner near doorway, showing complete room, slight upward angle',
      },
      {
        name: 'evening',
        light: 'warm evening interior lighting, floor lamp and table lamp creating amber pools 2700K, dark blue twilight visible through window, cozy contrast between warm interior and cool exterior',
        camera: 'dynamic 3/4 perspective from 1.5m height, diagonal composition showing depth between furniture',
      },
    ];

    const shuffled = [...lightingScenarios].sort(() => Math.random() - 0.5);
    const [scenario1, scenario2] = shuffled;

    const basePrompt = `Professional architectural interior photography, ${styleData.mood}.
${roomTypeEN}, exactly ${W}m wide by ${L}m deep, ${H}m ceiling height. Render room with architecturally accurate proportions.
${wallDesc}, ${floorDesc}, accent color ${accentColorDesc}, clean baseboards.
Atmosphere: ${styleData.atmosphere}.
Material palette: ${styleData.materials}.

IMPORTANT: Render ONLY these exact JYSK products with their real colors and proportions:
${furnitureLines}

Each piece must look exactly like the real JYSK product listed above.
CRITICAL COLOR ACCURACY: Render every piece in its EXACT color specified by hex code. Do NOT substitute colors — if hex is #D4B896 render warm sand beige, if #2A2A2A render near-black, if #8B6914 render warm oak brown.
${pixtralContext ? `Product visual details from real photos: ${pixtralContext.substring(0, 400)}` : ''}
${wishes ? `Client requirements: ${wishes}` : ''}

All furniture at their exact real-world dimensions. A 1.6m wide bed must look 1.6m wide relative to the ${W}m room.
Shot on Phase One IQ4 150MP, 24mm tilt-shift lens, f/8, ISO 100.
Ultra-photorealistic, 8K, ray-traced global illumination, physically accurate materials, professional color grading, magazine editorial quality, no people, no text.`;

    const variants = [
      `${basePrompt} Lighting: ${scenario1.light}. Camera: ${scenario1.camera}.`,
      `${basePrompt} Lighting: ${scenario2.light}. Camera: ${scenario2.camera}.`,
    ];

    const images: string[] = [];

    for (const promptVariant of variants) {
      const negativePrompt = [
        'cartoon', 'illustration', 'painting', 'sketch', 'anime', 'CGI look',
        'plastic', 'blurry', 'oversaturated', 'distorted', 'fish-eye',
        'people', 'humans', 'text', 'watermark', 'logo',
        'low quality', 'dark', 'overexposed', 'noise', 'bad proportions',
        'concrete cave', 'brutalist', 'unfinished', 'abandoned', 'dirty walls',
      ].join(', ');
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
          const imgRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(90000),
          });
          if (imgRes.ok) {
            const buffer = await imgRes.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mime = imgRes.headers.get('content-type') || 'image/jpeg';
            images.push(`data:${mime};base64,${base64}`);
            console.log('Image generated:', Math.round(buffer.byteLength / 1024), 'KB');
            generated = true;
          }
        } catch (e) { console.error('Fetch error:', e); }
      }
    }

    let renderLayout: any[] = [];
    if (images.length > 0) {
      try {
        const firstImageBase64 = images[0].split(',')[1];
        const firstImageMime = images[0].split(';')[0].split(':')[1];
        const layoutRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
          body: JSON.stringify({
            model: 'pixtral-12b-2409',
            messages: [{ role: 'user', content: [
              { type: 'image_url', image_url: `data:${firstImageMime};base64,${firstImageBase64}` },
              { type: 'text', text: `Analyze this interior render. Room is ${W}m wide (x: 0=left, ${W}=right) and ${L}m deep (z: 0=back, ${L}=front).
Return ONLY valid JSON array:
[{"type":"sofa","x":2.0,"z":1.2,"rotation":0,"wall":"back","shape":"straight"}]
Rules: type=bed|sofa|wardrobe|dresser|desk|chair|table|shelf|lamp|plant|rug|nightstand, rotation=0(front)|90(right)|180(back)|270(left), max 12 items` },
            ]}],
            max_tokens: 800, temperature: 0.1,
          }),
        });
        const layoutData = await layoutRes.json();
        const layoutText = layoutData.choices?.[0]?.message?.content || '';
        const arrMatch = layoutText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const parsed: any[] = JSON.parse(arrMatch[0]);
          const usedTypes = new Set<string>();
          renderLayout = furniture.map((original: any) => {
            const layoutItem = parsed.find(
              (p: any) => p.type === original.type && !usedTypes.has(p.type + '_' + parsed.indexOf(p))
            );
            if (layoutItem) {
              usedTypes.add(layoutItem.type + '_' + parsed.indexOf(layoutItem));
              return {
                ...original,
                x: Math.max(0.3, Math.min(W - 0.3, layoutItem.x ?? original.x)),
                z: Math.max(0.3, Math.min(L - 0.3, layoutItem.z ?? original.z)),
                rotation: layoutItem.rotation ?? original.rotation ?? 0,
                wall: layoutItem.wall ?? original.wall,
                shape: layoutItem.shape,
              };
            }
            return original;
          });
        }
      } catch (e) { console.error('Render layout error:', e); }
    }

    return NextResponse.json({ success: true, images, renderLayout: renderLayout.length > 0 ? renderLayout : null });
  } catch (error) {
    console.error('Render error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}