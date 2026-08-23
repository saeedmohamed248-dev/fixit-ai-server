// مواعيد الصيانة — تلقائية (حسب القطع المشتراة) + يدوية (من الأدمن)
// GET    /api/maintenance?mine=1   → مواعيد العميل الحالي (بتوكن العميل)
// GET    /api/maintenance          → الكل (إدارة)
// POST   /api/maintenance          → إضافة موعد يدوي (إدارة)
// PUT    /api/maintenance          → تعديل/تعليم كمنفّذ (إدارة)
// DELETE /api/maintenance?id=       → حذف (إدارة)
import { getMaintenance, saveMaintenance, getUsers, logActivity } from '../db.js';
import { getUser } from '../auth.js';
import { sendMaintenanceReminder } from '../email.js';
import { cors, requireAdmin } from '../util.js';

// العمر الافتراضي للقطع (بالشهور) حسب الفئة — تُستخدم لتوليد التذكير تلقائياً
export const SERVICE_INTERVALS = {
  'فلاتر وصيانة': 6,
  'فرامل': 12,
  'تبريد': 24,
  'كهرباء وإشعال': 18,
  'وقود': 18,
};

// تُستدعى من orders.js عند إنشاء طلب: تولّد تذكيرات للقطع القابلة للصيانة
export async function generateFromOrder(order) {
  const due = (months) => {
    const d = new Date(order.createdAt);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  const list = await getMaintenance();
  let added = 0;
  for (const item of order.items) {
    const months = SERVICE_INTERVALS[item.category];
    if (!months) continue;
    list.unshift({
      id: 'mt' + Date.now() + Math.random().toString(36).slice(2, 5),
      userId: order.userId || null,
      phone: order.customer.phone,
      customerName: order.customer.name,
      title: `تغيير/فحص: ${item.name}`,
      dueDate: due(months),
      note: `بناءً على شرائك من طلب ${order.number}`,
      source: 'auto',
      done: false,
      createdAt: new Date().toISOString(),
    });
    added++;
  }
  if (added) await saveMaintenance(list.slice(0, 2000));
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    // ⏰ مهمة مجدولة (Vercel Cron): إرسال تذكيرات الصيانة القريبة بالإيميل
    if (req.query.cron !== undefined) {
      const secret = process.env.CRON_SECRET;
      const auth = (req.headers.authorization || '').replace('Bearer ', '');
      if (!secret || (auth !== secret && req.query.cron !== secret)) {
        return res.status(401).json({ error: 'unauthorized' });
      }
      const list = await getMaintenance();
      const users = await getUsers();
      const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
      const today = new Date().toISOString().slice(0, 10);
      let sent = 0;
      for (const m of list) {
        if (m.done || m.emailed) continue;
        if (m.dueDate < today || m.dueDate > soon) continue; // خلال 3 أيام قادمة
        const u = users.find((x) => x.id === m.userId || x.phone === m.phone);
        if (u && u.email) {
          await sendMaintenanceReminder(m, u.email);
          m.emailed = true;
          sent++;
        }
      }
      if (sent) await saveMaintenance(list);
      return res.status(200).json({ ok: true, sent });
    }

    if (req.method === 'GET' && req.query.mine) {
      const session = getUser(req);
      if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
      const list = await getMaintenance();
      const mine = list
        .filter((m) => m.userId === session.uid)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      return res.status(200).json(mine);
    }

    if (!requireAdmin(req, res)) return;
    const list = await getMaintenance();

    if (req.method === 'GET') {
      return res.status(200).json([...list].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
    }

    if (req.method === 'POST') {
      const { userId, phone, customerName, title, dueDate, note } = req.body || {};
      if (!phone || !title || !dueDate) {
        return res.status(400).json({ error: 'رقم الموبايل والعنوان والتاريخ مطلوبين' });
      }
      const entry = {
        id: 'mt' + Date.now(),
        userId: userId || null,
        phone: String(phone).trim(),
        customerName: customerName || '',
        title: String(title).trim().slice(0, 160),
        dueDate: String(dueDate).slice(0, 10),
        note: String(note || '').trim().slice(0, 300),
        source: 'admin',
        done: false,
        createdAt: new Date().toISOString(),
      };
      list.unshift(entry);
      await saveMaintenance(list);
      await logActivity('maintenance', `🔧 موعد صيانة جديد لـ ${entry.customerName || entry.phone}: ${entry.title} (${entry.dueDate})`);
      return res.status(201).json(entry);
    }

    if (req.method === 'PUT') {
      const { id, done, dueDate, title, note } = req.body || {};
      const entry = list.find((m) => m.id === id);
      if (!entry) return res.status(404).json({ error: 'الموعد غير موجود' });
      if (typeof done === 'boolean') entry.done = done;
      if (dueDate) entry.dueDate = String(dueDate).slice(0, 10);
      if (title) entry.title = String(title).slice(0, 160);
      if (note !== undefined) entry.note = String(note).slice(0, 300);
      await saveMaintenance(list);
      return res.status(200).json(entry);
    }

    if (req.method === 'DELETE') {
      const idx = list.findIndex((m) => m.id === req.query.id);
      if (idx === -1) return res.status(404).json({ error: 'غير موجود' });
      list.splice(idx, 1);
      await saveMaintenance(list);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
