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

const ROUTES = {
  products, orders, sync, diagnose, auth, reviews, coupons,
  settings, activity, requests, sitemap, questions, notify, pay,
};

export default async function handler(req, res) {
  // Vercel بيمرّر مقاطع المسار كمصفوفة في req.query.path
  const segs = req.query.path;
  const name = Array.isArray(segs) ? segs[0] : segs;
  const route = ROUTES[name];
  if (!route) {
    res.status(404).json({ error: 'المسار غير موجود' });
    return;
  }
  return route(req, res);
}
