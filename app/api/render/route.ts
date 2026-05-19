import { NextRequest, NextResponse } from 'next/server';

function describePosition(x: number, z: number, width: number, length: number): string {
  const xRel = x / width;
  const zRel = z / length;
  const xDesc = xRel < 0.35 ? 'left side' : xRel > 0.65 ? 'right side' : 'center';
  const zDesc = zRel < 0.35 ? 'near back wall' : zRel > 0.65 ? 'near front' : 'middle of room';
  return `${xDesc}, ${zDesc}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes, design } = body;

    let colorDesc = '';
    if (design?.colors) {
      colorDesc = `walls painted ${design.colors.walls || 'white'}, ${design.colors.floor || 'wood'} floor,`;
    }

    // Строим описание расстановки мебели с позициями
    let furnitureDesc = '';
    if (design?.furniture?.length > 0) {
      const items = design.furniture.slice(0, 7).map((f: any) => {
        const pos = describePosition(f.x ?? width/2, f.z ?? length/2, width, length);
        return `${f.name || f.type} (${pos})`;
      }).join(', ');
      furnitureDesc = `furniture layout: ${items}.`;
    }

    // Берём фото первых 3 товаров для референса
const imageRefs = (design?.furniture || [])
  .filter((f: any) => f.image)
  .slice(0, 3)
  .map((f: any) => f.name)
  .join(', ');

const furnitureRef = imageRefs ? `featuring exact furniture pieces: ${imageRefs},` : '';

const prompts = [
  `${base} ${furnitureRef} Photorealistic architectural render, corner perspective view showing full room, 4K, magazine quality, professional lighting, Pinterest interior`,
  `${base} ${furnitureRef} Luxury interior photography, natural daylight, Architectural Digest style, warm atmosphere, highly detailed, wide angle`,
];

    const prompts = [
      `${base} Photorealistic architectural render, corner perspective view showing full room, 4K, magazine quality, professional lighting, Pinterest interior`,
      `${base} Luxury interior photography, natural daylight, Architectural Digest style, warm atmosphere, highly detailed, wide angle`,
    ];

    const seeds = [Math.floor(Math.random() * 99999), Math.floor(Math.random() * 99999)];
    const images: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompts[i])}?width=1024&height=768&nologo=true&enhance=true&seed=${seeds[i]}`;
      try {
        const imgRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (imgRes.ok) {
          const buffer = await imgRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
          images.push(`data:${mimeType};base64,${base64}`);
        }
      } catch (e) {
        console.error('Failed to fetch image:', e);
      }
    }

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error('Render API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}