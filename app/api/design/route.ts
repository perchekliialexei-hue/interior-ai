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
    const prompt = `You are an expert interior designer. Create a detailed, realistic room layout with ALL decorative elements.

Room: ${roomType}, ${W}m wide (X-axis) x ${L}m long (Z-axis) x ${H}m height, style: ${style}
Client wishes: ${wishes || 'none'}

Return ONLY valid JSON (no markdown, no backticks):
{
  "concept": "2-3 sentences in Russian",
  "colors": { "walls": "#hex", "floor": "#hex", "ceiling": "#hex", "accent": "#hex" },
  "ceiling_material": "wood_planks|white_plaster|concrete|coffered",
  "furniture": [
    {
      "type": "bed|sofa|desk|chair|wardrobe|dresser|shelf|table|lamp|plant|rug|nightstand|curtains|painting|blanket|cushions|mirror",
      "name": "name in Russian",
      "x": 2.0,
      "z": 1.0,
      "width": 1.6,
      "depth": 2.0,
      "height": 0.5,
      "color": "#hex",
      "rotation": 0,
      "wall": "back|left|right|none"
    }
  ]
}

DECOR RULES — always include these if they match the style:
- curtains: always add 1-2 curtains near windows (z=0, rotation=0). width = window width + 0.4m (~1.6-2.0m), height = room height - 0.1. color = light linen/white for scandinavian/minimalist, rich fabric for cozy/classic
- painting: add 1-2 wall paintings. Place on back wall (z=0.06, rotation=0) or side walls. width 0.6-1.2m
- blanket: add on bed (same x/z as bed, slightly offset). width = bed width - 0.1
- cushions: add decorative cushions on sofa or bed
- mirror: add for bedroom/hallway on side wall

PLACEMENT rules for ${W}x${L}m room:
- x = distance from LEFT wall (0 to ${W}), z = distance from BACK wall (0 to ${L})
- All x between 0.1 and ${(W - 0.1).toFixed(1)}, all z between 0.1 and ${(L - 0.1).toFixed(1)}
- curtains must have z=0.08 and rotation=0 (hang on back wall near window)
- paintings must have z=0.06 or x=0.06 or x=${(W - 0.06).toFixed(2)} (on wall surface)
- Back zone (z 0.3-${(L * 0.35).toFixed(1)}): bed/sofa/wardrobe/shelf
- Middle (z ${(L * 0.35).toFixed(1)}-${(L * 0.65).toFixed(1)}): desk/table/rug
- Front (z ${(L * 0.65).toFixed(1)}-${(L - 0.3).toFixed(1)}): chair/lamp/plant
- Minimum 0.6m between furniture centers, 8-12 items total including decor
- rotation: 0=facing front, 90=facing left, 180=facing back, 270=facing right
- wall field: which wall this item is against (back/left/right/none)`;

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
          if (!pick) return {
            ...item,
            width:  typeof item.width  === 'number' ? item.width  : defaults.width,
            depth:  typeof item.depth  === 'number' ? item.depth  : defaults.depth,
            height: typeof item.height === 'number' ? item.height : defaults.height,
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

    // ── Шаг 3: Pixtral уточняет расстановку мебели (не декора) ──────────────
    try {
      const furnitureWithImages = (design.furniture || [])
        .filter((f: any) => f.image && !['rug', 'plant', 'lamp', ...DECOR_TYPES].includes(f.type))
        .slice(0, 4);

      if (furnitureWithImages.length >= 2) {
        const imageContents: any[] = [];
        for (const item of furnitureWithImages) {
          try {
            const res = await fetch(item.image);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              const base64 = Buffer.from(buffer).toString('base64');
              const mime = res.headers.get('content-type') || 'image/jpeg';
              imageContents.push({ type: 'image_url', image_url: `data:${mime};base64,${base64}` });
              imageContents.push({ type: 'text', text: `${item.type.toUpperCase()}: "${item.jysk_name}", size ${item.width}x${item.depth}m, at x=${item.x}, z=${item.z}` });
            }
          } catch {}
        }

        if (imageContents.length > 0) {
          const layoutPrompt = `Optimize furniture placement in ${W}x${L}m room (${style}).
Return ONLY JSON array: [{"type":"bed","x":2.8,"z":1.0,"rotation":180}]`;

          const pixtralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
            body: JSON.stringify({
              model: 'pixtral-12b-2409',
              messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: layoutPrompt }] }],
              max_tokens: 400, temperature: 0.2,
            }),
          });
          const pixtralData = await pixtralRes.json();
          const pixtralText = pixtralData.choices?.[0]?.message?.content || '';
          const arrMatch = pixtralText.match(/\[[\s\S]*\]/);
          if (arrMatch) {
            try {
              const updates: any[] = JSON.parse(arrMatch[0]);
              const updated = new Set<string>();
              updates.forEach((upd: any) => {
                if (updated.has(upd.type)) return;
                const item = design.furniture.find((f: any) => f.type === upd.type);
                if (item && typeof upd.x === 'number' && typeof upd.z === 'number') {
                  const hw = (item.width || 1) / 2;
                  const hd = (item.depth || 0.6) / 2;
                  item.x = Math.max(hw + 0.15, Math.min(W - hw - 0.15, upd.x));
                  item.z = Math.max(hd + 0.15, Math.min(L - hd - 0.15, upd.z));
                  if (typeof upd.rotation === 'number') item.rotation = upd.rotation;
                  updated.add(upd.type);
                }
              });
            } catch (e) { console.error('Pixtral parse error:', e); }
          }
        }
      }
    } catch (e) { console.error('Pixtral layout error:', e); }

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