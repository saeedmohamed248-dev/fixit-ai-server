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

      // ✨ مزامنة كاملة من Mouss Tec: إنشاء/تحديث منتجات بالكامل حسب الـ SKU
      // { action: "upsert", items: [{ sku, name, brand, condition, price, stock, models, oem, ... }] }
      if (body.action === 'upsert' && Array.isArray(body.items)) {
        let created = 0, updated = 0;
        for (const item of body.items) {
          if (!item.sku || !item.name) continue;
          const existing = products.find((p) => p.sku === item.sku);
          const fields = {
            name: item.name,
            nameEn: item.nameEn || existing?.nameEn || '',
            brand: item.brand || 'BMW',
            condition: item.condition === 'used' ? 'used' : 'new',
            price: Number(item.price) || 0,
            oldPrice: Number(item.oldPrice) || existing?.oldPrice || 0,
            stock: Math.max(0, Number(item.stock) || 0),
            models: Array.isArray(item.models) ? item.models : existing?.models || [],
            oem: item.oem || existing?.oem || '',
            image: item.image || existing?.image || '',
            description: item.description || existing?.description || '',
          };
          if (existing) { Object.assign(existing, fields); updated++; }
          else {
            products.push({
              id: 'p' + Date.now() + Math.random().toString(36).slice(2, 5),
              sku: item.sku, images: [], sold: 0, ratingAvg: 0, ratingCount: 0,
              descriptionEn: '', ...fields,
            });
            created++;
          }
        }
        await saveProducts(products);
        await logActivity('sync', `🔄 مزامنة موس تك: تحديث ${updated} وإضافة ${created} منتج`);
        return res.status(200).json({ ok: true, created, updated });
      }

      // ✨ تحديث مخزون مطلق (القيمة النهائية مش خصم): { action: "set", items: [{ sku, stock, price? }] }
      if (body.action === 'set' && Array.isArray(body.items)) {
        const updated = [];
        for (const item of body.items) {
          const product = products.find((p) => p.sku === item.sku);
          if (!product) continue;
          product.stock = Math.max(0, Number(item.stock) || 0);
          if (item.price) product.price = Number(item.price);
          updated.push({ sku: product.sku, stock: product.stock });
        }
        await saveProducts(products);
        if (updated.length) {
          await logActivity('sync', `🔄 موس تك حدّث مخزون ${updated.length} قطعة`);
        }
        return res.status(200).json({ ok: true, updated });
      }

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
