// scrape-jysk.mjs — финальная версия на API
// Запуск: node scrape-jysk.mjs

import { writeFile } from 'fs/promises';

const BASE = 'https://jysk.md/category-products.html';

const CATEGORIES = [
  { id: 2,   type: 'bed',        styles: 'minimalist,scandinavian',              roomTypes: 'bedroom' },
  { id: 138, type: 'sofa',       styles: 'minimalist,scandinavian,cozy',         roomTypes: 'living' },
  { id: 139, type: 'sofa',       styles: 'minimalist,scandinavian,cozy',         roomTypes: 'living' },
  { id: 132, type: 'chair',      styles: 'minimalist,industrial',                roomTypes: 'office' },
  { id: 136, type: 'chair',      styles: 'gaming,industrial',                    roomTypes: 'gaming,office' },
  { id: 155, type: 'chair',      styles: 'minimalist,scandinavian',              roomTypes: 'living' },
  { id: 154, type: 'chair',      styles: 'minimalist,industrial',                roomTypes: 'living,office' },
  { id: 130, type: 'desk',       styles: 'minimalist,industrial,gaming',         roomTypes: 'office,gaming' },
  { id: 22,  type: 'wardrobe',   styles: 'minimalist,scandinavian',              roomTypes: 'bedroom' },
  { id: 159, type: 'shelf',      styles: 'minimalist,scandinavian,industrial',   roomTypes: 'bedroom,living,office' },
  { id: 47,  type: 'nightstand', styles: 'minimalist,scandinavian',              roomTypes: 'bedroom' },
  { id: 143, type: 'table',      styles: 'minimalist,scandinavian,cozy',         roomTypes: 'living' },
  { id: 228, type: 'lamp',       styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living,office' },
  { id: 215, type: 'rug',        styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living' },
  { id: 216, type: 'rug',        styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living' },
  { id: 217, type: 'rug',        styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living' },
  { id: 237, type: 'plant',      styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living,office' },
  { id: 163, type: 'wardrobe',   styles: 'minimalist,scandinavian,cozy',         roomTypes: 'bedroom,living' },
];

function extractColor(name) {
  const n = name.toLowerCase();
  if (n.includes('alb') || n.includes('crem') || n.includes('white'))   return '#F5F0E8';
  if (n.includes('negru') || n.includes('negr') || n.includes('black')) return '#2A2A2A';
  if (n.includes('stejar') || n.includes('natur') || n.includes('oak')) return '#8B6914';
  if (n.includes('nisipiu') || n.includes('bej'))                       return '#D4B896';
  if (n.includes('gri') || n.includes('antracit') || n.includes('grey'))return '#888888';
  if (n.includes('maro') || n.includes('brown'))                        return '#6B4423';
  if (n.includes('albastru') || n.includes('blue'))                     return '#4A6FA5';
  if (n.includes('verde') || n.includes('green'))                       return '#4A7A5A';
  return '#A0917A';
}

function getDefaultSize(type) {
  return ({
    bed:        { width: 1.6, depth: 2.0, height: 0.5  },
    sofa:       { width: 2.2, depth: 0.9, height: 0.85 },
    chair:      { width: 0.6, depth: 0.6, height: 1.0  },
    desk:       { width: 1.2, depth: 0.6, height: 0.75 },
    wardrobe:   { width: 1.0, depth: 0.5, height: 1.9  },
    shelf:      { width: 0.8, depth: 0.3, height: 1.8  },
    nightstand: { width: 0.5, depth: 0.4, height: 0.55 },
    table:      { width: 1.0, depth: 0.6, height: 0.45 },
    lamp:       { width: 0.3, depth: 0.3, height: 1.5  },
    rug:        { width: 1.4, depth: 2.0, height: 0.02 },
    plant:      { width: 0.3, depth: 0.3, height: 0.6  },
  })[type] || { width: 1.0, depth: 1.0, height: 1.0 };
}

function parseProduct(html, category) {
  // Название: "Cadru pat ABILDRO 90x200 negru" из itemprop="name"
  const nameMatch = html.match(/itemprop="name">([^<]+)</);
  // Запасной вариант — из product-card_title + product-card_name
  const titleMatch = html.match(/class="product-card_title"[^>]*>([^<]+)</);
  const subtitleMatch = html.match(/itemprop="name"\s*>([^<]{3,})</);

  const rawName = (nameMatch?.[1] || subtitleMatch?.[1] || '').trim();
  const title = (titleMatch?.[1] || '').trim();
  // Собираем полное название: "Cadru pat ABILDRO 90x200 negru"
  const name = rawName.length > 3 ? rawName : title;
  if (!name || name.length < 3) return null;

  // Цена: <span itemprop="price">2350</span>
  const priceMatch = html.match(/itemprop="price">(\d+)</);
  const price = priceMatch ? parseInt(priceMatch[1]) : 0;
  if (price < 50 || price > 200000) return null;

  // URL: href="/ro/product/..."
  const urlMatch = html.match(/href="(\/(?:ro|ru)\/product\/[^"]+)"/);
  const url = urlMatch ? `https://jysk.md${urlMatch[1]}` : '';

  // Картинка: itemprop="image" src="..."
  const imgMatch = html.match(/itemprop="image"\s+src="([^"]+)"/);
  const image = imgMatch?.[1] || '';

  // Размеры из названия: "90x200" → width=0.9m, depth=2.0m
  const sizeMatch = name.match(/(\d{2,3})[xX×](\d{2,3})/);
  const defaultSize = getDefaultSize(category.type);
  const width  = sizeMatch ? parseInt(sizeMatch[1]) / 100 : defaultSize.width;
  const depth  = sizeMatch ? parseInt(sizeMatch[2]) / 100 : defaultSize.depth;
  const height = defaultSize.height;

  return {
    type: category.type,
    name: name.substring(0, 70),
    price,
    currency: 'MDL',
    url,
    color: extractColor(name),
    width,
    depth,
    height,
    styles: category.styles,
    roomTypes: category.roomTypes,
    shop: 'jysk',
    image,
  };
}

async function fetchCategory(category) {
  const url = `${BASE}?id=${category.id}&min_price=50&max_price=99999&sort=popular&page=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://jysk.md/ru/category/',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) { console.log(`  HTTP ${res.status}`); return []; }

    const text = await res.text();
    if (!text?.trim()) return [];

    const data = JSON.parse(text);
    if (!data.success || !Array.isArray(data.response)) return [];

    const products = [];
    const seen = new Set();

    for (const html of data.response) {
      const p = parseProduct(html, category);
      if (p && !seen.has(p.name)) {
        seen.add(p.name);
        products.push(p);
      }
    }
    return products;
  } catch (e) {
    console.log(`  Error: ${e.message}`);
    return [];
  }
}

function toCsv(products) {
  const headers = ['id','type','name','price','currency','url','color','width','depth','height','styles','roomTypes','shop','image'];
  const rows = products.map(p =>
    headers.map(h => {
      const v = String(p[h] ?? '');
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

async function scrape() {
  const allProducts = [];

  for (const category of CATEGORIES) {
    console.log(`[${category.type}] id=${category.id}`);
    const products = await fetchCategory(category);
    console.log(`  ✅ ${products.length} товаров${products[0] ? ' | ' + products[0].name + ' — ' + products[0].price + ' MDL' : ''}`);
    allProducts.push(...products);
    await new Promise(r => setTimeout(r, 400));
  }

  // Дедупликация по названию
  const seen = new Set();
  const unique = allProducts.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name); return true;
  });

  unique.forEach((p, i) => {
    p.id = `${p.type}-${String(i + 1).padStart(3, '0')}`;
  });

  console.log(`\n✅ Итого: ${unique.length} товаров (убрано дублей: ${allProducts.length - unique.length})`);

  await writeFile('jysk-products.csv', toCsv(unique), 'utf-8');
  console.log('✅ Сохранено в jysk-products.csv\n');

  const byType = {};
  for (const p of unique) byType[p.type] = (byType[p.type] || 0) + 1;
  for (const [t, c] of Object.entries(byType)) console.log(`  ${t.padEnd(12)} ${c} шт.`);
}

scrape().catch(console.error);
