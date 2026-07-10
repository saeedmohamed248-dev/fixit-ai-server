// طلبات توفير قطع غير متوفرة — العميل يسيب طلبه ونوفرهاله
// POST /api/requests → طلب جديد (عام)
// GET  /api/requests → القائمة (إدارة)
// PUT  /api/requests → تغيير الحالة (إدارة) { id, status: open|sourced|done }
import { getRequests, saveRequests, logActivity } from './_lib/db.js';
import { cors, requireAdmin } from './_lib/util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      const { name, phone, car, vin, partName, notes } = req.body || {};
      if (!name?.trim() || !phone?.trim() || !partName?.trim()) {
        return res.status(400).json({ error: 'الاسم ورقم الموبايل واسم القطعة مطلوبين' });
      }
      const requests = await getRequests();
      const request = {
        id: 'q' + Date.now(),
        number: 'REQ-' + String(Date.now()).slice(-6),
        createdAt: new Date().toISOString(),
        status: 'open', // open → sourced → done
        name: name.trim().slice(0, 80),
        phone: phone.trim().slice(0, 20),
        car: (car || '').trim().slice(0, 120),
        vin: (vin || '').trim().slice(0, 30),
        partName: partName.trim().slice(0, 200),
        notes: (notes || '').trim().slice(0, 500),
      };
      requests.unshift(request);
      await saveRequests(requests);
      await logActivity('request', `🔎 طلب توفير قطعة ${request.number}: "${request.partName}" من ${request.name}`);
      return res.status(201).json(request);
    }

    if (!requireAdmin(req, res)) return;
    const requests = await getRequests();

    if (req.method === 'GET') return res.status(200).json(requests);

    if (req.method === 'PUT') {
      const { id, status } = req.body || {};
      const request = requests.find((r) => r.id === id);
      if (!request) return res.status(404).json({ error: 'الطلب غير موجود' });
      if (!['open', 'sourced', 'done'].includes(status)) {
        return res.status(400).json({ error: 'حالة غير صحيحة' });
      }
      request.status = status;
      await saveRequests(requests);
      return res.status(200).json(request);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
