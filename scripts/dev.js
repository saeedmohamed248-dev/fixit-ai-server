// سيرفر تجريبي محلي يحاكي Vercel: يشغّل الملفات الثابتة + دوال api/
// التشغيل: npm run dev ثم افتح http://localhost:3000
import http from 'http';
import { readFile } from 'fs/promises';
import { extname, join, normalize } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));
const PORT = process.env.PORT || 3000;

// قيم تجريبية للتشغيل المحلي — على Vercel لازم تضبطها من Environment Variables
if (!process.env.ADMIN_TOKEN) {
  process.env.ADMIN_TOKEN = 'admin123';
  console.log('🔐 رمز لوحة التحكم المحلي: admin123');
}
if (!process.env.SYNC_SECRET) process.env.SYNC_SECRET = 'sync123';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

// كل الـ handlers بقت في api/_lib/routes/ (نقطة دخول واحدة على Vercel)
const ROUTE_NAMES = ['products', 'orders', 'sync', 'diagnose', 'auth', 'reviews',
  'coupons', 'settings', 'activity', 'requests', 'questions', 'notify', 'pay', 'sitemap', 'maintenance', 'containers', 'estimate', 'leadtime', 'track'];
const apiHandlers = {};
for (const name of ROUTE_NAMES) {
  apiHandlers['/api/' + name] = () => import(`../api/_lib/routes/${name}.js`);
}
apiHandlers['/sitemap.xml'] = () => import('../api/_lib/routes/sitemap.js');

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');

  // محاكاة req/res بتوع Vercel
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(obj));
  };
  res.send = (body) => res.end(body);

  if (apiHandlers[url.pathname]) {
    req.query = Object.fromEntries(url.searchParams);
    req.body = await readBody(req);
    try {
      const mod = await apiHandlers[url.pathname]();
      await mod.default(req, res);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
    return;
  }

  // ملفات ثابتة
  let path = url.pathname === '/' ? '/index.html' : url.pathname;
  path = normalize(path).replace(/^(\.\.[\/\\])+/, '');
  try {
    const file = await readFile(join(root, path));
    res.setHeader('Content-Type', MIME[extname(path)] || 'application/octet-stream');
    res.end(file);
  } catch {
    res.status(404).end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`✅ الموقع شغال على        http://localhost:${PORT}`);
  console.log(`🎛️ لوحة التحكم على       http://localhost:${PORT}/admin.html`);
  console.log('⏹️ للإيقاف: اضغط Ctrl+C');
});
