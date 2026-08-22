// 💳 الدفع الأونلاين بالبطاقة عبر Paymob
//
// GET  /api/pay                     → { enabled } هل الدفع بالكارت مفعّل؟
// POST /api/pay { number, phone }   → إنشاء جلسة دفع وإرجاع رابط صفحة الكارت
// GET  /api/pay?hmac=...&success=.. → رجوع العميل من صفحة الدفع (redirect)
// POST /api/pay (من Paymob)         → إشعار نتيجة العملية (webhook) وتعليم الطلب مدفوع
//
// المتغيرات المطلوبة في Vercel:
//   PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID, PAYMOB_HMAC_SECRET
import crypto from 'crypto';
import { getOrders, saveOrders, logActivity } from '../db.js';
import { cors } from '../util.js';

const PAYMOB = 'https://accept.paymob.com/api';

function config() {
  const { PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID, PAYMOB_HMAC_SECRET } = process.env;
  if (!PAYMOB_API_KEY || !PAYMOB_INTEGRATION_ID || !PAYMOB_IFRAME_ID) return null;
  return { apiKey: PAYMOB_API_KEY, integrationId: PAYMOB_INTEGRATION_ID, iframeId: PAYMOB_IFRAME_ID, hmacSecret: PAYMOB_HMAC_SECRET || '' };
}

// التحقق من توقيع Paymob (HMAC-SHA512 على الحقول بترتيبها الرسمي)
const HMAC_FIELDS = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
];

function verifyHmacQuery(query, secret) {
  if (!secret) return true; // لو مش مضبوط نكمل (يفضل ضبطه للإنتاج)
  const data = HMAC_FIELDS.map((f) => query[f] ?? '').join('');
  const digest = crypto.createHmac('sha512', secret).update(data).digest('hex');
  return digest === query.hmac;
}

function verifyHmacWebhook(obj, hmac, secret) {
  if (!secret) return true;
  const pick = (path) => path.split('.').reduce((acc, k) => acc?.[k], obj);
  const map = {
    'order': obj.order?.id,
    'source_data.pan': obj.source_data?.pan,
    'source_data.sub_type': obj.source_data?.sub_type,
    'source_data.type': obj.source_data?.type,
  };
  const data = HMAC_FIELDS.map((f) => {
    const v = f in map ? map[f] : pick(f);
    return v === undefined || v === null ? '' : String(v);
  }).join('');
  const digest = crypto.createHmac('sha512', secret).update(data).digest('hex');
  return digest === hmac;
}

async function markPaid(merchantOrderId, transactionId) {
  const number = String(merchantOrderId || '').split('_')[0];
  const orders = await getOrders();
  const order = orders.find((o) => o.number === number);
  if (!order || order.paid) return order;
  order.paid = true;
  order.paymentRef = String(transactionId || '');
  if (order.status === 'new') order.status = 'confirmed';
  await saveOrders(orders);
  await logActivity('order', `💳 الطلب ${order.number} اتدفع أونلاين بالبطاقة بنجاح (عملية ${transactionId})`);
  return order;
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const cfg = config();

  try {
    if (req.method === 'GET') {
      // رجوع العميل من صفحة الدفع
      if (req.query.hmac || req.query.success !== undefined) {
        const ok = req.query.success === 'true' && verifyHmacQuery(req.query, cfg?.hmacSecret);
        let orderNumber = String(req.query.merchant_order_id || '').split('_')[0];
        if (ok) await markPaid(req.query.merchant_order_id, req.query.id);
        res.statusCode = 302;
        res.setHeader('Location', `/track.html?number=${encodeURIComponent(orderNumber)}&paid=${ok ? '1' : '0'}`);
        return res.end();
      }
      // فحص التفعيل للواجهة
      return res.status(200).json({ enabled: Boolean(cfg) });
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // إشعار Paymob (webhook) — الجسم فيه obj
      if (body.obj && body.type === 'TRANSACTION') {
        const obj = body.obj;
        if (!verifyHmacWebhook(obj, req.query.hmac, cfg?.hmacSecret)) {
          return res.status(401).json({ error: 'bad hmac' });
        }
        if (obj.success === true) {
          await markPaid(obj.order?.merchant_order_id, obj.id);
        }
        return res.status(200).json({ ok: true });
      }

      // إنشاء جلسة دفع من صفحة السلة
      if (!cfg) return res.status(503).json({ error: 'الدفع بالبطاقة غير مفعّل حالياً' });
      const { number, phone } = body;
      const orders = await getOrders();
      const order = orders.find(
        (o) => o.number === String(number || '').trim().toUpperCase() &&
               o.customer.phone === String(phone || '').trim()
      );
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
      if (order.paid) return res.status(400).json({ error: 'الطلب ده مدفوع بالفعل ✓' });

      // 1) توكن الدخول
      const authRes = await fetch(`${PAYMOB}/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: cfg.apiKey }),
      });
      const { token } = await authRes.json();
      if (!token) return res.status(502).json({ error: 'فشل الاتصال بـ Paymob — راجع PAYMOB_API_KEY' });

      // 2) تسجيل الطلب عند Paymob (برقم مميز لكل محاولة)
      const merchantOrderId = `${order.number}_${Date.now()}`;
      const amountCents = Math.round(order.total * 100);
      const orderRes = await fetch(`${PAYMOB}/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          delivery_needed: 'false',
          amount_cents: amountCents,
          currency: 'EGP',
          merchant_order_id: merchantOrderId,
          items: order.items.map((i) => ({
            name: i.name.slice(0, 50), amount_cents: Math.round(i.price * 100), quantity: i.qty,
          })),
        }),
      });
      const paymobOrder = await orderRes.json();
      if (!paymobOrder.id) return res.status(502).json({ error: 'فشل تسجيل الطلب عند Paymob' });

      // 3) مفتاح الدفع
      const nameParts = order.customer.name.trim().split(/\s+/);
      const keyRes = await fetch(`${PAYMOB}/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: token,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: paymobOrder.id,
          currency: 'EGP',
          integration_id: Number(cfg.integrationId),
          billing_data: {
            first_name: nameParts[0] || 'NA',
            last_name: nameParts.slice(1).join(' ') || 'NA',
            phone_number: '+2' + order.customer.phone,
            email: 'customer@fixit.eg',
            street: order.customer.address?.slice(0, 100) || 'NA',
            city: order.customer.city || 'Cairo',
            country: 'EG',
            apartment: 'NA', floor: 'NA', building: 'NA',
            shipping_method: 'NA', postal_code: 'NA', state: 'NA',
          },
        }),
      });
      const paymentKey = await keyRes.json();
      if (!paymentKey.token) return res.status(502).json({ error: 'فشل إنشاء مفتاح الدفع — راجع PAYMOB_INTEGRATION_ID' });

      return res.status(200).json({
        iframe_url: `https://accept.paymob.com/api/acceptance/iframes/${cfg.iframeId}?payment_token=${paymentKey.token}`,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
