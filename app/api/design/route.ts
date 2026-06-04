import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_SIZES: Record<string, { width: number; depth: number; height: number }> = {
  bed:        { width: 1.6, depth: 2.0, height: 0.5  },
  sofa:       { width: 2.2, depth: 0.9, height: 0.85 },
  chair:      { width: 0.6, depth: 0.6, height: 1.0  },
  desk:       { width: 1.2, depth: 0.6, height: 0.75 },
  wardrobe:   { width: 1.0, depth: 0.5, height: 1.9  },
  shelf:      { width: 0.8, depth: 0.3, height: 1.8  },
  nightstand: { width: 0.5, depth: 0.4, height: 0.55 },
  table:      { width: 1.0, depth: 0.6, height: 0.45 },
  lamp:       { width: 0.3, depth: 0.3, height: 1.5  },
  rug:        { width: 1.4, depth: 2.0, height: 0.02 },
  plant:      { width: 0.3, depth: 0.3, height: 0.6  },
  dresser:    { width: 1.0, depth: 0.5, height: 0.8  },
  // декор
  curtains:   { width: 1.6, depth: 0.1, height: 2.4  },
  painting:   { width: 0.8, depth: 0.05, height: 0.6 },
  blanket:    { width: 1.4, depth: 0.6, height: 0.05 },
  cushions:   { width: 0.5, depth: 0.5, height: 0.2  },
  mirror:     { width: 0.6, depth: 0.05, height: 1.0 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoBase64, roomType, style, width, length, height, wishes } = body;

    const W = parseFloat(width) || 4;
    const L = parseFloat(length) || 5;
    const H = parseFloat(height) || 2.7;

    // ── Шаг 1: Mistral генерирует дизайн ─────────────────────────────────────
    const prompt = `You are an expert interior designer AND spatial planner. Create a precise room layout.

Room: ${roomType}, ${W}m wide (X) x ${L}m deep (Z) x ${H}m high. Style: ${style}.
Client wishes: ${wishes || 'none'}

COORDINATE SYSTEM:
- X axis: 0 = LEFT wall, ${W} = RIGHT wall
- Z axis: 0 = BACK wall, ${L} = FRONT wall (camera side)
- Origin (0,0) = back-left corner

PLACEMENT RULES for ${W}x${L}m room:
1. BACK WALL zone (z = 0.3 to ${(L*0.30).toFixed(1)}):
   - bed: center x=${(W/2).toFixed(1)}, z=${(L*0.15).toFixed(1)}, wall="back"
   - sofa: center x=${(W/2).toFixed(1)}, z=${(L*0.18).toFixed(1)}, wall="back"
   - wardrobe: x=0.5 or x=${(W-0.5).toFixed(1)}, z=${(L*0.12).toFixed(1)}, wall="left" or "right"

2. MIDDLE zone (z = ${(L*0.30).toFixed(1)} to ${(L*0.65).toFixed(1)}):
   - desk: x=0.6 or x=${(W-0.6).toFixed(1)}, z=${(L*0.45).toFixed(1)}, wall="left" or "right"
   - table (coffee): x=${(W/2).toFixed(1)}, z=${(L*0.45).toFixed(1)}, wall="none"
   - rug: x=${(W/2).toFixed(1)}, z=${(L*0.50).toFixed(1)}, wall="none"

3. FRONT zone (z = ${(L*0.65).toFixed(1)} to ${(L-0.3).toFixed(1)}):
   - chair: x=0.7 or x=${(W-0.7).toFixed(1)}, z=${(L*0.75).toFixed(1)}, wall="none"
   - lamp: x=0.5 or x=${(W-0.5).toFixed(1)}, z=${(L*0.80).toFixed(1)}, wall="none"
   - plant: corner positions preferred

4. WALL DECOR (z=0.05 or x=0.05 or x=${(W-0.05).toFixed(2)}):
   - curtains: z=0.05, x=${(W/2).toFixed(1)}, wall="back", width=1.8, height=${(H-0.2).toFixed(1)}
   - painting: z=0.05, x=${(W*0.7).toFixed(1)}, wall="back", width=0.7, height=0.5
   - mirror: x=0.05 or x=${(W-0.05).toFixed(2)}, z=${(L*0.5).toFixed(1)}, wall="left" or "right"

5. NIGHTSTAND: always next to bed, offset x by ±(bed_width/2 + 0.35)

SPACING: minimum 0.7m between furniture centers (except nightstand next to bed).
No furniture outside bounds: x=[0.1, ${(W-0.1).toFixed(1)}], z=[0.1, ${(L-0.1).toFixed(1)}].
Include 8-12 items total. Always include curtains and at least 1 painting.

Return ONLY valid JSON:
{
  "concept": "2-3 sentences in Russian describing the design",
  "colors": { "walls": "#hex", "floor": "#hex", "ceiling": "#hex", "accent": "#hex" },
  "ceiling_material": "wood_planks|white_plaster|concrete|coffered",
  "furniture": [
    {
      "type": "bed|sofa|desk|chair|wardrobe|dresser|shelf|table|lamp|plant|rug|nightstand|curtains|painting|blanket|cushions|mirror",
      "name": "name in Russian",
      "x": 2.5,
      "z": 1.0,
      "width": 1.6,
      "depth": 2.0,
      "height": 0.5,
      "color": "#hex",
      "rotation": 0,
      "wall": "back|left|right|front|none"
    }
  ]
}`;

    const messages: any[] = [{
      role: 'user',
      content: photoBase64
        ? [{ type: 'image_url', image_url: `data:image/jpeg;base64,${photoBase64}` }, { type: 'text', text: prompt }]
        : [{ type: 'text', text: prompt }],
    }];

    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
      body: JSON.stringify({
        model: photoBase64 ? 'pixtral-12b-2409' : 'mistral-small-latest',
        messages, max_tokens: 2500, temperature: 0.3,
      }),
    });

    console.log('Mistral status:', mistralRes.status);
    const mistralData = await mistralRes.json();
    const mistralText = mistralData.choices?.[0]?.message?.content || '';
    const jsonMatch = mistralText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON from Mistral: ' + mistralText.substring(0, 200));
    const design = JSON.parse(jsonMatch[0]);

    // ── Шаг 2: Подбираем реальные товары из Google Sheets ────────────────────
    const DECOR_TYPES = new Set(['curtains', 'painting', 'blanket', 'cushions', 'mirror']);

    try {
      const SHEET_ID = '15E9X3HS8K8tVWBA_t76gxEwJ1tZhoeweGU5-i20q50o';
      const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Sheet1`;

      const sheetsRes = await fetch(SHEET_URL, { cache: 'no-store' });
      const text = await sheetsRes.text();
      const json = JSON.parse(
        text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1] || '{}'
      );
      const rows = json.table?.rows || [];
      const cols = json.table?.cols || [];

      const products = rows.map((row: any) => {
        const obj: any = {};
        cols.forEach((col: any, i: number) => {
          const key = col.label.split(' ')[0];
          const cell = row.c?.[i];
          if (!cell) { obj[key] = null; return; }
          let val = cell.v ?? null;
          if (typeof val === 'string' && val.startsWith('Date(')) {
            val = cell.f ? parseFloat(String(cell.f).replace(',', '.')) : null;
          }
          if (['price', 'width', 'depth', 'height'].includes(key)) {
            val = val !== null ? parseFloat(String(val).replace(',', '.')) : null;
            if (isNaN(val as number)) val = null;
          }
          obj[key] = val;
        });
        if (obj.styles) obj.styles = String(obj.styles).split(',').map((s: string) => s.trim());
        if (obj.roomTypes) obj.roomTypes = String(obj.roomTypes).split(',').map((s: string) => s.trim());
        if (obj.subtype) obj.subtype = String(obj.subtype).trim();
        if (obj.url) obj.url = String(obj.url).replace('jysk.md/ro/product/', 'jysk.md/ru/product/');
        return obj;
      }).filter((p: any) => p.id);

      console.log('Products from sheets:', products.length);

      const STYLE_MAP: Record<string, string> = {
        'Минимализм': 'minimalist', 'Скандинавский': 'scandinavian',
        'Cozy / Уютный': 'cozy', 'Gaming Setup': 'gaming', 'Индустриальный': 'industrial',
      };
      const ROOM_MAP: Record<string, string> = {
        'Спальня': 'bedroom', 'Гостиная': 'living',
        'Кабинет / Home Office': 'office', 'Gaming Room': 'gaming', 'Кафе / Офис': 'office',
      };
      const styleKey = STYLE_MAP[style] || 'minimalist';
      const roomKey = ROOM_MAP[roomType] || 'bedroom';

      if (design.furniture && products.length > 0) {
        design.furniture = design.furniture.map((item: any) => {
          // Декор не ищем в каталоге — оставляем как есть с цветом от AI
          if (DECOR_TYPES.has(item.type)) return item;

          const SUBTYPE_MAP: Record<string, string[]> = {
            'wardrobe':   ['wardrobe'],
            'dresser':    ['dresser'],
            'bed':        ['bed'],
            'chair':      ['dining_chair', 'chair'],
            'desk':       ['desk'],
            'sofa':       ['sofa'],
            'shelf':      ['shelf'],
            'nightstand': ['nightstand'],
            'table':      ['table'],
            'lamp':       ['lamp'],
            'rug':        ['rug'],
            'plant':      ['plant'],
          };

          const allowedSubtypes = SUBTYPE_MAP[item.type] || [item.type];
          const candidates = products.filter((p: any) => {
            const sub = p.subtype || p.type;
            return allowedSubtypes.includes(sub) &&
              (p.styles?.includes(styleKey) || p.roomTypes?.includes(roomKey));
          });
          const fallback = products.find((p: any) =>
            allowedSubtypes.includes(p.subtype || p.type)
          );
          const pick = candidates.length > 0
            ? candidates[Math.floor(Math.random() * candidates.length)]
            : fallback;

          const defaults = DEFAULT_SIZES[item.type] || { width: 1.0, depth: 1.0, height: 0.8 };
          const pw = typeof pick.width  === 'number' ? pick.width  : defaults.width;
const pd = typeof pick.depth  === 'number' ? pick.depth  : defaults.depth;
const ph = typeof pick.height === 'number' ? pick.height : defaults.height;

// Пересчитываем x/z чтобы мебель не вышла за стены с новыми размерами
const clampedX = Math.max(pw/2 + 0.05, Math.min(W - pw/2 - 0.05, item.x));
const clampedZ = Math.max(pd/2 + 0.05, Math.min(L - pd/2 - 0.05, item.z));

return {
  ...item,
  x: clampedX, z: clampedZ, rotation: item.rotation || 0,
  name: pick.name, color: pick.color || item.color,
  width: pw, depth: pd, height: ph,
  jysk_name:  pick.name,
  jysk_price: `${pick.price} ${pick.currency}`,
  jysk_url:   pick.url,
  image:      pick.image,
  subtype:    pick.subtype || pick.type,
};

          return {
            ...item,
            x: item.x, z: item.z, rotation: item.rotation || 0,
            name: pick.name, color: pick.color || item.color,
            width:      typeof pick.width  === 'number' ? pick.width  : defaults.width,
            depth:      typeof pick.depth  === 'number' ? pick.depth  : defaults.depth,
            height:     typeof pick.height === 'number' ? pick.height : defaults.height,
            jysk_name:  pick.name,
            jysk_price: `${pick.price} ${pick.currency}`,
            jysk_url:   pick.url,
            image:      pick.image,
            subtype:    pick.subtype || pick.type,
          };
        });
      }
    } catch (e) {
      console.error('Sheets error:', e);
    }
    // ── Post-processing: раздвигаем пересекающуюся мебель ──────────────────────
if (design.furniture) {
  const DECOR = new Set(['curtains','painting','blanket','cushions','mirror','rug']);
  const solid = design.furniture.filter((f: any) => !DECOR.has(f.type));
  
  for (let iter = 0; iter < 10; iter++) {
    let moved = false;
    for (let i = 0; i < solid.length; i++) {
      for (let j = i + 1; j < solid.length; j++) {
        const a = solid[i], b = solid[j];
        const aw = (a.width || 1) / 2, ad = (a.depth || 0.6) / 2;
        const bw = (b.width || 1) / 2, bd = (b.depth || 0.6) / 2;
        const overlapX = (aw + bw + 0.1) - Math.abs(a.x - b.x);
        const overlapZ = (ad + bd + 0.1) - Math.abs(a.z - b.z);
        if (overlapX > 0 && overlapZ > 0) {
          if (overlapX < overlapZ) {
            const push = overlapX / 2;
            if (a.x < b.x) { a.x -= push; b.x += push; }
            else { a.x += push; b.x -= push; }
          } else {
            const push = overlapZ / 2;
            if (a.z < b.z) { a.z -= push; b.z += push; }
            else { a.z += push; b.z -= push; }
          }
          // Клиппинг в границы комнаты
          a.x = Math.max((a.width||1)/2+0.05, Math.min(W-(a.width||1)/2-0.05, a.x));
          a.z = Math.max((a.depth||0.6)/2+0.05, Math.min(L-(a.depth||0.6)/2-0.05, a.z));
          b.x = Math.max((b.width||1)/2+0.05, Math.min(W-(b.width||1)/2-0.05, b.x));
          b.z = Math.max((b.depth||0.6)/2+0.05, Math.min(L-(b.depth||0.6)/2-0.05, b.z));
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
}
    design.width    = String(W);
    design.length   = String(L);
    design.height   = String(H);
    design.roomType = roomType;
    design.style    = style;

    return NextResponse.json({ success: true, design });
  } catch (error) {
    console.error('Design API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}