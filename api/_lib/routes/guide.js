// 📚 الدليل: /guide (كل المقالات) و /guide/:slug (مقال) — HTML من السيرفر
import { getProducts } from '../db.js';
import { carCodes } from '../util.js';
import { inEgypt } from './feed.js';
import { CARS } from './car.js';
import { CATS } from './category.js';
import { ARTICLES } from '../articles.js';
import { esc, img, hostOf, page, sendHtml, cardsHtml } from '../page.js';

// 🗂️ تقسيم صفحة الدليل لمجموعات (أي مقال جديد مش متحط هنا بيظهر في "مقالات تانية")
const GROUPS = [
  ['models', 'أعطال حسب الموديل', '🚗', ['bmw-f30-common-problems', 'bmw-e90-common-problems', 'bmw-g20-common-problems', 'bmw-e46-common-problems', 'bmw-f10-e60-common-problems', 'bmw-7-series-f01-problems', 'bmw-x1-x3-common-problems', 'bmw-x5-e70-common-problems', 'mini-r56-common-problems', 'mini-r60-countryman-problems', 'mini-f56-common-problems']],
  ['engine', 'المحرك', '⚙️', ['bmw-check-engine-light', 'bmw-wont-start', 'bmw-oil-leak', 'bmw-oil-filter-housing-gasket', 'bmw-valve-cover-gasket', 'bmw-n20-timing-chain', 'bmw-vanos-solenoid', 'bmw-spark-plugs-ignition-coils', 'bmw-turbo-problems', 'bmw-high-fuel-consumption', 'bmw-engine-mounts', 'mini-clutch-problems', 'bmw-oxygen-sensors', 'bmw-crankcase-vent-pcv', 'bmw-fuel-pump']],
  ['cooling', 'التبريد والتكييف', '❄️', ['bmw-overheating', 'bmw-electric-water-pump', 'bmw-thermostat-symptoms', 'bmw-coolant-guide', 'bmw-ac-not-cooling', 'bmw-radiator-fan', 'bmw-expansion-tank']],
  ['chassis', 'العفشة والفرامل والدركسيون', '🛞', ['bmw-suspension-noises', 'bmw-front-control-arm-bushings', 'bmw-shock-absorbers', 'bmw-sway-bar-links', 'bmw-wheel-bearing-noise', 'bmw-steering-problems', 'mini-power-steering-pump', 'bmw-brake-pads-guide', 'bmw-brake-fluid', 'bmw-abs-dsc-warning', 'bmw-tire-pressure-warning']],
  ['electrical', 'الكهربا والبودي', '⚡', ['bmw-battery-registration', 'bmw-alternator', 'bmw-key-not-detected', 'bmw-start-stop-not-working', 'bmw-headlights-problems', 'bmw-window-regulator', 'bmw-parking-sensors-pdc']],
  ['maintenance', 'الصيانة والشراء', '🧰', ['how-to-order-right-bmw-part', 'bmw-chassis-codes-explained', 'bmw-maintenance-schedule', 'bmw-engine-oil-guide', 'bmw-automatic-gearbox-oil', 'bmw-summer-care-egypt', 'bmw-original-vs-aftermarket', 'used-vs-new-bmw-parts', 'buying-used-bmw-checklist']],
];
const brandOf = (c) => Object.keys(CARS).find((b) => CARS[b][c]);
const carLink = (c) => `<a href="/${brandOf(c).toLowerCase()}/${c.toLowerCase()}">${brandOf(c)} ${c}</a>`;

