// 📈 تتبّع الزيارات والنقرات — بيانات مجمّعة بدون أي بيانات شخصية
// POST /api/track  { t:'view'|'event', path?, pid?, pname?, ev?, nv? }  (عام)
// GET  /api/track  → التحليلات المجمّعة (إدارة)
// DELETE /api/track → تصفير التحليلات (إدارة)
import { getAnalytics, saveAnalytics } from '../db.js';
import { cors, requireAdmin, rateLimit } from '../util.js';

const today = () => new Date().toISOString().slice(0, 10);
const clean = (s, n) => String(s || '').slice(0, n);

// نحافظ على آخر 60 يوم فقط
function trimDays(days) {
  const keys = Object.keys(days).sort();
  while (keys.length > 60) delete days[keys.shift()];
}
// نحافظ على أعلى 300 صفحة/منتج عشان الحجم ما يكبرش
function trimMap(map, max = 300) {
  const keys = Object.keys(map);
  if (keys.length <= max) return;
  const sorted = keys.sort((a, b) => (map[b].views || map[b]) - (map[a].views || map[a]));
  sorted.slice(max).forEach((k) => delete map[k]);
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'track', 150)) return;
      const a = await getAnalytics();
      const b = req.body || {};
      const d = today();
      a.days[d] = a.days[d] || { views: 0, visitors: 0 };

      if (b.t === 'event') {
        const ev = clean(b.ev, 30);
        if (ev) { a.events = a.events || {}; a.events[ev] = (a.events[ev] || 0) + 1; }
      } else {
        // زيارة صفحة
        a.totalViews = (a.totalViews || 0) + 1;
        a.days[d].views += 1;
        if (b.nv) { a.totalVisitors = (a.totalVisitors || 0) + 1; a.days[d].visitors += 1; }
        const path = clean(b.path, 80).split('?')[0] || '/';
        a.pages[path] = (a.pages[path] || 0) + 1;
        if (b.pid) {
          const pid = clean(b.pid, 40);
          a.products[pid] = a.products[pid] || { views: 0, name: '' };
          a.products[pid].views += 1;
          if (b.pname) a.products[pid].name = clean(b.pname, 120);
        }
      }
      trimDays(a.days);
      trimMap(a.pages, 300);
      trimMap(a.products, 300);
      await saveAnalytics(a);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      return res.status(200).json(await getAnalytics());
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      await saveAnalytics({ totalViews: 0, totalVisitors: 0, days: {}, pages: {}, products: {}, events: {} });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
