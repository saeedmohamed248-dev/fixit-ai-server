// "نبهني لما توفر" — العميل يسيب رقمه على قطعة خالصة
// POST   /api/notify            → { productId, name, phone }
// GET    /api/notify            → القائمة (إدارة)
// DELETE /api/notify?id=        → تم الإبلاغ / حذف (إدارة)
import { getNotify, saveNotify, getProducts, logActivity } from '../db.js';
import { cors, requireAdmin, rateLimit, validPhone } from '../util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const list = await getNotify();

    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'notify', 5)) return;
      const { productId, name, phone } = req.body || {};
      if (!productId || !validPhone(phone)) {
        return res.status(400).json({ error: 'اكتب رقم موبايل صحيح (11 رقم يبدأ بـ 01)' });
      }
      const products = await getProducts();
      const product = products.find((p) => p.id === productId);
      if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
      if (list.some((n) => n.productId === productId && n.phone === phone)) {
        return res.status(200).json({ ok: true, duplicate: true });
      }
      list.unshift({
        id: 'n' + Date.now(),
        productId,
        productName: product.name,
        sku: product.sku,
        name: (name || '').trim().slice(0, 60),
        phone: phone.trim(),
        createdAt: new Date().toISOString(),
      });
      await saveNotify(list);
      await logActivity('notify', `🔔 عميل مستني توفر "${product.name}" — ${phone}`);
      return res.status(201).json({ ok: true });
    }

    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') return res.status(200).json(list);

    if (req.method === 'DELETE') {
      const index = list.findIndex((n) => n.id === req.query.id);
      if (index === -1) return res.status(404).json({ error: 'غير موجود' });
      list.splice(index, 1);
      await saveNotify(list);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
