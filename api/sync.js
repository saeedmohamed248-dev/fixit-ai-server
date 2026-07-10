// نقطة مزامنة المخزون مع الأنظمة الخارجية (شوبيفاي / موس تك / أي نظام تاني)
// الفكرة: لو قطعة اتباعت في النظام التاني، النظام ده يبعت إشعار هنا فيتخصم المخزون تلقائياً.
//
// GET  /api/sync?secret=XXX  → قائمة المخزون الحالي (SKU + الكمية + السعر) للسحب من النظام الخارجي
// POST /api/sync?secret=XXX  → خصم مخزون. يقبل شكلين:
//    1) بسيط:            { "sku": "BP-123", "quantity": 1 }
//    2) Shopify webhook:  { "line_items": [ { "sku": "BP-123", "quantity": 1 }, ... ] }
//       (اربط webhook "orders/create" من شوبيفاي على الرابط ده مع ?secret=)
//
// لازم ضبط متغير SYNC_SECRET في إعدادات Vercel قبل الاستخدام.
import { getProducts, saveProducts, logActivity } from './_lib/db.js';
import { cors } from './_lib/util.js';

function checkSecret(req, res) {
  if (!process.env.SYNC_SECRET) {
    res.status(503).json({ error: 'المزامنة غير مفعّلة: أضِف متغير SYNC_SECRET في إعدادات Vercel' });
    return false;
  }
  const provided = req.headers['x-sync-secret'] || req.query.secret;
  if (provided !== process.env.SYNC_SECRET) {
    res.status(401).json({ error: 'رمز المزامنة غير صحيح' });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!checkSecret(req, res)) return;

  try {
    const products = await getProducts();

    if (req.method === 'GET') {
      const inventory = products.map((p) => ({
        sku: p.sku, name: p.name, stock: p.stock, price: p.price, condition: p.condition,
      }));
      return res.status(200).json(inventory);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      // ندعم الشكل البسيط وشكل Shopify order webhook
      const lines = Array.isArray(body.line_items)
        ? body.line_items
        : body.sku
          ? [{ sku: body.sku, quantity: body.quantity || 1 }]
          : [];

      if (lines.length === 0) {
        return res.status(400).json({ error: 'أرسل sku و quantity أو line_items' });
      }

      const updated = [];
      const notFound = [];
      for (const line of lines) {
        if (!line.sku) continue;
        const product = products.find((p) => p.sku === line.sku);
        if (!product) {
          notFound.push(line.sku);
          continue;
        }
        const qty = Math.max(1, Number(line.quantity) || 1);
        product.stock = Math.max(0, product.stock - qty);
        updated.push({ sku: product.sku, name: product.name, stock: product.stock });
      }

      await saveProducts(products);
      if (updated.length) {
        await logActivity('sync', `🔄 مزامنة خارجية: خصم مخزون ${updated.map((u) => u.sku).join('، ')}`);
      }
      return res.status(200).json({ ok: true, updated, notFound });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
