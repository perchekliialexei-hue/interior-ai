import { NextRequest, NextResponse } from 'next/server';

const STYLE_MAP: Record<string, string> = {
  'Минимализм': 'minimalist',
  'Скандинавский': 'scandinavian',
  'Cozy / Уютный': 'cozy',
  'Gaming Setup': 'gaming',
  'Индустриальный': 'industrial',
};

const ROOM_MAP: Record<string, string> = {
  'Спальня': 'bedroom',
  'Гостиная': 'living',
  'Кабинет / Home Office': 'office',
  'Gaming Room': 'gaming',
  'Кафе / Офис': 'office',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, roomType, style, width, length, height } = body;

    const prompt = `You are an expert 3D interior designer. Analyze this room render image.

Room: ${roomType}, exactly ${width}m wide (X axis) x ${length}m deep (Z axis) x ${height}m high.

Identify furniture and return positions in REAL METERS. Follow these placement rules:
- Beds: place against back wall (z: 1.0-1.5), full size 1.6x2.0m
- Sofas: place against far wall (z: ${(parseFloat(length)-0.5).toFixed(1)}), size 2.0x0.9m
- Wardrobes: place against left wall (x: 0.4), tall h:2.2m
- Desks: place against right wall (x: ${(parseFloat(width)-0.6).toFixed(1)}), size 1.2x0.6m
- Tables: center of room, size 0.8x0.8m
- Lamps: next to bed or sofa
- Rugs: center of room, large 2.0x1.5m
- Plants: corners only

Return ONLY this JSON:
{
  "concept": "2-3 sentences in Russian",
  "colors": {
    "walls": "#hex from image",
    "floor": "#hex from image",
    "ceiling": "#hex",
    "accent": "#hex"
  },
  "furniture": [
    {
      "type": "bed|sofa|desk|chair|wardrobe|shelf|table|lamp|plant|rug",
      "name": "name in Russian",
      "x": 2.0,
      "z": 1.0,
      "width": 1.6,
      "depth": 2.0,
      "height": 0.5,
      "color": "#hex from image",
      "jysk_name": "product name",
      "jysk_price": "X XXX MDL"
    }
  ]
}

STRICT rules:
- x between 0.4 and ${(parseFloat(width)-0.4).toFixed(1)}
- z between 0.4 and ${(parseFloat(length)-0.4).toFixed(1)}
- NO overlapping furniture
- 5-7 items only
- realistic sizes: bed 1.6x2.0, sofa 2.0x0.9, wardrobe 1.2x0.6, desk 1.2x0.6`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: `data:image/jpeg;base64,${imageBase64}` },
              { type: 'text', text: prompt }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.2,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON: ' + text.substring(0, 200));

    const design = JSON.parse(jsonMatch[0]);

    // Подбираем реальные товары из Google Sheets
    try {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const sheetsRes = await fetch(`${protocol}://${host}/api/sheets`);
      const sheetsData = await sheetsRes.json();
      const products = sheetsData.products || [];
      console.log('Sheets products count:', products.length); // ← добавь
      console.log('First product:', JSON.stringify(products[0])); // ← добавь

      const styleKey = STYLE_MAP[style] || 'minimalist';
      const roomKey = ROOM_MAP[roomType] || 'bedroom';

      design.furniture = design.furniture.map((item: any) => {
        const candidates = products.filter((p: any) =>
          p.type === item.type &&
          (p.styles?.includes(styleKey) || p.roomTypes?.includes(roomKey))
        );
        const fallback = products.find((p: any) => p.type === item.type);
        const pick = candidates.length > 0
          ? candidates[Math.floor(Math.random() * candidates.length)]
          : fallback;

        if (!pick) return item;
        return {
          ...item,
          name: pick.name,
          color: pick.color,
          width: pick.width,
          depth: pick.depth,
          height: pick.height,
          jysk_name: pick.name,
          jysk_price: `${pick.price} ${pick.currency}`,
          jysk_url: pick.url,
          shop_url: pick.url,
        };
      });
    } catch (e) {
      console.error('Sheets matching error:', e);
    }

    return NextResponse.json({ success: true, design });

  } catch (error) {
    console.error('Analyze render error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}