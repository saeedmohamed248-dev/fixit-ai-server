// 🔎 صفحة منتج مولّدة من السيرفر (SEO): /p/:id
// بتاخد نفس product.html وتحقن فيها العنوان والوصف وبيانات Product المنظّمة
// ونسخة HTML من بيانات القطعة — عشان جوجل يقرأ الاسم والسعر من غير جافاسكريبت.
import { getProducts } from '../db.js';
import { productBrand, carCodes } from '../util.js';
import { fixMediaUrl } from './sync.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let tplCache = null;

async function template(host) {
  if (tplCache) return tplCache;
  const r = await fetch(host + '/product.html');
  if (!r.ok) throw new Error('template ' + r.status);
  tplCache = await r.text();
  return tplCache;
}

export default async function handler(req, res) {
  try {
    const fromPath = decodeURIComponent(String(req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '');
    const id = String((req.query && req.query.id) || fromPath);
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const p = (await getProducts()).find((x) => String(x.id) === id);
    if (!p) { res.statusCode = 302; res.setHeader('Location', '/shop.html'); return res.end(); }

    const url = `${host}/p/${encodeURIComponent(p.id)}`;
    const brand = productBrand(p) || 'BMW';
    const fits = carCodes(p);
    const images = [p.image, ...(p.images || [])].filter(Boolean).map(fixMediaUrl);
    const name = p.name || p.nameEn || p.sku || 'قطعة غيار';
    const cond = p.condition === 'used' ? 'مستعمل وارد' : 'جديد';
    const title = `${name}${p.oem ? ' ' + p.oem : ''} | قطع غيار ${brand} — FixIt`.slice(0, 120);
    const desc = [`${name} — ${cond}`, fits.length ? `مناسبة لـ ${brand} ${fits.join(' / ')}` : '', p.oem ? `رقم القطعة ${p.oem}` : '',
      Number(p.price) ? `السعر ${Number(p.price).toLocaleString('en')} ج.م` : '', 'ضمان وشحن لكل المحافظات.'].filter(Boolean).join(' · ').slice(0, 300);
    const inStock = Number(p.stock) > 0;
    const ld = [{
      '@context': 'https://schema.org', '@type': 'Product', name, sku: p.sku || String(p.id), mpn: p.oem || undefined,
      description: (p.description || desc).slice(0, 1000), image: images.length ? images : undefined, url,
      brand: { '@type': 'Brand', name: brand }, category: p.category || undefined,
      itemCondition: p.condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
      offers: Number(p.price) ? { '@type': 'Offer', url, priceCurrency: 'EGP', price: Number(p.price).toFixed(2),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: p.condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'FixIt' } } : undefined,
      aggregateRating: p.ratingCount ? { '@type': 'AggregateRating', ratingValue: p.ratingAvg, reviewCount: p.ratingCount } : undefined,
    }, {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: host + '/' },
        { '@type': 'ListItem', position: 2, name: brand, item: `${host}/shop.html?brand=${brand}` },
        ...(fits[0] ? [{ '@type': 'ListItem', position: 3, name: `${brand} ${fits[0]}`, item: `${host}/${brand.toLowerCase()}/${fits[0].toLowerCase()}` }] : []),
        { '@type': 'ListItem', position: fits[0] ? 4 : 3, name, item: url },
      ],
    }];

    const head = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="product">
  <meta property="og:site_name" content="FixIt">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  ${images[0] ? `<meta property="og:image" content="${esc(images[0])}">` : ''}
  <meta name="twitter:card" content="summary_large_image">
  ${inStock ? '' : '<meta name="robots" content="noindex, follow">'}
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;

    // محتوى مقروء بيظهر لحد ما الجافاسكريبت يرسم الصفحة الكاملة (وجوجل بيقراه)
    const body = `<nav class="breadcrumbs"><a href="/">الرئيسية</a><span>←</span>${fits[0] ? `<a href="/${brand.toLowerCase()}/${fits[0].toLowerCase()}">${brand} ${fits[0]}</a><span>←</span>` : ''}${esc(name)}</nav>
      <div class="product-layout">
        ${images[0] ? `<div class="product-img-box"><img class="card-img" src="${esc(images[0])}" alt="${esc(name)}"></div>` : ''}
        <div class="product-info"><h1>${esc(name)}</h1>
          ${Number(p.price) ? `<div class="price">${Number(p.price).toLocaleString('en')} ج.م</div>` : ''}
          <p>${esc(p.description || desc)}</p>
          <table class="meta-table">
            ${p.oem ? `<tr><td>OEM</td><td dir="ltr">${esc(p.oem)}</td></tr>` : ''}
            <tr><td>الحالة</td><td>${cond}</td></tr>
            ${fits.length ? `<tr><td>مناسبة لـ</td><td>${fits.map((c) => `<a class="model-chip" href="/${brand.toLowerCase()}/${c.toLowerCase()}">${brand} ${c}</a>`).join(' ')}</td></tr>` : ''}
          </table></div></div>`;

    let html = await template(host);
    html = html.replace(/<meta name="description"[^>]*>\s*/, "").replace(/<title>[\s\S]*?<\/title>/, head)
      .replace(/(<div class="container" id="product-container">)[\s\S]*?(<\/div>)/, `$1${body}$2`);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (error) {
    // لو حصل أي خطأ نرجّع الصفحة العادية بدل ما نكسر الزيارة
    res.statusCode = 302;
    res.setHeader('Location', '/product.html?id=' + encodeURIComponent(String((req.query && req.query.id) || '')));
    return res.end();
  }
}
