// POST /api/orders                          → إنشاء طلب جديد (من صفحة السلة)
// GET  /api/orders?mine=1                   → طلبات العميل الحالي (بتوكن العميل)
// GET  /api/orders?track=ORD-123&phone=010  → تتبع طلب (عام)
// GET  /api/orders                          → كل الطلبات (إدارة)
// PUT  /api/orders                          → تغيير حالة طلب (إدارة)
import { getProducts, saveProducts, getOrders, saveOrders, getUsers, saveUsers, logActivity } from '../db.js';
import { getUser } from '../auth.js';
import { findCoupon, calcDiscount, markCouponUsed } from './coupons.js';
import { generateFromOrder } from './maintenance.js';
import { sendOrderConfirm, sendStatusUpdate } from '../email.js';
import { cors, requireAdmin, rateLimit, validPhone } from '../util.js';

const STATUSES = ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const PAYMENTS = ['cod', 'instapay', 'wallet', 'card'];

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      const body = req.body || {};

      // ↩️ طلب إرجاع من العميل
      if (body.action === 'return_request') {
        if (!rateLimit(req, res, 'returns', 5)) return;
        const orders = await getOrders();
        const order = orders.find(
          (o) => o.number === String(body.number || '').trim().toUpperCase() &&
                 o.customer.phone === String(body.phone || '').trim()
        );
        if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
        if (order.returnRequest) return res.status(400).json({ error: 'فيه طلب إرجاع قائم بالفعل على الطلب ده' });
        order.returnRequest = {
          reason: String(body.reason || '').trim().slice(0, 400),
          at: new Date().toISOString(),
          status: 'pending',
        };
        await saveOrders(orders);
        await logActivity('order', `↩️ طلب إرجاع على ${order.number} من ${order.customer.name}: ${order.returnRequest.reason || 'بدون سبب'}`);
        return res.status(200).json({ ok: true });
      }

      const { customer, items } = body;

      if (!rateLimit(req, res, 'orders', 10)) return;
      if (!customer?.name || !customer?.phone || !customer?.address) {
        return res.status(400).json({ error: 'الاسم ورقم الموبايل والعنوان مطلوبين' });
      }
      if (!validPhone(customer.phone)) {
        return res.status(400).json({ error: 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01' });
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'السلة فارغة' });
      }

      const products = await getProducts();
      const orderItems = [];

      // السعر يُحسب من قاعدة البيانات وليس من المتصفح
      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product) return res.status(400).json({ error: 'منتج غير موجود في الطلب' });
        const qty = Math.max(1, Number(item.qty) || 1);
        if (product.stock < qty) {
          return res.status(400).json({ error: `الكمية المتاحة من "${product.name}" هي ${product.stock} فقط` });
        }
        orderItems.push({
          id: product.id, sku: product.sku, name: product.name,
          condition: product.condition, category: product.category, price: product.price, qty,
        });
      }

      const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

      // الكوبون يُتحقق منه في السيرفر
      let discount = 0;
      let couponCode = '';
      if (body.coupon) {
        const coupon = await findCoupon(body.coupon);
        if (coupon) {
          discount = calcDiscount(coupon, subtotal);
          if (discount > 0) {
            couponCode = coupon.code;
            await markCouponUsed(coupon.code);
          }
        }
      }

      // ⭐ نقاط الولاء: استخدام النقاط كخصم (نقطة = جنيه) + كسب 5% من قيمة الطلب
      const session = getUser(req);
      let pointsUsed = 0;
      let pointsEarned = 0;
      let users = null;
      let user = null;
      if (session) {
        users = await getUsers();
        user = users.find((u) => u.id === session.uid);
      }
      if (user && Number(body.usePoints) > 0) {
        pointsUsed = Math.min(
          Math.floor(Number(body.usePoints)),
          user.points || 0,
          subtotal - discount
        );
      }

      // 💳 رصيد الاستبدال (Store Credit): يُستخدم فقط لو قيمة الطلب أكبر من الرصيد
      // (شرط الحد الأدنى) — يضمن إن العميل يشتري ويدفع فرق مع رصيده
      let creditUsed = 0;
      const netBeforeCredit = subtotal - discount - pointsUsed;
      if (user && body.useCredit && (user.credit || 0) > 0) {
        if (netBeforeCredit > user.credit) {
          creditUsed = user.credit; // يستخدم كل الرصيد ويدفع الفرق
        }
      }

      // خصم المخزون + عدّاد المبيعات
      for (const item of orderItems) {
        const product = products.find((p) => p.id === item.id);
        product.stock -= item.qty;
        product.sold = (product.sold || 0) + item.qty;
      }
      await saveProducts(products);
      const order = {
        id: 'o' + Date.now(),
        number: 'ORD-' + String(Date.now()).slice(-6),
        createdAt: new Date().toISOString(),
        status: 'new',
        customer: {
          name: customer.name,
          phone: customer.phone,
          city: customer.city || '',
          address: customer.address,
        },
        userId: session?.uid || null,
        email: (user && user.email) || (customer.email || '').trim(),
        notes: body.notes || '',
        payment: PAYMENTS.includes(body.payment) ? body.payment : 'cod',
        items: orderItems,
        subtotal,
        discount,
        coupon: couponCode,
        pointsUsed,
        creditUsed,
        total: netBeforeCredit - creditUsed,
        source: 'website',
      };

      // تحديث رصيد النقاط والاستبدال: خصم المستخدَم + إضافة نقاط مكتسبة
      if (user) {
        pointsEarned = Math.floor(order.total * 0.05);
        user.points = (user.points || 0) - pointsUsed + pointsEarned;
        user.credit = (user.credit || 0) - creditUsed;
        order.pointsEarned = pointsEarned;
        await saveUsers(users);
      }

      const orders = await getOrders();
      orders.unshift(order);
      await saveOrders(orders);

      // توليد مواعيد الصيانة تلقائياً من القطع المشتراة
      try { await generateFromOrder(order); } catch {}

      // 📧 إيميل تأكيد الطلب (لو الإيميل متاح)
      try { await sendOrderConfirm(order, order.email); } catch {}

      await logActivity('order', `🛒 طلب جديد ${order.number} من ${order.customer.name} بقيمة ${order.total} ج.م (${orderItems.length} قطعة)`);

      // إرسال الطلب لسيستم موس تك (لو الربط مفعّل) — كفاتورة مسودة تتأكد من هناك
      if (process.env.MOUSSTEC_WEBHOOK_URL && process.env.MOUSSTEC_SECRET) {
        try {
          await fetch(process.env.MOUSSTEC_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Sync-Secret': process.env.MOUSSTEC_SECRET },
            body: JSON.stringify(order),
            signal: AbortSignal.timeout(6000),
          });
          await logActivity('sync', `📤 الطلب ${order.number} اتبعت لموس تك كفاتورة مسودة`);
        } catch {
          await logActivity('sync', `⚠️ فشل إرسال الطلب ${order.number} لموس تك — سجّله يدوياً`);
        }
      }

      return res.status(201).json(order);
    }

    if (req.method === 'GET') {
      const orders = await getOrders();

      // تتبع طلب — عام برقم الطلب + رقم الموبايل
      if (req.query.track) {
        const order = orders.find(
          (o) => o.number === req.query.track.trim().toUpperCase() &&
                 o.customer.phone === (req.query.phone || '').trim()
        );
        if (!order) return res.status(404).json({ error: 'مفيش طلب بالرقم ده — اتأكد من رقم الطلب ورقم الموبايل' });
        return res.status(200).json({
          number: order.number, status: order.status, createdAt: order.createdAt,
          items: order.items.map((i) => ({ name: i.name, qty: i.qty })),
          total: order.total, payment: order.payment,
        });
      }

      // طلبات العميل الحالي
      if (req.query.mine) {
        const session = getUser(req);
        if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
        return res.status(200).json(orders.filter((o) => o.userId === session.uid));
      }

      // كل الطلبات — إدارة
      if (!requireAdmin(req, res)) return;
      return res.status(200).json(orders);
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const orders = await getOrders();
      const order = orders.find((o) => o.id === (req.body || {}).id);
      if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

      // ↩️ الموافقة على الإرجاع وإصدار رصيد استبدال للعميل
      if (req.body.returnAction) {
        if (!order.returnRequest) return res.status(400).json({ error: 'مفيش طلب إرجاع على الطلب ده' });
        if (req.body.returnAction === 'approve') {
          const amount = Math.max(0, Number(req.body.creditAmount) || order.total);
          order.returnRequest.status = 'approved';
          order.returnRequest.credit = amount;
          // نضيف الرصيد لحساب العميل (بالـ userId أو برقم الموبايل)
          const users = await getUsers();
          const u = users.find((x) => x.id === order.userId || x.phone === order.customer.phone);
          if (u) {
            u.credit = (u.credit || 0) + amount;
            await saveUsers(users);
          }
          await saveOrders(orders);
          await logActivity('credit', `💳 موافقة إرجاع ${order.number} — رصيد استبدال ${amount} ج.م لـ ${order.customer.name}`);
          return res.status(200).json({ ok: true, credited: amount, hasAccount: Boolean(u) });
        }
        if (req.body.returnAction === 'reject') {
          order.returnRequest.status = 'rejected';
          await saveOrders(orders);
          await logActivity('credit', `↩️ رفض طلب إرجاع ${order.number}`);
          return res.status(200).json({ ok: true });
        }
      }

      // تغيير حالة الطلب
      const { status } = req.body;
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'حالة غير صحيحة' });
      }
      const STATUS_AR = { new: 'جديد', confirmed: 'مؤكد', shipped: 'في الشحن', delivered: 'تم التسليم', cancelled: 'ملغي' };
      order.status = status;
      if (typeof req.body.adminNote === 'string') order.adminNote = req.body.adminNote;
      await saveOrders(orders);
      await logActivity('status', `📦 الطلب ${order.number} اتغيرت حالته إلى "${STATUS_AR[status]}"`);
      // 📧 إيميل تحديث الحالة
      try { await sendStatusUpdate(order, order.email); } catch {}
      return res.status(200).json(order);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
