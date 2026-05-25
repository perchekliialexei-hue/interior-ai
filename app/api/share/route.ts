import { NextRequest, NextResponse } from 'next/server';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!;

async function redisSet(key: string, value: string, exSeconds: number) {
  const res = await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ value, ex: exSeconds }),
  });
  return res.json();
}

async function redisGet(key: string) {
  const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
  });
  const data = await res.json();
  return data.result;
}

// POST /api/share — сохраняет дизайн, возвращает ID
export async function POST(req: NextRequest) {
  try {
    const { design, renders } = await req.json();
    if (!design) return NextResponse.json({ error: 'No design' }, { status: 400 });

    const id = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
    const payload = JSON.stringify({ design, renders: renders || [] });

    // Храним 30 дней
    await redisSet(`share:${id}`, payload, 60 * 60 * 24 * 30);

    return NextResponse.json({ success: true, id, url: `/result/${id}` });
  } catch (error) {
    console.error('Share save error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/share?id=xxx — загружает дизайн по ID
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'No id' }, { status: 400 });

    const raw = await redisGet(`share:${id}`);
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Share load error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}