export default async function handler(req, res) {
  try {
    const segs = String(req.url || '').split('?')[0].split('/').filter(Boolean);
    const slug = String((req.query && req.query.s) || (segs[0] === 'guide' ? segs[1] : segs[segs.indexOf('guide') + 1]) || '');
    const host = hostOf(req);
    const a = ARTICLES.find((x) => x.slug === slug);
    if (!a) {
      const used = new Set();
      const sections = GROUPS.map(([id, name, icon, slugs]) => {
        const list = slugs.map((sl) => ARTICLES.find((x) => x.slug === sl)).filter(Boolean);
        list.forEach((x) => used.add(x.slug));
        return [id, name, icon, list];
      });
      const rest = ARTICLES.filter((x) => !used.has(x.slug));
      if (rest.length) sections.push(['more', 'مقالات تانية', '📄', rest]);
      const card = (x) => `<a class="guide-card" href="/guide/${x.slug}"><h3>${esc(x.title)}</h3><p>${esc(x.desc)}</p></a>`;
      const body = `<div class="car-hero"><h1>دليل FixIt لأصحاب BMW و MINI</h1><p>${ARTICLES.length} مقال عن أعطال BMW وميني كوبر المشهورة، نصايح الصيانة، وإزاي تختار قطعة الغيار الصح.</p>
        <div class="car-cats">${sections.filter((g) => g[3].length).map(([id, name, icon, list]) => `<a href="#${id}">${icon} ${esc(name)} <b>${list.length}</b></a>`).join('')}</div></div>
        ${sections.filter((g) => g[3].length).map(([id, name, icon, list]) => `<section class="guide-group" id="${id}"><h2>${icon} ${esc(name)}</h2><div class="guide-list">${list.map(card).join('')}</div></section>`).join('')}`;
      return sendHtml(res, page({ host, path: '/guide', title: 'دليل أعطال وصيانة BMW و MINI | FixIt', desc: 'مقالات عن أشهر أعطال BMW وميني كوبر وإزاي تصلحها وتختار قطعة الغيار المناسبة.', crumbs: [['الدليل', null]], body,
        ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'دليل FixIt', hasPart: ARTICLES.map((x) => ({ '@type': 'Article', headline: x.title, url: `${host}/guide/${x.slug}` })) }] }));
    }
    // قطع مقترحة: بالموديل أو الكلمات المفتاحية
    const all = (await getProducts()).filter((p) => Number(p.stock) > 0 && inEgypt(p));
    const kw = a.kw.map((k) => k.toLowerCase());
    const score = (p) => {
      const hay = [p.name, p.nameEn, p.description].join(' ').toLowerCase();
      const k = kw.filter((w) => hay.includes(w)).length;
      const c = a.cars.some((x) => carCodes(p).includes(x)) ? 1 : 0;
      return k ? k * 2 + c : 0;
    };
    const related = kw.length ? all.map((p) => [score(p), p]).filter(([s]) => s > 0).sort((x, y) => y[0] - x[0]).slice(0, 8).map(([, p]) => p) : [];
    const carsAll = Object.entries(CARS).flatMap(([b, m]) => Object.keys(m)).map(carLink).join(' · ');
    const html = a.body.replace('__CARS__', carsAll);
    const links = [
      ...a.cats.flatMap((c) => [`<a href="/parts/${c}">${esc(CATS[c][0])}</a>`, ...a.cars.slice(0, 3).map((m) => `<a href="/parts/${c}/${m.toLowerCase()}">${esc(CATS[c][0])} ${m}</a>`)]),
      ...a.cars.map(carLink),
    ];
    const rel = (x) => x.cars.filter((c) => a.cars.includes(c)).length * 2 + x.cats.filter((c) => a.cats.includes(c)).length;
    const others = ARTICLES.filter((x) => x.slug !== a.slug).map((x, i) => [rel(x), -i, x]).sort((p, q) => q[0] - p[0] || q[1] - p[1]).slice(0, 6).map((r) => r[2]);
    const body = `
    <article class="guide-article">
      <h1>${esc(a.title)}</h1>
      <p class="guide-meta">دليل FixIt · ${a.date}</p>
      ${html}
      ${links.length ? `<div class="car-cats" style="margin-top:18px">${links.join('')}</div>` : ''}
    </article>
    ${related.length ? `<section class="section" style="padding-bottom:0"><div class="section-head"><h2>قطع غيار متاحة ليها علاقة</h2></div><div class="products-grid">${cardsHtml(related)}</div></section>` : ''}
    <div class="car-hero" style="margin-top:20px"><p><b>محتار في القطعة؟</b> ابعتلنا رقم الشاسيه وهنحدد لك القطعة الصح.</p>
      <div class="car-hero-btns"><a class="btn" href="/request.html">🔎 اطلب قطعتك</a> <a class="btn btn-outline" href="/assistant.html">🤖 اسأل المساعد الذكي</a></div></div>
    <section class="car-others"><h2>مقالات تانية</h2><div>${others.map((x) => `<a href="/guide/${x.slug}">${esc(x.title)}</a>`).join(' ')}</div></section>`;
    const ld = [{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.desc, datePublished: a.date, dateModified: a.date, inLanguage: 'ar',
      mainEntityOfPage: `${host}/guide/${a.slug}`, image: related[0] && img(related[0]) ? [img(related[0])] : [host + '/assets/fixit-logo-square.png'],
      author: { '@type': 'Organization', name: 'FixIt', url: host + '/' }, publisher: { '@type': 'Organization', name: 'FixIt', logo: { '@type': 'ImageObject', url: host + '/assets/fixit-logo-square.png' } } }];
    return sendHtml(res, page({ host, path: `/guide/${a.slug}`, title: a.title + ' | FixIt', desc: a.desc, crumbs: [['الدليل', '/guide'], [a.title, null]], body, ld, ogType: 'article', ogImage: related[0] && img(related[0]) }));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
