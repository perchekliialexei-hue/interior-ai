import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    // Берём фото первых 4 товаров из Sheets
    const furnitureWithImages = (design?.furniture || [])
      .filter((f: any) => f.image)
      .slice(0, 4);

    if (furnitureWithImages.length === 0) {
      return NextResponse.json({ error: 'No furniture images' }, { status: 400 });
    }

    // Загружаем фото товаров как base64
    const imageContents: any[] = [];
    for (const item of furnitureWithImages) {
      try {
        const res = await fetch(item.image);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = res.headers.get('content-type') || 'image/jpeg';
          imageContents.push({
            type: 'image_url',
            image_url: `data:${mimeType};base64,${base64}`,
          });
          imageContents.push({
            type: 'text',
            text: `This is ${item.name} (${item.jysk_price})`,
          });
        }
      } catch (e) {
        console.error('Failed to fetch image:', item.image, e);
      }
    }

    const colorDesc = design?.colors
      ? `walls: ${design.colors.walls}, floor: ${design.colors.floor}`
      : '';

    const furnitureList = (design?.furniture || [])
      .map((f: any) => f.name)
      .join(', ');

    const prompt = `You are an expert interior designer. 
I'm showing you photos of real furniture pieces from JYSK store.
Create a photorealistic interior render of a ${roomType} in ${style} style.

Room dimensions: ${width}m x ${length}m x ${height}m
Colors: ${colorDesc}
Furniture to include: ${furnitureList}
${wishes ? `Client wishes: ${wishes}` : ''}

Use the exact furniture pieces shown in the photos above. 
Place them naturally in the room following ${style} design principles.
The result should look like a professional interior photography shoot.
Render from a corner perspective showing the full room.`;

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
              ...imageContents,
              { type: 'text', text: prompt },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log('Pixtral render response:', JSON.stringify(data).substring(0, 300));

    const text = data.choices?.[0]?.message?.content || '';

    // Pixtral не генерирует изображения — используем его описание
    // как улучшенный промпт для Pollinations
    const enhancedPrompt = `${roomType} interior, ${style} style, ${width}x${length}m, ${colorDesc}, ${furnitureList}, ${text.substring(0, 300)}, photorealistic render, 4K, magazine quality, corner view`;

    const seed = Math.floor(Math.random() * 99999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=768&nologo=true&enhance=true&seed=${seed}`;

    const imgRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!imgRes.ok) throw new Error('Pollinations failed');

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';

    return NextResponse.json({
      success: true,
      images: [`data:${mimeType};base64,${base64}`],
      pixtralDescription: text,
    });

  } catch (error) {
    console.error('Render pixtral error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}