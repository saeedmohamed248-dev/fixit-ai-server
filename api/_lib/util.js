// أدوات مشتركة بين نقاط الـ API
export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Sync-Secret');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

// حماية عمليات الإدارة: لازم ضبط ADMIN_TOKEN في إعدادات Vercel
export function requireAdmin(req, res) {
  if (!process.env.ADMIN_TOKEN) {
    res.status(503).json({ error: 'لوحة التحكم غير مفعّلة: أضِف متغير ADMIN_TOKEN في إعدادات Vercel أولاً' });
    return false;
  }
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'رمز الدخول غير صحيح' });
    return false;
  }
  return true;
}
