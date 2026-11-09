// كوبونات الخصم
// POST   /api/coupons { action: "validate", code, subtotal } → التحقق من كوبون (عام)
// GET    /api/coupons            → قائمة الكوبونات (إدارة)
// POST   /api/coupons { code, type, value, minTotal } → إنشاء (إدارة)
// DELETE /api/coupons?code=X     → حذف (إدارة)
import { getCoupons, saveCoupons, logActivity, getProducts } from '../db.js';
import { cors, requireAdmin } from '../util.js';

// items: [{ id, price, qty }] — لو الكوبون مخصص لمنتجات معينة، الخصم بيتحسب على قيمتها هي بس
export function eligibleSubtotal(coupon, subtotal, items) {
  const ids = Array.isArray(coupon.productIds) ? coupon.productIds : [];
  if (!ids.length) return subtotal;
  return (items || []).filter((i) => ids.includes(i.id)).reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
}
export function calcDiscount(coupon, subtotal, items) {
  if (subtotal < (coupon.minTotal || 0)) return 0;
  const base = eligibleSubtotal(coupon, subtotal, items);
  if (base <= 0) return 0;
  const discount = coupon.type === 'percent'
    ? Math.round(base * coupon.value / 100)
    : coupon.value;
  return Math.min(discount, base);
}

export async function findCoupon(code) {
  if (!code) return null;
  const coupons = await getCoupons();
  const coupon = coupons.find((c) => c.code.toLowerCase() === String(code).trim().toLowerCase() && c.active);
  if (!coupon) return null;
  // كوبون بعدد استخدامات محدود (الهدايا مرة واحدة)
  if (coupon.maxUses > 0 && (coupon.usedCount || 0) >= coupon.maxUses) return null;
  return coupon;
}

// تسجيل استخدام الكوبون بعد إتمام الطلب
export async function markCouponUsed(code) {
  const coupons = await getCoupons();
  const coupon = coupons.find((c) => c.code === code);
  if (coupon) {
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    await saveCoupons(coupons);
  }
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST' && req.body?.action === 'validate') {
      const { code, subtotal } = req.body;
      const coupon = await findCoupon(code);
      if (!coupon) return res.status(404).json({ error: 'الكوبون غير صحيح أو منتهي' });
      // الأسعار من قاعدة البيانات مش من المتصفح
      let items = [];
      if (Array.isArray(req.body.items)) {
        const products = await getProducts();
        items = req.body.items.map((i) => {
          const p = products.find((x) => x.id === i.id);
          return p ? { id: p.id, price: Number(p.price) || 0, qty: Math.max(1, Math.floor(Number(i.qty)) || 1) } : null;
        }).filter(Boolean);
      }
      const sub = items.length ? items.reduce((s, i) => s + i.price * i.qty, 0) : (Number(subtotal) || 0);
      const discount = calcDiscount(coupon, sub, items);
      if (discount === 0) {
        if ((coupon.productIds || []).length && eligibleSubtotal(coupon, sub, items) <= 0) {
          return res.status(400).json({ error: 'الكوبون ده على منتجات معينة مش موجودة في سلتك' });
        }
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
        maxUses: Number(req.body.maxUses) || (req.body.gift ? 1 : 0), // الهدية مرة واحدة افتراضياً
        productIds: Array.isArray(req.body.productIds) ? req.body.productIds.map(String).slice(0, 500) : [],
        productNames: Array.isArray(req.body.productNames) ? req.body.productNames.map((x) => String(x).slice(0, 120)).slice(0, 500) : [],
        usedCount: 0,
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
