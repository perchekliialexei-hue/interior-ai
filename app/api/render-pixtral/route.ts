import { NextRequest, NextResponse } from 'next/server';

type NumericInput = string | number | null | undefined;

interface FurnitureItem {
  type: string;
  x?: NumericInput;
  z?: NumericInput;
  width?: NumericInput;
  depth?: NumericInput;
  height?: NumericInput;
  color?: string;
  image?: string;
  name?: string;
  jysk_name?: string;
  jysk_price?: string;
  rotation?: number;
  wall?: string;
  shape?: string;
}

interface RenderDesign {
  furniture?: FurnitureItem[];
  colors?: {
    walls?: string;
    floor?: string;
    accent?: string;
  };
}

interface RenderPixtralRequest {
  roomType?: string;
  style?: string;
  width?: NumericInput;
  length?: NumericInput;
  height?: NumericInput;
  wishes?: string;
  design?: RenderDesign;
}

type PixtralContent =
  | { type: 'image_url'; image_url: string }
  | { type: 'text'; text: string };

interface MistralChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ParsedLayoutItem {
  type: string;
  x?: number;
  z?: number;
  rotation?: number;
  wall?: string;
  shape?: string;
}

function toNumber(value: NumericInput, fallback: number): number {
  const parsed = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : fallback;
}

function typeToEN(type: string): string {
  const map: Record<string, string> = {
    bed: 'bed', sofa: 'sofa', wardrobe: 'wardrobe', desk: 'writing desk',
    chair: 'chair', chair_office: 'office chair', table: 'coffee table',
    shelf: 'bookshelf', lamp: 'floor lamp', plant: 'potted plant',
    rug: 'area rug', nightstand: 'nightstand',
  };
  return map[type] || type;
}

function positionToEN(item: FurnitureItem, width: number, length: number): string {
  const x = toNumber(item.x, width / 2);
  const z = toNumber(item.z, length / 2);
  const relX = x / width;
  const relZ = z / length;
  const h = relZ < 0.35 ? 'back' : relZ > 0.65 ? 'front' : 'center';
  const v = relX < 0.35 ? 'left' : relX > 0.65 ? 'right' : 'center';
  if (h === 'center' && v === 'center') return 'in the center of the room';
  if (v === 'center') return `along the ${h} wall`;
  if (h === 'center') return `along the ${v} wall`;
  return `in the ${h}-${v} corner`;
}

