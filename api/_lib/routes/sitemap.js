// خريطة الموقع لمحركات البحث — بتتولد تلقائياً وتشمل كل المنتجات
// متاحة على /sitemap.xml (عبر إعادة التوجيه في vercel.json)
import { getProducts } from '../db.js';

export default async function handler(req, res) {
  try {
    const host = 'https://' + (req.headers.host || 'fixitauto.parts');
    const staticPages = ['/', '/shop.html', '/trade.html', '/request.html', '/track.html', '/policies.html', '/assistant.html'];
    const products = await getProducts();

    const urls = [
      ...staticPages.map((p) => `<url><loc>${host}${p}</loc></url>`),
      ...products.map((p) => `<url><loc>${host}/product.html?id=${p.id}</loc></url>`),
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 's-maxage=3600');
    return res.status(200).send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
    );
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
