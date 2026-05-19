import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes } = body;

    const prompt = `You are an interior designer. Create a room design plan.
Room: ${roomType}, ${width}m x ${length}m x ${height}m, style: ${style}
Wishes: ${wishes || 'none'}

Return ONLY valid JSON:
{
  "concept": "2-3 sentences in Russian",
  "colors": { "walls": "#hex", "floor": "#hex", "ceiling": "#hex", "accent": "#hex" },
  "furniture": [
    { "type": "bed|sofa|desk|chair|wardrobe|shelf|table|lamp|plant|rug",
      "name": "name in Russian", "x": 0.5, "z": 0.5,
      "width": 1.6, "depth": 2.0, "height": 0.5, "color": "#hex",
      "jysk_name": "JYSK product", "jysk_price": "X XXX MDL", "jysk_url": "https://jysk.md/..." }
  ],
  "lighting": "in Russian",
  "tips": ["tip1", "tip2", "tip3"]
}
Keep furniture inside ${width}x${length}m. Suggest 6-8 items. All text in Russian.`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON: ' + text.substring(0, 200));

    const design = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, design });

  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}