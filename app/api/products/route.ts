import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

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
    const { roomType, style, furniture } = body;

    const productsPath = join(process.cwd(), 'data', 'products.json');
    const products = JSON.parse(readFileSync(productsPath, 'utf-8'));

    const styleKey = STYLE_MAP[style] || 'minimalist';
    const roomKey = ROOM_MAP[roomType] || 'bedroom';

    // Для каждого предмета мебели из AI JSON находим реальный товар
    const matched = furniture.map((item: any) => {
      const candidates = products.filter((p: any) =>
        p.type === item.type &&
        (p.styles.includes(styleKey) || p.roomTypes.includes(roomKey))
      );

      if (candidates.length === 0) {
        // Если не нашли по стилю — берём любой подходящий тип
        const fallback = products.find((p: any) => p.type === item.type);
        return fallback ? { ...item, ...fallback, x: item.x, z: item.z } : item;
      }

      // Выбираем случайный из подходящих
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      return { ...item, ...pick, x: item.x, z: item.z };
    });

    return NextResponse.json({ success: true, furniture: matched });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}