// 🛒 السلات المتروكة — العميل كتب رقم موبايل صحيح في فورم السلة ومكمّلش الطلب.
// العميل بيتنبّه تحت خانة الرقم إننا بنحفظه عشان نساعده يكمّل طلبه.
//
// POST   /api/carts  { cid, br:'eg'|'ae', name, phone, items:[{id,name,qty,price}], total, cur }  (عام)
// GET    /api/carts  → القائمة (إدارة)
// PUT    /api/carts  { id, status:'contacted'|'new', note? }  (إدارة)
// DELETE /api/carts?id=  (إدارة)
import { getAbandonedCarts, saveAbandonedCarts } from '../db.js';
import { cors, requireAdmin, rateLimit, validPhone, validIntlPhone } from '../util.js';

const KEEP_DAYS = 45;
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const normPhone = (p) => String(p || '').replace(/[\s-]/g, '');

// 🔁 لما الطلب يتأكد نعلّم السلة بتاعة نفس الرقم إنها اتحولت لطلب
export async function markRecovered(phone, orderNumber) {
  const ph = normPhone(phone);
  if (!ph) return;
  const list = await getAbandonedCarts();
  let changed = false;
  list.forEach((c) => { if (c.phone === ph && c.status !== 'ordered') { c.status = 'ordered'; c.order = orderNumber || ''; c.orderedAt = new Date().toISOString(); changed = true; } });
  if (changed) await saveAbandonedCarts(list);
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'carts', 20)) return;
      const b = req.body || {};
      const br = b.br === 'ae' ? 'ae' : 'eg';
      const phone = normPhone(b.phone);
      if (!(br === 'eg' ? validPhone(phone) : validIntlPhone(phone))) return res.status(400).json({ error: 'رقم غير صحيح' });
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 50).map((i) => ({
        id: clean(i.id, 40), name: clean(i.name, 120), qty: Math.max(1, Math.min(999, Number(i.qty) || 1)), price: Math.max(0, Number(i.price) || 0),
      })).filter((i) => i.id);
      if (!items.length) return res.status(400).json({ error: 'السلة فاضية' });
      const now = new Date().toISOString();
      const cutoff = Date.now() - KEEP_DAYS * 86400000;
      const list = (await getAbandonedCarts()).filter((c) => Date.parse(c.updatedAt) > cutoff);
      // سلة واحدة مفتوحة لكل رقم+فرع — بنحدّثها بدل ما نكرّر
      let c = list.find((x) => x.phone === phone && x.br === br && x.status !== 'ordered');
      if (!c) { c = { id: 'ac' + Date.now() + Math.random().toString(36).slice(2, 6), phone, br, status: 'new', createdAt: now }; list.unshift(c); }
      Object.assign(c, {
        name: clean(b.name, 60) || c.name || '', items, total: Math.max(0, Number(b.total) || 0), cur: br === 'ae' ? 'USD' : 'EGP',
        city: clean(b.city, 40) || c.city || '', updatedAt: now,
      });
      if (list.length > 1000) list.length = 1000;
      await saveAbandonedCarts(list);
      return res.status(200).json({ ok: true });
    }

    if (!requireAdmin(req, res)) return;
    const list = await getAbandonedCarts();

    if (req.method === 'GET') return res.status(200).json(list);

    if (req.method === 'PUT') {
      const { id, status, note } = req.body || {};
      const c = list.find((x) => x.id === id);
      if (!c) return res.status(404).json({ error: 'غير موجودة' });
      if (['new', 'contacted'].includes(status)) { c.status = status; if (status === 'contacted') c.contactedAt = new Date().toISOString(); }
      if (note !== undefined) c.note = clean(note, 300);
      await saveAbandonedCarts(list);
      return res.status(200).json(c);
    }

    if (req.method === 'DELETE') {
      const i = list.findIndex((x) => x.id === req.query.id);
      if (i === -1) return res.status(404).json({ error: 'غير موجودة' });
      list.splice(i, 1);
      await saveAbandonedCarts(list);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
