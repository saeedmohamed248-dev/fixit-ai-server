// 📣 كتالوج المنتجات لفيسبوك/انستجرام (Meta Commerce Manager → Data feed)
// GET /api/feed → CSV بقطع فرع مصر المتاحة اللي ليها صورة وسعر (بالجنيه)
import { getProducts } from '../db.js';
import { productBrand, carCodes } from '../util.js';
import { fixMediaUrl } from './sync.js';

const UAE = /إمارات|امارات|uae|dubai|دبي|الشارقة|sharjah/i;
const isUae = (b) => UAE.test([b && b.name, b && b.location].filter(Boolean).join(' | '));
export function inEgypt(p) {
  const stocked = (p.branches || []).filter((b) => Number(b.stock) > 0);
  if (stocked.length) return stocked.some((b) => !isUae(b));
  const parts = [p.originBranch, p.originLocation, ...(p.branches || []).flatMap((b) => [b.name, b.location])];
  return !UAE.test(parts.filter(Boolean).join(' | '));
}
const cell = (v) => '"' + String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim() + '"';

export default async function handler(req, res) {
  try {
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const list = (await getProducts()).filter((p) =>
      Number(p.stock) > 0 && Number(p.price) > 0 && inEgypt(p) && (p.image || (p.images && p.images[0])));
    const head = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand', 'google_product_category'];
    const rows = list.map((p) => {
      const fits = carCodes(p);
      const title = (p.name || p.nameEn || p.sku || '').slice(0, 150);
      const desc = [p.description || p.descriptionEn || title, fits.length ? 'مناسبة لـ ' + fits.join(' / ') : '', p.oem ? 'OEM ' + p.oem : '']
        .filter(Boolean).join(' — ').slice(0, 4900);
      return [
        p.id, title, desc, 'in stock', p.condition === 'used' ? 'used' : 'new',
        Number(p.price).toFixed(2) + ' EGP', `${host}/p/${encodeURIComponent(p.id)}`,
        fixMediaUrl(p.image || p.images[0]), productBrand(p) || 'BMW', 'Vehicles & Parts > Vehicle Parts & Accessories',
      ].map(cell).join(',');
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send('﻿' + head.join(',') + '\n' + rows.join('\n'));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
