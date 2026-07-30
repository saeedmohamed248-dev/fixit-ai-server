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

// حماية من السبام: حد أقصى للمحاولات لكل IP في الدقيقة
const hits = new Map();
export function rateLimit(req, res, key, max = 8, windowMs = 60000) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || '?';
  const bucket = key + ':' + ip;
  const now = Date.now();
  const times = (hits.get(bucket) || []).filter((t) => now - t < windowMs);
  times.push(now);
  hits.set(bucket, times);
  if (hits.size > 5000) hits.clear(); // تنظيف دوري
  if (times.length > max) {
    res.status(429).json({ error: 'محاولات كتير ورا بعض — استنى دقيقة وحاول تاني' });
    return false;
  }
  return true;
}

// رقم موبايل مصري صحيح (01 + 9 أرقام)
export function validPhone(phone) {
  return /^01\d{9}$/.test(String(phone || '').replace(/[\s-]/g, ''));
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