function colorToEN(hex?: string): string {
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
    const body = await req.json() as RenderPixtralRequest;
    const { roomType, style, width, length, height, wishes, design } = body;

    const W = toNumber(width, 4);
    const L = toNumber(length, 5);
    const H = toNumber(height, 2.7);

    const furniture = Array.isArray(design?.furniture) ? design.furniture : [];
    const wallColor   = design?.colors?.walls  || '#F4F0EA';
    const floorColor  = design?.colors?.floor  || '#C8B89A';
    const accentColor = design?.colors?.accent || '#8B7355';

    console.log('render-pixtral start, furniture:', furniture.length);

    const furnitureLines = furniture
      .filter((f) => !['curtains', 'painting', 'blanket', 'cushions', 'mirror'].includes(f.type))
      .map((f) => {
        const jyskName  = f.jysk_name || f.name || '';
        const colorDesc = colorToEN(f.color);
        const hexCode   = f.color ? ` (exact hex ${f.color})` : '';
        const position  = positionToEN(f, W, L);
        const exactSize = f.width && f.depth && f.height
          ? `exactly ${f.width}m wide x ${f.depth}m deep x ${f.height}m tall` : '';
        const price = f.jysk_price ? `, ${f.jysk_price}` : '';
        return `- ${typeToEN(f.type)} "${jyskName}"${price}: color ${colorDesc}${hexCode}, ${exactSize}, ${position}`;
      }).join('\n');

    const furnitureWithImages = furniture
      .filter((f) => f.image && ['bed', 'sofa', 'wardrobe', 'desk', 'chair'].includes(f.type))
      .slice(0, 5);

    let pixtralContext = '';
    if (furnitureWithImages.length > 0) {
      const imageContents: PixtralContent[] = [];
      for (const item of furnitureWithImages) {
        try {
          if (!item.image) continue;
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
                { type: 'text', text: `For each furniture piece shown, describe in ONE sentence its EXACT color (must match: ${furnitureWithImages.map((f) => `${f.jysk_name}=${f.color}`).join(', ')}), material finish, and key visual details. Example: "warm beige fabric sofa with light oak legs matching hex #D4B896".` },
              ]}],
              max_tokens: 250, temperature: 0.1,
            }),
          });
          const pixtralData = await pixtralRes.json() as MistralChatResponse;
          pixtralContext = pixtralData.choices?.[0]?.message?.content || '';
        } catch (e) { console.error('Pixtral context error:', e); }
      }
    }

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

    const styleData = styleMap[style ?? ''] || {
      mood: `${style || 'modern'} interior design`,
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

    const lightingScenarios = [
      {
        light: 'soft early morning light streaming from left window, long gentle shadows, 5500K natural daylight',
        camera: 'wide establishing shot from corner near doorway, showing complete room, slight upward angle',
      },
      {
        light: 'warm golden-hour sunlight through window, deep amber pools on floor, warm 3200K glow',
        camera: 'dynamic 3/4 perspective from 1.5m height, diagonal composition showing depth',
      },
      {
        light: 'soft overcast Nordic daylight, perfectly diffused light from large window, 6000K',
        camera: 'wide establishing shot from corner near doorway, showing complete room',
      },
      {
        light: 'warm evening interior lighting, floor lamp creating amber pools 2700K, twilight through window',
        camera: 'dynamic 3/4 perspective from 1.5m height, diagonal composition',
      },
    ];

    const shuffled = [...lightingScenarios].sort(() => Math.random() - 0.5);
    const [scenario1, scenario2] = shuffled;

    // Cloudflare FLUX лимит — 2048 символов. Сокращаем мебель до 5 главных предметов
    const topFurniture = furniture
      .filter((f) => !['curtains', 'painting', 'blanket', 'cushions', 'mirror', 'rug', 'plant', 'lamp'].includes(f.type))
      .slice(0, 5);

    const shortFurnitureLines = topFurniture
      .map((f) => `${colorToEN(f.color)} ${typeToEN(f.type)}`)
      .join(', ');

    const basePrompt = `${styleData.mood}, ${roomTypeEN}, ${W}x${L}m room. ${wallDesc}, ${floorDesc}. Furniture: ${shortFurnitureLines}. ${styleData.atmosphere}. ${wishes ? wishes.substring(0, 100) : ''} Ultra-photorealistic interior photo, 8K, no people, no text.`;

    const variants = [
      `${basePrompt} ${scenario1.light}. ${scenario1.camera}.`.substring(0, 2000),
      `${basePrompt} ${scenario2.light}. ${scenario2.camera}.`.substring(0, 2000),
    ];

    console.log('Prompt 1 length:', variants[0].length);
    console.log('Prompt 2 length:', variants[1].length);

    // ── Генерация через Cloudflare Workers AI (FLUX.1-schnell) ───────────────
    const images: string[] = [];

for (const promptVariant of variants) {
  try {
    console.log('Trying Pollinations flux-pro, prompt length:', promptVariant.length);

    const encoded = encodeURIComponent(promptVariant);
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encoded}?model=flux&width=1344&height=768&seed=${seed}&nologo=true&enhance=false`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(90000),
      headers: { 'Accept': 'image/jpeg,image/*' },
    });

    console.log('Pollinations status:', res.status, res.headers.get('content-type'));

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unreadable');
      console.error('❌ Pollinations failed:', res.status, errText.substring(0, 300));
      continue;
    }

    const buffer = await res.arrayBuffer();
    console.log('Pollinations buffer:', buffer.byteLength, 'bytes');

    if (buffer.byteLength > 10000) {
      const base64 = Buffer.from(buffer).toString('base64');
      const mime = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
      images.push(`data:${mime};base64,${base64}`);
      console.log('✅ Pollinations image:', Math.round(buffer.byteLength / 1024), 'KB');
    } else {
      console.error('❌ Pollinations image too small:', buffer.byteLength);
    }
  } catch (e) {
    console.error('❌ Pollinations error:', e instanceof Error ? e.message : String(e));
  }
}

    // ── Pixtral анализирует рендер → обновляет 3D layout ────────────────────
    let renderLayout: FurnitureItem[] = [];
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
        const layoutData = await layoutRes.json() as MistralChatResponse;
        const layoutText = layoutData.choices?.[0]?.message?.content || '';
        const arrMatch = layoutText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const parsed = JSON.parse(arrMatch[0]) as ParsedLayoutItem[];
          const usedTypes = new Set<string>();
          renderLayout = furniture.map((original) => {
            const layoutItem = parsed.find(
              (p) => p.type === original.type && !usedTypes.has(p.type + '_' + parsed.indexOf(p))
            );
            if (layoutItem) {
              usedTypes.add(layoutItem.type + '_' + parsed.indexOf(layoutItem));
              const x = typeof layoutItem.x === 'number' ? layoutItem.x : toNumber(original.x, W / 2);
              const z = typeof layoutItem.z === 'number' ? layoutItem.z : toNumber(original.z, L / 2);
              return {
                ...original,
                x: Math.max(0.3, Math.min(W - 0.3, x)),
                z: Math.max(0.3, Math.min(L - 0.3, z)),
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