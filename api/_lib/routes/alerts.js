// 🔔 تنبيهات الوصولات الجديدة — التاجر يشترك، وانت تبعتله أول ما يوصل جديد
// POST   /api/alerts            → اشتراك جديد (عام)
// GET    /api/alerts            → قائمة المشتركين (إدارة)
// DELETE /api/alerts?id=..      → حذف مشترك (إدارة)
import { getAlerts, saveAlerts, logActivity } from '../db.js';
import { cors, requireAdmin, rateLimit, validIntlPhone } from '../util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'alerts', 5)) return;
      const { name, phone, interest } = req.body || {};
      if (!name?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'الاسم ورقم الموبايل مطلوبين' });
      }
      if (!validIntlPhone(phone)) {
        return res.status(400).json({ error: 'رقم موبايل غير صحيح (بكود الدولة)' });
      }
      const list = await getAlerts();
      // منع التكرار لنفس الرقم — نحدّث اهتمامه بدل ما نضيف تاني
      const existing = list.find((a) => a.phone === phone.trim());
      if (existing) {
        existing.name = name.trim().slice(0, 80);
        existing.interest = (interest || '').trim().slice(0, 300);
        existing.updatedAt = new Date().toISOString();
        await saveAlerts(list);
        return res.status(200).json({ ok: true, updated: true });
      }
      const sub = {
        id: 'al' + Date.now(),
        name: name.trim().slice(0, 80),
        phone: phone.trim().slice(0, 20),
        interest: (interest || '').trim().slice(0, 300),
        createdAt: new Date().toISOString(),
      };
      list.unshift(sub);
      await saveAlerts(list);
      await logActivity('alert', `🔔 اشتراك تنبيهات جديد: ${sub.name} (${sub.phone}) — ${sub.interest || 'كل الوصولات'}`);
      return res.status(201).json({ ok: true, subscription: sub });
    }

    if (!requireAdmin(req, res)) return;
    const list = await getAlerts();

    if (req.method === 'GET') return res.status(200).json(list);

    if (req.method === 'DELETE') {
      const { id } = req.query;
      const i = list.findIndex((a) => a.id === id);
      if (i === -1) return res.status(404).json({ error: 'غير موجود' });
      list.splice(i, 1);
      await saveAlerts(list);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
