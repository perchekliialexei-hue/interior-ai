import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomType, style, width, length, height, wishes } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key exists:', !!apiKey);
    console.log('API Key length:', apiKey?.length);

    const prompt = `You are an interior designer. Create a room design plan for: ${roomType}, style: ${style}, size: ${width}x${length}m, height: ${height}m. Wishes: ${wishes || 'none'}. Respond ONLY with valid JSON: {"concept":"string","colors":{"walls":"string","floor":"string","ceiling":"string","accent":"string"},"furniture":[{"name":"string","description":"string","size":"string","placement":"string","ikea_search":"string"}],"lighting":"string","tips":["string"]}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    console.log('Calling URL:', url.substring(0, 80));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    console.log('Response status:', response.status);
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data).substring(0, 300));

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) throw new Error('No JSON in response');

    const design = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, design });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}