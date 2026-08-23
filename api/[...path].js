// 🔀 نقطة دخول موحّدة لكل الـ APIs
// على خطة Vercel المجانية مسموح بـ 12 وظيفة فقط لكل نشر — فبنجمّع كل
// المسارات في وظيفة واحدة (catch-all) بدل ملف منفصل لكل مسار.
// المسارات تفضل نفسها بالظبط: /api/products، /api/orders ... إلخ.
import products from './_lib/routes/products.js';
import orders from './_lib/routes/orders.js';
import sync from './_lib/routes/sync.js';
import diagnose from './_lib/routes/diagnose.js';
import auth from './_lib/routes/auth.js';
import reviews from './_lib/routes/reviews.js';
import coupons from './_lib/routes/coupons.js';
import settings from './_lib/routes/settings.js';
import activity from './_lib/routes/activity.js';
import requests from './_lib/routes/requests.js';
import sitemap from './_lib/routes/sitemap.js';
import questions from './_lib/routes/questions.js';
import notify from './_lib/routes/notify.js';
import pay from './_lib/routes/pay.js';
import maintenance from './_lib/routes/maintenance.js';
import containers from './_lib/routes/containers.js';

const ROUTES = {
  products, orders, sync, diagnose, auth, reviews, coupons,
  settings, activity, requests, sitemap, questions, notify, pay, maintenance, containers,
};

export default async function handler(req, res) {
  // نحدد اسم المسار: نجرّب req.query.path (مصفوفة أو نص)، ولو مش متاح
  // نستخرجه من رابط الطلب مباشرة (أضمن طريقة على كل البيئات)
  let name;
  const segs = req.query && req.query.path;
  if (Array.isArray(segs)) name = segs[0];
  else if (typeof segs === 'string' && segs) name = segs;
  if (!name) {
    const pathname = (req.url || '').split('?')[0];
    name = pathname
      .replace(/^\/+/, '')       // شيل السلاش من الأول
      .replace(/^api\//, '')     // شيل بادئة api/
      .split('/')[0]             // أول مقطع
      .replace(/\.xml$/, '');    // sitemap.xml → sitemap
  }
  const route = ROUTES[name];
  if (!route) {
    res.status(404).json({ error: 'المسار غير موجود: ' + name });
    return;
  }
  return route(req, res);
}
