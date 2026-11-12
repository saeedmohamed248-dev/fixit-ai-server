// خريطة الموقع لمحركات البحث — بتتولد تلقائياً وتشمل كل المنتجات
// متاحة على /sitemap.xml (عبر إعادة التوجيه في vercel.json)
import { getProducts } from '../db.js';
import { CARS, carPartsCount } from './car.js';
import { CATS, catList } from './category.js';

export default async function handler(req, res) {
  try {
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const staticPages = ['/', '/shop.html', '/trade.html', '/about.html', '/trade-terms.html', '/request.html', '/track.html', '/policies.html', '/assistant.html', '/container.html', '/savings.html', '/privacy.html'];
    // 🚫 نعرض المتاح في المخزون بس — المنتجات مخزون-صفر مخفية عن العملاء
    //    ومحركات البحث كمان (متجهش لصفحة "غير متوفر").
    const products = (await getProducts()).filter((p) => Number(p.stock) > 0);
    const lm = (p) => { const d = new Date(p.updatedAt || p.createdAt || 0); return d.getTime() > 0 ? `<lastmod>${d.toISOString().slice(0, 10)}</lastmod>` : ''; };

    const urls = [
      ...staticPages.map((p) => `<url><loc>${host}${p}</loc></url>`),
      ...Object.entries(CARS).flatMap(([b, m]) => Object.keys(m).filter((c) => carPartsCount(products, c) > 0).map((c) => `<url><loc>${host}/${b.toLowerCase()}/${c.toLowerCase()}</loc></url>`)),
      ...Object.entries(CATS).filter(([, [ar]]) => catList(products, ar).length).map(([s]) => `<url><loc>${host}/parts/${s}</loc></url>`),
      ...products.map((p) => {
        const id = encodeURIComponent(p.id);
        const alt = `<xhtml:link rel="alternate" hreflang="ar" href="${host}/p/${id}"/><xhtml:link rel="alternate" hreflang="en" href="${host}/en/p/${id}"/>`;
        return `<url><loc>${host}/p/${id}</loc>${lm(p)}${alt}</url>\n<url><loc>${host}/en/p/${id}</loc>${lm(p)}${alt}</url>`;
      }),
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>`
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
