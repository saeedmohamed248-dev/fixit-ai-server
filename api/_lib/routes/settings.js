// إعدادات المتجر — بتتغير من لوحة التحكم وبتنطبق على الموقع كله
// GET /api/settings → الإعدادات الحالية (عام — الموقع بيقراها)
// PUT /api/settings → تعديل (إدارة)
import { getSettings, saveSettings, logActivity } from '../db.js';
import { cors, requireAdmin } from '../util.js';

// المفاتيح المسموح تعديلها من اللوحة
const KEYS = [
  'storeName', 'accent', 'whatsapp', 'phoneDisplay',
  'instapay', 'wallet', 'depositPct', 'depositMin', 'freeShippingOver', 'topbarAr', 'topbarEn', 'metaPixel', 'gaId', 'heroProducts',
  'freeShipOff', 'freeShipOffUntil', 'depositOff', 'depositOffUntil',
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
      if ('gaId' in body) current.gaId = String(body.gaId || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
      if ('metaPixel' in body) current.metaPixel = String(body.metaPixel || '').replace(/\D/g, '').slice(0, 20);
      if ('heroProducts' in body) current.heroProducts = (Array.isArray(body.heroProducts) ? body.heroProducts : []).map(String).slice(0, 6);
      for (const k of ['freeShipOff', 'depositOff']) if (k in body) current[k] = body[k] === true || body[k] === 'true';
      for (const k of ['freeShipOffUntil', 'depositOffUntil']) if (k in body) current[k] = /^\d{4}-\d{2}-\d{2}$/.test(body[k] || '') ? body[k] : '';
      await saveSettings(current);
      await logActivity('settings', 'تعديل إعدادات المتجر (الاسم/الألوان/الأرقام)');
      return res.status(200).json(current);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
