import { NextResponse } from 'next/server';

const SHEET_ID = '15E9X3HS8K8tVWBA_t76gxEwJ1tZhoeweGU5-i20q50o';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Sheet1`;

function parseVal(val: any): any {
  if (val === null || val === undefined) return null;
  // Google Sheets возвращает дробные числа как Date объекты — конвертируем обратно
  if (typeof val === 'string' && val.startsWith('Date(')) {
    // "Date(2026,7,1)" — это число 1.2 сохранённое как дата (баг gviz)
    // Берём дробную часть через исходное значение
    return null; // будет перезаписано через formatted value
  }
  return val;
}

export async function GET() {
  try {
    const res = await fetch(SHEET_URL, { cache: 'no-store' });
    const text = await res.text();

    const json = JSON.parse(
      text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\)/)?.[1] || '{}'
    );

    const rows = json.table?.rows || [];
    const cols = json.table?.cols || [];

    const products = rows.map((row: any) => {
      const obj: any = {};
      cols.forEach((col: any, i: number) => {
        const key = col.label.split(' ')[0];
        const cell = row.c?.[i];
        if (!cell) { obj[key] = null; return; }

        let val = cell.v ?? null;

        // Если значение — Date-строка (баг gviz с дробными числами)
        // используем formatted value (f) которое содержит исходный текст
        if (typeof val === 'string' && val.startsWith('Date(')) {
          const f = cell.f ?? null;
          val = f !== null ? parseFloat(String(f).replace(',', '.')) : null;
        }

        // Числовые поля — принудительно конвертируем
        if (['price', 'width', 'depth', 'height'].includes(key)) {
          val = val !== null ? parseFloat(String(val).replace(',', '.')) : null;
          if (isNaN(val as number)) val = null;
        }

        obj[key] = val;
      });

      if (obj.styles) obj.styles = String(obj.styles).split(',').map((s: string) => s.trim());
      if (obj.roomTypes) obj.roomTypes = String(obj.roomTypes).split(',').map((s: string) => s.trim());
      if (obj.url) obj.url = String(obj.url).replace('jysk.md/ro/product/', 'jysk.md/ru/product/');

      return obj;
    }).filter((p: any) => p.id);

    return NextResponse.json({ success: true, products, count: products.length });
  } catch (error) {
    console.error('Sheets error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}