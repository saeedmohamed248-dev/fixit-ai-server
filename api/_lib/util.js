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

// رقم موبايل دولي صحيح (لتجار الجملة: الإمارات/روسيا/أي بلد) — 7 لـ 15 رقم مع + اختيارية
export function validIntlPhone(phone) {
  return /^\+?\d{7,15}$/.test(String(phone || '').replace(/[\s-]/g, ''));
}

// 🗂️ استنتاج فئة المنتج من اسمه — موس تك بيبعت المنتجات من غير فئة، فبنصنّفها
//    هنا بمصطلحات قطع الغيار المصرية عشان المتجر يتنظّم زي المواقع العالمية.
//    الترتيب مهم: الأخص أولاً (مثال "شجرة مياه" تروح تبريد قبل عفشة).
const CATEGORY_RULES = [
  ['فرامل', ['تيل', 'فرامل', 'دسك', 'ديسك', 'هوب', 'قماش', 'كاليبر']],
  ['تبريد', ['كولر', 'ريداتير', 'رادياتير', 'راديتير', 'انتركولر', 'مروحه', 'قربه', 'قرب', 'كوع', 'ثرموست', 'خرطوم', 'تكييف', 'فريون', 'مكثف', 'كباس', 'مياه', 'دباب']],
  ['وقود', ['بنزين', 'رشاش', 'انجكتور', 'بخاخ', 'خزان وقود', 'مضخه وقود', 'هاي برشر']],
  ['عفشة وتعليق', ['مساعد', 'مقص', 'بيضه', 'تيش', 'ميزان', 'جلب', 'قاعده', 'قواعد', 'طنابير', 'طنبور', 'شداد', 'بارات', 'بليه', 'بلي', 'كرسي', 'رمان', 'عفشه', 'بطاح', 'كرداني', 'شجره', 'صره', 'طبه هوك']],
  ['كهرباء وإشعال', ['دينامو', 'مارش', 'حساس', 'فيشه', 'فيش', 'بوجيه', 'كويل', 'بطاريه', 'كلاكس', 'بوق', 'ريلاي', 'فحمات', 'ماطور', 'علامه', 'اسطبات', 'لمبه', 'نور', 'مساحات', 'كنترول', 'موبينه']],
  ['محرك', ['جوان', 'تيربو', 'فالف', 'بستم', 'شنبر', 'سلندر', 'كاتينه', 'صمام', 'كامات', 'كرتير', 'صباب', 'بلف', 'دبريا', 'ديبريا', 'كلتش', 'فولان', 'سايكلون', 'مجمع هواء', 'تقسيم', 'فلانشه', 'كردان']],
  ['فلاتر وصيانة', ['فلتر', 'اويل', 'زيت', 'سير', 'شمعات', 'صيانه']],
  ['هيكل وإكسسوارات', ['غطاء', 'غطا', 'زجاج', 'مرايا', 'مرايه', 'شكمان', 'اكصدام', 'صدام', 'صداد', 'رفرف', 'كبوت', 'باب', 'شمعه', 'مقبض', 'مسمار', 'مصفحه', 'دواسه', 'طبلون', 'جنط', 'كاوتش', 'فانوس', 'مساحه']],
];
// توحيد الحروف عشان المطابقة تعدّي على اختلافات الإملاء (أ/إ/آ→ا، ة→ه، ى→ي)
function _normAr(s) {
  return String(s || '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
}
const _NORM_RULES = CATEGORY_RULES.map(([cat, kws]) => [cat, kws.map(_normAr)]);

export function inferCategory(name) {
  const n = _normAr(name);
  for (const [cat, kws] of _NORM_RULES) {
    for (const kw of kws) if (n.includes(kw)) return cat;
  }
  return 'أخرى';
}

// الفئات القياسية اللي بيعرفها المتجر (لو الفئة المخزّنة مش منها بنعيد استنتاجها)
export const KNOWN_CATEGORIES = new Set([
  'فرامل', 'فلاتر وصيانة', 'عفشة وتعليق', 'كهرباء وإشعال',
  'تبريد', 'وقود', 'محرك', 'هيكل وإكسسوارات', 'أخرى',
]);

// فئة المنتج النهائية: نستخدم المخزّنة لو فئة معروفة حقيقية، وإلا نستنتجها من الاسم.
export function productCategory(p) {
  const c = p && p.category;
  if (c && c !== 'أخرى' && KNOWN_CATEGORIES.has(c)) return c;
  return inferCategory(p && p.name);
}

// 🚗 استنتاج نوع العربية (BMW/MINI) من الاسم/الموديلات.
//    موس تك بيحط في حقل brand اسم المورّد/الصانع (AYD, BOSCH, LEMFORDER...) مش
//    نوع العربية، فبنستنتج النوع من أكواد الشاسيه وكلمات ميني عشان فلتر
//    BMW/MINI يشتغل صح. (ميني(?!وم) عشان "ألومنيوم" ماتتحسبش ميني).
const _MINI_RE = /(\bMINI\b|ميني(?!وم)|كوبر|\bR5[0-9]\b|\bR6[01]\b|\bF5[4-7]\b|\bF60\b|\bN1[2468]\b)/i;
export function inferCarMake(name, models) {
  const hay = String(name || '') + ' ' + (Array.isArray(models) ? models.join(' ') : '');
  return _MINI_RE.test(hay) ? 'MINI' : 'BMW';
}

// "BMW"/"MINI" هي القيمة الافتراضية في موس تك فمابنعتبرهاش اسم مورّد.
const _CARMAKE_PLACEHOLDER = /^(bmw|mini|mini\s*bmw)$/i;

// اسم الصانع/المورّد (اللي موس تك بيبعته في brand) — نعرضه زي المواقع العالمية.
export function productSupplier(p) {
  if (p && p.supplier) return p.supplier;
  const raw = String((p && p.brand) || '').trim();
  return _CARMAKE_PLACEHOLDER.test(raw) ? '' : raw;
}

// نوع العربية النهائي للفلترة/الشارة: نحترم MINI لو متسجّلة صراحة، وإلا نستنتج من الاسم.
export function productBrand(p) {
  const raw = String((p && p.brand) || '').trim();
  if (/^mini$/i.test(raw)) return 'MINI';
  return inferCarMake(p && p.name, p && p.models);
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
