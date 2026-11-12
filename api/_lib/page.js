// 🧱 قالب مشترك لصفحات الـ SEO المولّدة من السيرفر (رقم قطعة، موديل+قسم، مقالات)
const MEDIA = 'https://fixit-02e0.mousstec.com';
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const img = (p) => { const u = String(p.image || (p.images && p.images[0]) || ''); return u.startsWith('/media/') ? MEDIA + u : u; };
export const hostOf = (req) => 'https://' + ((req.headers && req.headers.host) || 'fixitauto.parts');
export const priceTxt = (p) => (Number(p.price) ? Number(p.price).toLocaleString('en') + ' ج.م' : '');

export function cardsHtml(list) {
  return list.map((p) => `
      <a class="card" href="/p/${encodeURIComponent(p.id)}">
        <div class="card-img-wrap">${img(p) ? `<img class="card-img" src="${esc(img(p))}" alt="${esc(p.name)}${p.oem ? ' ' + esc(p.oem) : ''}" loading="lazy" decoding="async">` : '<div class="card-img img-placeholder"><span>🔧</span></div>'}</div>
        <div class="card-body"><h3 class="card-title">${esc(p.name)}</h3>
        <div class="card-footer"><div class="card-price"><span class="price">${priceTxt(p)}</span></div></div></div>
      </a>`).join('');
}

export function itemListLd(host, list) {
  return { '@type': 'ItemList', itemListElement: list.slice(0, 30).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${host}/p/${encodeURIComponent(p.id)}`, name: p.name })) };
}

// crumbs: [[name, path|null], ...]
export function page({ host, path, title, desc, crumbs = [], body, ld = [], ogImage, noindex, script = '', ogType = 'website' }) {
  const url = host + path;
  const bc = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [['الرئيسية', '/'], ...crumbs].map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: host + (p || path) })) };
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:type" content="${ogType}">
  <meta property="og:site_name" content="FixIt">
  <meta property="og:image" content="${esc(ogImage || host + '/assets/fixit-logo-square.png')}">
  ${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <meta name="theme-color" content="#101828">
  <link rel="stylesheet" href="/css/style.css">
  <script type="application/ld+json">${JSON.stringify([bc, ...ld]).replace(/</g, '\\u003c')}</script>
</head>
<body>
  <div id="site-header"></div>
  <main class="section"><div class="container">
    <nav class="crumbs" style="font-size:13px;color:var(--muted);margin-bottom:10px;"><a href="/">الرئيسية</a>${crumbs.map(([n, p]) => ' › ' + (p && p !== path ? `<a href="${esc(p)}">${esc(n)}</a>` : esc(n))).join('')}</nav>
    ${body}
  </div></main>
  <div id="site-footer"></div>
  <script src="/js/config.js"></script>
  <script src="/js/i18n.js"></script>
  <script src="/js/app.js"></script>
  <script>renderLayout('shop');${script}</script>
</body>
</html>`;
}

export function sendHtml(res, html) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(html);
}
