// إعدادات المتجر — بتتغير من لوحة التحكم وبتنطبق على الموقع كله
// GET /api/settings → الإعدادات الحالية (عام — الموقع بيقراها)
// PUT /api/settings → تعديل (إدارة)
import { getSettings, saveSettings, logActivity } from '../db.js';
import { cors, requireAdmin } from '../util.js';

// المفاتيح المسموح تعديلها من اللوحة
const KEYS = [
  'storeName', 'accent', 'whatsapp', 'phoneDisplay',
  'instapay', 'wallet', 'freeShippingOver', 'topbarAr', 'topbarEn',
];

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await getSettings());
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const current = await getSettings();
      const body = req.body || {};
      for (const key of KEYS) {
        if (key in body) current[key] = body[key];
      }
      await saveSettings(current);
      await logActivity('settings', 'تعديل إعدادات المتجر (الاسم/الألوان/الأرقام)');
      return res.status(200).json(current);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
