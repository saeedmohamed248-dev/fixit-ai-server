// 🧩 صفحة لكل قسم (SEO): /parts/brakes ، /parts/engine … صفحة HTML كاملة من السيرفر
import { getProducts } from '../db.js';
import { carCodes, productCategory } from '../util.js';
import { inEgypt } from './feed.js';
import { CARS } from './car.js';

export const CATS = {
  brakes: ['فرامل', 'Brakes', 'تيل فرامل، طنابير، ديسكات، حساسات وكل قطع الفرامل'],
  filters: ['فلاتر وصيانة', 'Filters & Service', 'فلاتر زيت وهوا وبنزين وتكييف وقطع الصيانة الدورية'],
  suspension: ['عفشة وتعليق', 'Suspension', 'مساعدين، مقصات، جلب، بلي عجل، دركسيون وكل قطع العفشة'],
  electrical: ['كهرباء وإشعال', 'Electrical & Ignition', 'بوجيهات، موبينات، حساسات، دينامو، مارش وكمبيوترات'],
  cooling: ['تبريد', 'Cooling', 'طرمبة مياه، رادياتير، ترموستات، مراوح وخراطيم التبريد'],
  fuel: ['وقود', 'Fuel', 'طرمبة بنزين، رشاشات، حساسات وقطع منظومة الوقود'],
  engine: ['محرك', 'Engine', 'جوانات، كاتينة، قواعد، طرمبة زيت وكل قطع الموتور'],
  body: ['هيكل وإكسسوارات', 'Body & Accessories', 'فوانيس، مرايات، أكصدامات، كبوت وإكسسوارات'],
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MEDIA = 'https://fixit-02e0.mousstec.com';
const img = (p) => { const u = String(p.image || (p.images && p.images[0]) || ''); return u.startsWith('/media/') ? MEDIA + u : u; };
export const catList = (products, ar) => products.filter((p) => Number(p.stock) > 0 && inEgypt(p) && productCategory(p) === ar);

export default async function handler(req, res) {
  try {
    const slug = String((req.query && req.query.c) || String(req.url || '').split('?')[0].split('/').filter(Boolean).pop() || '').toLowerCase();
    if (!CATS[slug]) { res.statusCode = 302; res.setHeader('Location', '/shop.html'); return res.end(); }
    const [ar, en, blurb] = CATS[slug];
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const url = `${host}/parts/${slug}`;
    const list = catList(await getProducts(), ar).sort((a, b) => (img(b) ? 1 : 0) - (img(a) ? 1 : 0));
    const models = {};
    list.forEach((p) => carCodes(p).forEach((c) => { models[c] = (models[c] || 0) + 1; }));
    const brandOf = (c) => Object.keys(CARS).find((b) => CARS[b][c]);
    const title = `قطع غيار ${ar} BMW و MINI في مصر | FixIt`;
    const desc = `${list.length} قطعة ${ar} لعربيات BMW وميني كوبر — ${blurb}. جديد ومستعمل وارد بضمان وشحن لكل المحافظات.`.slice(0, 300);
    const ld = [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: title, url,
      mainEntity: { '@type': 'ItemList', itemListElement: list.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${host}/p/${encodeURIComponent(p.id)}`, name: p.name })) } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: host + '/' }, { '@type': 'ListItem', position: 2, name: ar, item: url }] }];
    const cards = list.slice(0, 48).map((p) => `
      <a class="card" href="/p/${encodeURIComponent(p.id)}">
        <div class="card-img-wrap">${img(p) ? `<img class="card-img" src="${esc(img(p))}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : '<div class="card-img img-placeholder"><span>🔧</span></div>'}</div>
        <div class="card-body"><h3 class="card-title">${esc(p.name)}</h3>
        <div class="card-footer"><div class="card-price"><span class="price">${Number(p.price) ? Number(p.price).toLocaleString('en') + ' ج.م' : ''}</span></div></div></div>
      </a>`).join('');
    const others = Object.entries(CATS).filter(([s]) => s !== slug).map(([s, [a]]) => `<a href="/parts/${s}">${esc(a)}</a>`).join(' ');
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
  <meta property="og:type" content="website">
  ${list[0] && img(list[0]) ? `<meta property="og:image" content="${esc(img(list[0]))}">` : ''}
  ${list.length ? '' : '<meta name="robots" content="noindex, follow">'}
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
    <nav class="crumbs" style="font-size:13px;color:var(--muted);margin-bottom:10px;"><a href="/">الرئيسية</a> › ${esc(ar)}</nav>
    <div class="car-hero">
      <h1>قطع غيار ${esc(ar)} BMW و MINI <small>${en}</small></h1>
      <p>${esc(desc)}</p>
      <div class="car-hero-btns"><a class="btn btn-outline" href="/request.html?q=${encodeURIComponent(ar)}">🔎 مش لاقي قطعتك؟ اطلبها</a></div>
      ${Object.keys(models).length ? `<div class="car-cats">${Object.entries(models).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([c, n]) => brandOf(c) ? `<a href="/${brandOf(c).toLowerCase()}/${c.toLowerCase()}">${brandOf(c)} ${c} <b>${n}</b></a>` : '').join('')}</div>` : ''}
    </div>
    <div class="products-grid" id="products-grid">${cards || '<div class="empty-state" style="grid-column:1/-1;">لسه مفيش قطع متاحة في القسم ده — اطلب قطعتك وهنوفّرها 🔎</div>'}</div>
    ${list.length > 48 ? `<p style="text-align:center;margin:18px 0;"><a class="btn" href="/shop.html?category=${encodeURIComponent(ar)}">شوف كل الـ ${list.length} قطعة ←</a></p>` : ''}
    <section class="car-others"><h2>أقسام تانية</h2><div>${others}</div></section>
  </div></main>
  <div id="site-footer"></div>
  <script src="/js/config.js"></script>
  <script src="/js/i18n.js"></script>
  <script src="/js/app.js"></script>
  <script>
    renderLayout('shop');
    api('/products?category=${encodeURIComponent(ar)}').then((l) => {
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
