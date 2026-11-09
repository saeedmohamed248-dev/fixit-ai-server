// طلبات توفير قطع غير متوفرة — العميل يسيب طلبه ونوفرهاله
// POST /api/requests → طلب جديد (عام)
// GET  /api/requests → القائمة (إدارة)
// PUT  /api/requests → تغيير الحالة (إدارة) { id, status: open|sourced|done }
// DELETE /api/requests?id=.. → حذف (إدارة)
import { getRequests, saveRequests, logActivity, getUsers } from '../db.js';
import { cors, requireAdmin, rateLimit, validPhone, validIntlPhone } from '../util.js';
import { getUser } from '../auth.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      const { name, phone, email, car, vin, partName, notes, wholesale, company, country, source } = req.body || {};
      if (!rateLimit(req, res, 'requests', 5)) return;

      // 🧩 طلب حاوية (التاجر يجمّع طلبه ونشحنهوله في حاوية — لوحده أو مشاركة مع تجار تانيين)
      if (req.body && req.body.kind === 'container') {
        const b = req.body;
        const clean = (v, n) => String(v || '').trim().slice(0, n);
        if (!clean(b.name, 80) || !clean(b.phone, 20)) return res.status(400).json({ error: 'الاسم ورقم الواتساب مطلوبين' });
        if (!validIntlPhone(b.phone)) return res.status(400).json({ error: 'رقم واتساب غير صحيح (اكتبه بكود الدولة، مثال: 2010xxxxxxxx)' });
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((i) => ({
          qty: Math.min(100000, Math.max(1, Math.floor(Number(i.qty)) || 1)),
          item: clean(i.item, 120), make: clean(i.make, 40), model: clean(i.model, 60), year: clean(i.year, 20),
          condition: ['new', 'used', 'any'].includes(i.condition) ? i.condition : 'any',
        })).filter((i) => i.item);
        if (!items.length) return res.status(400).json({ error: 'اكتب صنف واحد على الأقل' });
        const deposit = Math.min(100, Math.max(0, Math.round(Number(b.depositPct) || 0)));
        const requests = await getRequests();
        const request = {
          id: 'q' + Date.now(),
          number: 'CTR-' + String(Date.now()).slice(-6),
          createdAt: new Date().toISOString(),
          status: 'open',
          type: 'container',
          name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email, 120),
          company: clean(b.company, 120), country: clean(b.country, 60), city: clean(b.city, 60), port: clean(b.port, 60),
          sectors: (Array.isArray(b.sectors) ? b.sectors : []).slice(0, 12).map((x) => clean(x, 40)).filter(Boolean),
          items,
          containerPref: clean(b.containerPref, 30),
          shipMode: b.shipMode === 'air' ? 'air' : 'sea',
          depositPct: deposit,
          budget: clean(b.budget, 40),
          targetDate: clean(b.targetDate, 20),
          openToShare: b.openToShare !== false,
          notes: clean(b.notes, 800),
          partName: items.map((i) => `${i.qty} × ${i.item}${i.make ? ' ' + i.make : ''}${i.model ? ' ' + i.model : ''}${i.year ? ' ' + i.year : ''}`).join('\n'),
          source: 'container',
        };
        requests.unshift(request);
        await saveRequests(requests);
        await logActivity('request', `🧩 طلب حاوية ${request.number} من ${request.company || request.name} (${request.country || '—'}) — ${items.length} صنف، مقدم ${deposit}%`);
        return res.status(201).json(request);
      }
      // طلب عرض سعر الجملة (RFQ) بيقبل أرقام دولية، وطلب التوفير العادي بيقبل المصري
      const isRfq = wholesale === true;
      if (!name?.trim() || !phone?.trim() || !partName?.trim()) {
        return res.status(400).json({ error: 'الاسم ورقم الموبايل والأصناف المطلوبة مطلوبة' });
      }
      if (isRfq ? !validIntlPhone(phone) : !validPhone(phone)) {
        return res.status(400).json({
          error: isRfq
            ? 'رقم موبايل غير صحيح (اكتبه بكود الدولة)'
            : 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01',
        });
      }
      const requests = await getRequests();
      const request = {
        id: 'q' + Date.now(),
        number: (isRfq ? 'RFQ-' : 'REQ-') + String(Date.now()).slice(-6),
        createdAt: new Date().toISOString(),
        status: 'open', // open → sourced → done
        type: isRfq ? 'rfq' : 'part',
        name: name.trim().slice(0, 80),
        phone: phone.trim().slice(0, 20),
        company: (company || '').trim().slice(0, 120),
        country: (country || '').trim().slice(0, 60),
        email: String(email || '').trim().slice(0, 120),
        car: (car || '').trim().slice(0, 120),
        vin: (vin || '').trim().slice(0, 30),
        partName: partName.trim().slice(0, 1000),
        notes: (notes || '').trim().slice(0, 500),
        source: ['search', 'cart'].includes(source) ? source : 'form',
      };
      requests.unshift(request);
      await saveRequests(requests);
      await logActivity('request', isRfq
        ? `🌐 طلب عرض سعر جملة ${request.number} من ${request.company || request.name} (${request.country || '—'})`
        : `🔎 طلب توفير قطعة ${request.number}${request.source === 'search' ? ' (من البحث)' : ''}: "${request.partName}" من ${request.name}`);
      return res.status(201).json(request);
    }

    // التاجر المسجّل يشوف طلبات عرض السعر بتاعته (بمطابقة رقم موبايله)
    if (req.method === 'GET' && req.query.mine) {
      const session = getUser(req);
      if (!session) return res.status(401).json({ error: 'سجّل دخول الأول' });
      const users = await getUsers();
      const me = users.find((u) => u.id === session.uid);
      if (!me) return res.status(401).json({ error: 'الحساب غير موجود' });
      const requests = await getRequests();
      const mine = requests.filter((r) => r.type === 'rfq' && r.phone === me.phone);
      return res.status(200).json(mine);
    }

    if (!requireAdmin(req, res)) return;
    const requests = await getRequests();

    if (req.method === 'GET') return res.status(200).json(requests);

    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      const request = requests.find((r) => r.id === id);
      if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
      if (!['open', 'sourced', 'done', 'quoted', 'confirmed'].includes(status)) {
        return res.status(400).json({ error: 'حالة غير صحيحة' });
      }
      request.status = status;
      await saveRequests(requests);
      return res.status(200).json(request);
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      const left = requests.filter((r) => r.id !== id);
      if (left.length === requests.length) return res.status(404).json({ error: 'الطلب غير موجود' });
      await saveRequests(left);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
