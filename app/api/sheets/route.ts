import { NextResponse } from 'next/server';

const SHEET_ID = '1S0DxR_8nUGRYEl1brqfdsBVSJaGfbpTJUPfUk5y1Afg';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Products`;

export async function GET() {
  try {
    const res = await fetch(SHEET_URL, { next: { revalidate: 3600 } });
    const text = await res.text();
    
    const json = JSON.parse(text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1] || '{}');
    
    const rows = json.table?.rows || [];
    const cols = json.table?.cols || [];
    
    const products = rows.map((row: any) => {
      const obj: any = {};
      cols.forEach((col: any, i: number) => {
        // Берём только первое слово из лейбла (до пробела)
        const key = col.label.split(' ')[0];
        const val = row.c?.[i]?.v ?? null;
        obj[key] = val;
      });
      if (obj.styles) obj.styles = String(obj.styles).split(',').map((s: string) => s.trim());
      if (obj.roomTypes) obj.roomTypes = String(obj.roomTypes).split(',').map((s: string) => s.trim());
      return obj;
    }).filter((p: any) => p.id);

    return NextResponse.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Sheets error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}