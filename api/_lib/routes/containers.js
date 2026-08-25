// 🧩 Share-a-Container — حاويات مجدولة يشارك فيها التجار حسب الحجم (CBM)
// GET  /api/containers            → الحاويات المفتوحة (عام) / كلها بالحجوزات (إدارة)
// POST /api/containers            → إنشاء حاوية (إدارة)
// POST /api/containers {action:'book'} → حجز مساحة (عام، طلب حجز)
// PUT  /api/containers            → تغيير الحالة (إدارة)
// DELETE /api/containers?id=..    → حذف (إدارة)
import { getContainers, saveContainers, logActivity, getUsers } from '../db.js';
import { cors, requireAdmin, rateLimit, validIntlPhone } from '../util.js';
import { getUser } from '../auth.js';

const round2 = (n) => Math.round(n * 100) / 100;

// نُخفي بيانات الحاجزين عن العامة، ونعرض الإجماليات فقط
function publicView(s) {
  return {
    id: s.id, ref: s.ref, laneCode: s.laneCode, port: s.port,
    containerCode: s.containerCode, containerName: s.containerName,
    capacityCbm: s.capacityCbm, bookedCbm: s.bookedCbm, baseFreightUsd: s.baseFreightUsd,
    status: s.status, cutoffDate: s.cutoffDate, etd: s.etd,
    bookingsCount: (s.bookings || []).length,
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const list = await getContainers();

    if (req.method === 'GET') {
      // التاجر المسجّل يشوف حجوزاته (بمطابقة رقم موبايله) عبر كل الحاويات
      if (req.query.mine) {
        const session = getUser(req);
        if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
        const users = await getUsers();
        const me = users.find((u) => u.id === session.uid);
        if (!me) return res.status(401).json({ error: 'الحساب غير موجود' });
        const mine = [];
        list.forEach((s) => (s.bookings || []).forEach((bk) => {
          if (bk.phone === me.phone) mine.push({ ...bk, ref: s.ref, port: s.port, containerName: s.containerName, shipStatus: s.status, etd: s.etd });
        }));
        return res.status(200).json(mine);
      }
      // إدارة: كل شيء بالحجوزات — عام: المفتوحة فقط بدون تفاصيل
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const isAdmin = process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
      if (isAdmin) return res.status(200).json(list);
      const open = list.filter((s) => ['open', 'filling'].includes(s.status));
      return res.status(200).json(open.map(publicView));
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // ---- حجز مساحة (عام) ----
      if (body.action === 'book') {
        if (!rateLimit(req, res, 'container_book', 6)) return;
        const { shipmentId, cbm } = body;
        const d = body.dealer || {};
        const wantCbm = Number(cbm) || 0;
        if (!d.name?.trim() || !d.phone?.trim()) {
          return res.status(400).json({ error: 'الاسم ورقم الموبايل مطلوبين' });
        }
        if (!validIntlPhone(d.phone)) {
          return res.status(400).json({ error: 'رقم موبايل غير صحيح (بكود الدولة)' });
        }
        if (wantCbm <= 0) return res.status(400).json({ error: 'حدّد حجم صحيح بالمتر المكعب' });

        const s = list.find((x) => x.id === shipmentId);
        if (!s) return res.status(404).json({ error: 'الحاوية غير موجودة' });
        if (!['open', 'filling'].includes(s.status)) {
          return res.status(400).json({ error: 'الحاوية دي مش مفتوحة للحجز' });
        }
        const remaining = round2(s.capacityCbm - s.bookedCbm);
        if (wantCbm > remaining) {
          return res.status(409).json({ error: `المتاح ${remaining} م³ فقط`, remaining });
        }
        // حصتك = سعر الحاوية الكامل × نسبة حجمك (السعر شامل الهامش بالفعل)
        const shareUsd = round2(s.baseFreightUsd * (wantCbm / s.capacityCbm));
        const booking = {
          id: 'bk' + Date.now(),
          name: d.name.trim().slice(0, 80),
          phone: d.phone.trim().slice(0, 20),
          company: (d.company || '').trim().slice(0, 120),
          country: (d.country || '').trim().slice(0, 60),
          cbm: wantCbm,
          shareUsd,
          status: 'reserved',
          at: new Date().toISOString(),
        };
        s.bookings = s.bookings || [];
        s.bookings.push(booking);
        s.bookedCbm = round2(s.bookedCbm + wantCbm);
        s.status = s.bookedCbm >= s.capacityCbm ? 'full' : 'filling';
        await saveContainers(list);
        await logActivity('container', `🧩 حجز ${wantCbm} م³ في ${s.ref} من ${booking.company || booking.name} — ${booking.shareUsd}$`);
        return res.status(201).json({ ok: true, booking, shipment: publicView(s) });
      }

      // ---- إنشاء حاوية (إدارة) ----
      if (!requireAdmin(req, res)) return;
      if (!body.containerCode || !body.capacityCbm || !body.baseFreightUsd) {
        return res.status(400).json({ error: 'نوع الحاوية والسعة وسعر الشحن مطلوبين' });
      }
      const shipment = {
        id: 'sh' + Date.now(),
        ref: body.ref || ('CNT-' + String(Date.now()).slice(-6)),
        laneCode: body.laneCode || 'DEFAULT',
        port: (body.port || '').slice(0, 60),
        containerCode: body.containerCode,
        containerName: (body.containerName || body.containerCode).slice(0, 40),
        capacityCbm: Number(body.capacityCbm) || 0,
        bookedCbm: 0,
        baseFreightUsd: Number(body.baseFreightUsd) || 0,
        status: 'open',
        cutoffDate: body.cutoffDate || '',
        etd: body.etd || '',
        createdAt: new Date().toISOString(),
        bookings: [],
      };
      list.unshift(shipment);
      await saveContainers(list);
      await logActivity('container', `🚢 حاوية جديدة ${shipment.ref} (${shipment.containerCode}) — ${shipment.capacityCbm} م³`);
      return res.status(201).json(shipment);
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const { id, status } = req.body || {};
      const s = list.find((x) => x.id === id);
      if (!s) return res.status(404).json({ error: 'الحاوية غير موجودة' });
      if (!['open', 'filling', 'full', 'sealed', 'shipped', 'delivered'].includes(status)) {
        return res.status(400).json({ error: 'حالة غير صحيحة' });
      }
      s.status = status;
      await saveContainers(list);
      return res.status(200).json(s);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const { id } = req.query;
      const i = list.findIndex((x) => x.id === id);
      if (i === -1) return res.status(404).json({ error: 'الحاوية غير موجودة' });
      const [removed] = list.splice(i, 1);
      await saveContainers(list);
      await logActivity('container', `🗑️ حذف الحاوية: ${removed.ref}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
