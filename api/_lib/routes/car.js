// 🚗 صفحة لكل موديل (SEO): /bmw/f30 ، /mini/r56 → صفحة HTML كاملة من السيرفر
// عشان جوجل يلاقي "قطع غيار BMW F30" ويجيب زيارات مجانية.
import { getProducts } from '../db.js';
import { carCodes, productBrand } from '../util.js';
import { inEgypt } from './feed.js';

export const CARS = {
  BMW: {
    E36: ['الفئة 3', '1990-2000'], E46: ['الفئة 3', '1998-2006'], E90: ['الفئة 3', '2005-2012'], E92: ['الفئة 3 كوبيه', '2006-2013'],
    F30: ['الفئة 3', '2012-2019'], G20: ['الفئة 3', '2019+'], E87: ['الفئة 1', '2004-2011'], F20: ['الفئة 1', '2011-2019'],
    E39: ['الفئة 5', '1995-2004'], E60: ['الفئة 5', '2003-2010'], F10: ['الفئة 5', '2010-2017'], G30: ['الفئة 5', '2017+'],
    E65: ['الفئة 7', '2001-2008'], F01: ['الفئة 7', '2008-2015'], F02: ['الفئة 7 L', '2008-2015'],
    E84: ['X1', '2009-2015'], F48: ['X1', '2015-2022'], E83: ['X3', '2003-2010'], F25: ['X3', '2010-2017'], G01: ['X3', '2017+'],
    E70: ['X5', '2006-2013'], F15: ['X5', '2013-2018'], G05: ['X5', '2018+'], F16: ['X6', '2014-2019'],
  },
  MINI: {
    R56: ['Hatch', '2006-2013'], R55: ['Clubman', '2007-2014'], R60: ['Countryman', '2010-2016'],
    F56: ['Hatch', '2014+'], F55: ['5-door', '2014+'], F54: ['Clubman', '2015+'], F60: ['Countryman', '2017+'],
  },
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MEDIA = 'https://fixit-02e0.mousstec.com';
const img = (p) => { const u = String(p.image || (p.images && p.images[0]) || ''); return u.startsWith('/media/') ? MEDIA + u : u; };

export function carPartsCount(products, code) {
  return products.filter((p) => Number(p.stock) > 0 && inEgypt(p) && carCodes(p).includes(code)).length;
}

export default async function handler(req, res) {
  try {
    const fromPath = String(req.url || '').split('?')[0].split('/').filter(Boolean).pop();
    const code = String((req.query && req.query.m) || fromPath || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const brand = Object.keys(CARS).find((b) => CARS[b][code]);
    if (!brand) { res.statusCode = 302; res.setHeader('Location', '/shop.html'); return res.end(); }
    const [series, years] = CARS[brand][code];
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const url = `${host}/${brand.toLowerCase()}/${code.toLowerCase()}`;
    const all = await getProducts();
    const list = all.filter((p) => Number(p.stock) > 0 && inEgypt(p) && carCodes(p).includes(code))
      .sort((a, b) => (img(b) ? 1 : 0) - (img(a) ? 1 : 0));
    const cats = {};
    list.forEach((p) => { if (p.category) cats[p.category] = (cats[p.category] || 0) + 1; });
    const title = `قطع غيار ${brand} ${code} (${series} ${years}) في مصر | FixIt`;
    const desc = `${list.length} قطعة غيار متاحة لعربية ${brand} ${code} ${series} موديلات ${years} — جديد ومستعمل وارد بضمان، شحن لكل المحافظات أو استلام من المحل في الحي العاشر بمدينة نصر.`;
    const others = Object.entries(CARS).flatMap(([b, m]) => Object.keys(m).filter((c) => c !== code).map((c) => `<a href="/${b.toLowerCase()}/${c.toLowerCase()}">${b} ${c}</a>`)).join(' ');
    const ld = {
      '@context': 'https://schema.org', '@type': 'ItemList', name: title,
      itemListElement: list.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${host}/p/${encodeURIComponent(p.id)}`, name: p.name })),
    };
    const cards = list.slice(0, 48).map((p) => `
      <a class="card" href="/p/${encodeURIComponent(p.id)}">
        <div class="card-img-wrap">${img(p) ? `<img class="card-img" src="${esc(img(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : '<div class="card-img img-placeholder"><span>🔧</span></div>'}</div>
        <div class="card-body"><h3 class="card-title">${esc(p.name)}</h3>
        <div class="card-footer"><div class="card-price"><span class="price">${Number(p.price) ? Number(p.price).toLocaleString('en') + ' ج.م' : ''}</span></div></div></div>
      </a>`).join('');
    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  ${list[0] && img(list[0]) ? `<meta property="og:image" content="${esc(img(list[0]))}">` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="theme-color" content="#101828">
  <link rel="stylesheet" href="/css/style.css">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <div id="site-header"></div>
  <main class="section"><div class="container">
    <nav class="crumbs" style="font-size:13px;color:var(--muted);margin-bottom:10px;"><a href="/">الرئيسية</a> › <a href="/shop.html?brand=${brand}">${brand}</a> › ${code}</nav>
    <div class="car-hero">
      <h1>قطع غيار ${brand} ${code} <small>${esc(series)} · ${years}</small></h1>
      <p>${esc(desc)}</p>
      <div class="car-hero-btns">
        <button class="btn" type="button" id="save-car">🚗 دي عربيتي — احفظها</button>
        <a class="btn btn-outline" href="/request.html?q=${encodeURIComponent(brand + ' ' + code)}">🔎 مش لاقي قطعتك؟ اطلبها</a>
      </div>
      ${Object.keys(cats).length ? `<div class="car-cats">${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<a href="/shop.html?model=${code}&category=${encodeURIComponent(c)}">${esc(c)} <b>${n}</b></a>`).join('')}</div>` : ''}
    </div>
    <div class="products-grid" id="products-grid">${cards || '<div class="empty-state" style="grid-column:1/-1;">لسه مفيش قطع متاحة للموديل ده — اطلب قطعتك وهنوفّرها 🔎</div>'}</div>
    ${list.length > 48 ? `<p style="text-align:center;margin:18px 0;"><a class="btn" href="/shop.html?model=${code}">شوف كل الـ ${list.length} قطعة ←</a></p>` : ''}
    <section class="car-others"><h2>موديلات تانية</h2><div>${others}</div></section>
  </div></main>
  <div id="site-footer"></div>
  <script src="/js/config.js"></script>
  <script src="/js/i18n.js"></script>
  <script src="/js/app.js"></script>
  <script>
    renderLayout('shop');
    document.getElementById('save-car').addEventListener('click', () => {
      localStorage.setItem('garage', JSON.stringify({ model: '${code}', year: '' }));
      toast(t('garage_saved'));
      renderLayout('shop');
    });
    // نفس كروت المتجر (السعر حسب الفرع، زرار السلة، الشارات)
    api('/products?model=${code}').then((l) => {
      l = wsCatalogFilter(l);
      if (l.length) document.getElementById('products-grid').innerHTML = l.slice(0, 48).map(productCard).join('');
    }).catch(() => {});
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
