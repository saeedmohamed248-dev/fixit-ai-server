// كوبونات الخصم
// POST   /api/coupons { action: "validate", code, subtotal } → التحقق من كوبون (عام)
// GET    /api/coupons            → قائمة الكوبونات (إدارة)
// POST   /api/coupons { code, type, value, minTotal } → إنشاء (إدارة)
// DELETE /api/coupons?code=X     → حذف (إدارة)
import { getCoupons, saveCoupons, logActivity } from './_lib/db.js';
import { cors, requireAdmin } from './_lib/util.js';

export function calcDiscount(coupon, subtotal) {
  if (subtotal < (coupon.minTotal || 0)) return 0;
  const discount = coupon.type === 'percent'
    ? Math.round(subtotal * coupon.value / 100)
    : coupon.value;
  return Math.min(discount, subtotal);
}

export async function findCoupon(code) {
  if (!code) return null;
  const coupons = await getCoupons();
  return coupons.find((c) => c.code.toLowerCase() === String(code).trim().toLowerCase() && c.active) || null;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST' && req.body?.action === 'validate') {
      const { code, subtotal } = req.body;
      const coupon = await findCoupon(code);
      if (!coupon) return res.status(404).json({ error: 'الكوبون غير صحيح أو منتهي' });
      const discount = calcDiscount(coupon, Number(subtotal) || 0);
      if (discount === 0) {
        return res.status(400).json({ error: `الكوبون ده للطلبات أكتر من ${coupon.minTotal} ج.م` });
      }
      return res.status(200).json({ code: coupon.code, discount });
    }

    if (!requireAdmin(req, res)) return;
    const coupons = await getCoupons();

    if (req.method === 'GET') return res.status(200).json(coupons);

    if (req.method === 'POST') {
      const { code, type, value, minTotal } = req.body || {};
      if (!code?.trim() || !Number(value)) {
        return res.status(400).json({ error: 'الكود وقيمة الخصم مطلوبين' });
      }
      if (coupons.some((c) => c.code.toLowerCase() === code.trim().toLowerCase())) {
        return res.status(400).json({ error: 'الكود ده موجود قبل كده' });
      }
      const coupon = {
        code: code.trim().toUpperCase(),
        type: type === 'percent' ? 'percent' : 'fixed',
        value: Number(value),
        minTotal: Number(minTotal) || 0,
        gift: Boolean(req.body.gift),
        giftFor: req.body.giftFor || '',
        active: true,
        createdAt: new Date().toISOString(),
      };
      coupons.push(coupon);
      await saveCoupons(coupons);
      const valueLabel = coupon.type === 'percent' ? coupon.value + '%' : coupon.value + ' ج.م';
      await logActivity(coupon.gift ? 'gift' : 'coupon', coupon.gift
        ? `🎁 هدية للعميل ${coupon.giftFor}: كود ${coupon.code} بخصم ${valueLabel}`
        : `🎟️ كوبون جديد: ${coupon.code} بخصم ${valueLabel}`);
      return res.status(201).json(coupon);
    }

    if (req.method === 'DELETE') {
      const index = coupons.findIndex((c) => c.code === req.query.code);
      if (index === -1) return res.status(404).json({ error: 'الكوبون غير موجود' });
      const [removed] = coupons.splice(index, 1);
      await saveCoupons(coupons);
      await logActivity('coupon', `🗑️ حذف الكوبون: ${removed.code}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
