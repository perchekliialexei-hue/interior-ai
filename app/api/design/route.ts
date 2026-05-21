import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { photoBase64, roomType, style, width, length, height, wishes } = body;

    const prompt = `You are an expert interior designer. Analyze this room photo and create a detailed 3D room design.

Room specs: ${roomType}, ${width}m x ${length}m x ${height}m height, style: ${style}
Client wishes: ${wishes || 'none'}

Based on the photo, design the room. Return ONLY valid JSON:
{
  "concept": "design concept in Russian (2-3 sentences)",
  "colors": {
    "walls": "hex color like #F4F0EA",
    "floor": "hex color",
    "ceiling": "hex color",
    "accent": "hex color"
  },
  "furniture": [
    {
      "type": "bed|sofa|desk|chair|wardrobe|shelf|table|lamp|plant|rug",
      "name": "furniture name in Russian",
      "x": 0.5,
      "z": 0.5,
      "width": 1.6,
      "depth": 2.0,
      "height": 0.5,
      "color": "hex color",
      "jysk_name": "exact JYSK product name in Romanian (e.g. 'Pat HVEN', 'Dulap TVILUM')",
      "jysk_price": "X XXX MDL",
      "jysk_url": "https://jysk.md/ru/search?query=PRODUCT_NAME_IN_ROMANIAN"
    }
  ],
  "lighting": "lighting description in Russian",
  "tips": ["tip1", "tip2", "tip3"]
}

Rules:
- x and z are CENTER positions in meters. Room is ${width}m wide (X) and ${length}m long (Z)
- CRITICAL: spread furniture across the ENTIRE room using these exact zones for ${width}x${length}m:
  * back-left zone (x:0.3-${(width*0.4).toFixed(1)}, z:0.3-${(length*0.4).toFixed(1)}): wardrobe, shelf
  * back-right zone (x:${(width*0.6).toFixed(1)}-${(width-0.3).toFixed(1)}, z:0.3-${(length*0.4).toFixed(1)}): bed, sofa
  * center zone (x:${(width*0.3).toFixed(1)}-${(width*0.7).toFixed(1)}, z:${(length*0.35).toFixed(1)}-${(length*0.65).toFixed(1)}): desk, table, rug
  * front zone (z:${(length*0.6).toFixed(1)}-${(length-0.3).toFixed(1)}): chair, lamp, plant
- x must be between 0.3 and ${(width-0.3).toFixed(1)}, z between 0.3 and ${(length-0.3).toFixed(1)}
- furniture must not overlap — minimum 0.5m between centers
- suggest 6-8 furniture items
- All text fields in Russian except hex colors and URLs
- x must be between 0.3 and ${(width-0.3).toFixed(1)}, z between 0.3 and ${(length-0.3).toFixed(1)}
- furniture must not overlap — keep at least 0.5m between items
- suggest 6-8 furniture items
- All text fields in Russian except hex colors and URLs`;

    const messages: any[] = [
      {
        role: 'user',
        content: photoBase64
          ? [
              { type: 'image_url', image_url: `data:image/jpeg;base64,${photoBase64}` },
              { type: 'text', text: prompt }
            ]
          : [{ type: 'text', text: prompt }]
      }
    ];

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: photoBase64 ? 'pixtral-12b-2409' : 'mistral-small-latest',
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    console.log('Mistral status:', response.status);
    const data = await response.json();
    console.log('Mistral response:', JSON.stringify(data).substring(0, 300));

    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response: ' + text.substring(0, 200));

    const design = JSON.parse(jsonMatch[0]);

    // Подбираем реальные товары из Google Sheets
    try {
      const host = req.headers.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const sheetsRes = await fetch(`${protocol}://${host}/api/sheets`);
      const sheetsData = await sheetsRes.json();
      const products = sheetsData.products || [];

      console.log('Products from sheets:', products.length);
      console.log('First product types:', products.slice(0, 5).map((p: any) => p.type));

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

      const styleKey = STYLE_MAP[style] || 'minimalist';
      const roomKey = ROOM_MAP[roomType] || 'bedroom';

      if (design.furniture && products.length > 0) {
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
            x: item.x,
            z: item.z,
            name: pick.name,
            color: pick.color,
            width: pick.width,
            depth: pick.depth,
            height: pick.height,
            jysk_name: pick.name,
            jysk_price: `${pick.price} ${pick.currency}`,
            jysk_url: pick.url,
            image: pick.image,
          };
        });
      }
    } catch (e) {
      console.error('Sheets error:', e);
    }

    return NextResponse.json({ success: true, design });

  } catch (error) {
    console.error('Design API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}