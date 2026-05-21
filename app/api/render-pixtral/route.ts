import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    console.log('render-pixtral start, furniture:', design?.furniture?.length);

    const furnitureList = (design?.furniture || []).map((f: any) => f.name).join(', ');
    const colorDesc = design?.colors
      ? `walls: ${design.colors.walls}, floor: ${design.colors.floor}`
      : '';

    const furnitureWithImages = (design?.furniture || [])
      .filter((f: any) => f.image)
      .slice(0, 4);

    console.log('furniture with images:', furnitureWithImages.length);

    let pixtralDescription = '';

    // Если есть фото товаров — используем Pixtral для описания
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
            imageContents.push({ type: 'text', text: `This is ${item.name} (${item.jysk_price})` });
          }
        } catch (e) {
          console.error('Failed to fetch image:', item.image);
        }
      }

      if (imageContents.length > 0) {
        const prompt = `You are an expert interior designer. 
I'm showing you photos of real furniture pieces from JYSK store.
Describe in detail how to arrange these pieces in a ${roomType} in ${style} style.
Room dimensions: ${width}m x ${length}m x ${height}m
Colors: ${colorDesc}
Keep description under 200 words, focus on placement and atmosphere.`;

        try {
          const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.MISTRAL_API_KEY}` },
            body: JSON.stringify({
              model: 'pixtral-12b-2409',
              messages: [{ role: 'user', content: [...imageContents, { type: 'text', text: prompt }] }],
              max_tokens: 300,
              temperature: 0.7,
            }),
          });
          const data = await response.json();
          pixtralDescription = data.choices?.[0]?.message?.content || '';
          console.log('Pixtral description length:', pixtralDescription.length);
        } catch (e) {
          console.error('Pixtral error:', e);
        }
      }
    }

    // Генерируем рендеры через Pollinations (с или без Pixtral описания)
    const basePrompt = `${roomType} interior, ${style} style, ${width}x${length}m room, ${colorDesc}, furniture: ${furnitureList}${pixtralDescription ? ', ' + pixtralDescription.substring(0, 200) : ''}, photorealistic render, 4K, professional interior photography, magazine quality, natural lighting`;

    const images: string[] = [];
    const anglePrompts = [
      `${basePrompt}, corner perspective view`,
      `${basePrompt}, wide angle front view`,
    ];

    for (const p of anglePrompts) {
      const seed = Math.floor(Math.random() * 99999);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=1024&height=768&nologo=true&enhance=true&seed=${seed}`;
      try {
        const imgRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          images.push(`data:${mimeType};base64,${base64}`);
          console.log('Image generated, size:', buffer.byteLength);
        } else {
          console.error('Pollinations failed:', imgRes.status);
        }
      } catch (e) {
        console.error('Failed to fetch render:', e);
      }
    }

    console.log('Total images generated:', images.length);

    return NextResponse.json({ success: true, images, pixtralDescription });

  } catch (error) {
    console.error('Render pixtral error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}