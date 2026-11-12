// 🔢 صفحة لكل رقم قطعة (SEO): /oem/11518635089 — الناس بتدوّر برقم القطعة بالظبط
import { getProducts } from '../db.js';
import { carCodes, productBrand } from '../util.js';
import { inEgypt } from './feed.js';
import { esc, img, hostOf, page, sendHtml, cardsHtml, itemListLd, priceTxt } from '../page.js';

export const normOem = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const oemsOf = (p) => [...new Set([p.oem, ...(p.partNumbers || [])].map(normOem).filter((x) => x.length >= 5))];
export const oemPretty = (n) => (/^\d{11}$/.test(n) ? `${n.slice(0, 2)} ${n.slice(2, 4)} ${n.slice(4, 5)} ${n.slice(5, 8)} ${n.slice(8)}` : n);

export function oemIndex(products) {
  const idx = {};
  products.filter((p) => Number(p.stock) > 0 && inEgypt(p)).forEach((p) => oemsOf(p).forEach((n) => { (idx[n] = idx[n] || []).push(p); }));
  return idx;
}

export default async function handler(req, res) {
  try {
    const raw = (req.query && req.query.n) || String(req.url || '').split('?')[0].split('/').filter(Boolean).pop();
    const n = normOem(decodeURIComponent(raw || ''));
    const host = hostOf(req);
    const list = oemIndex(await getProducts())[n] || [];
    const pretty = oemPretty(n);
    const p0 = list[0];
    const brand = p0 ? productBrand(p0) || 'BMW' : 'BMW';
    const fits = [...new Set(list.flatMap(carCodes))];
    const title = p0 ? `${pretty} — ${p0.name} | رقم قطعة ${brand} أصلي — FixIt` : `رقم قطعة ${pretty} | FixIt`;
    const desc = p0
      ? `رقم القطعة ${pretty} (${n}): ${p0.name}${fits.length ? ' — مناسبة لـ ' + brand + ' ' + fits.join(' / ') : ''}. ${list.length} عرض متاح${priceTxt(p0) ? ' من ' + priceTxt(p0) : ''}، جديد ومستعمل وارد بضمان وشحن لكل مصر.`
      : `دوّرت على رقم القطعة ${pretty}؟ اطلبها من FixIt وهنوفرهالك خلال أيام.`;
    const ld = list.length ? [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, ...{ mainEntity: itemListLd(host, list) } }] : [];
    const body = `
    <div class="car-hero">
      <h1>رقم القطعة <span dir="ltr">${esc(pretty)}</span>${p0 ? ` <small>${esc(p0.name)}</small>` : ''}</h1>
      <p>${esc(desc)}</p>
      <p style="font-size:13px;color:var(--muted)">صيغ تانية للرقم: <span dir="ltr">${esc(n)}</span> · <span dir="ltr">${esc(pretty.replace(/ /g, '-'))}</span></p>
      ${fits.length ? `<div class="car-cats">${fits.map((c) => `<a href="/${(brand === 'MINI' ? 'mini' : 'bmw')}/${c.toLowerCase()}">${brand} ${c}</a>`).join('')}</div>` : ''}
      <div class="car-hero-btns"><a class="btn btn-outline" href="/request.html?q=${encodeURIComponent(n)}">🔎 اطلب القطعة دي</a></div>
    </div>
    <div class="products-grid">${cardsHtml(list) || '<div class="empty-state" style="grid-column:1/-1;">القطعة دي مش متاحة دلوقتي — اطلبها وهنوفّرها 🔎</div>'}</div>`;
    return sendHtml(res, page({ host, path: `/oem/${n}`, title, desc, crumbs: [['أرقام القطع', null]], body, ld, ogImage: p0 && img(p0), noindex: !list.length, ogType: 'website' }));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
