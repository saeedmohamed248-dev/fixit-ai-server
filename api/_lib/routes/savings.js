// 🧾💰 حاسبة التوفير + تسعير المقايسات
// POST /api/savings  → العميل يسجّل (اسم/موبايل/عربية) ويرفع صور فاتورة أو مقايسة،
//   البوت يقرأها (Gemini Vision — عامية/إنجليزي/بارت نمبر)، يطابقها بأسعار الموقع،
//   ويحسب التوفير (فاتورة) أو يسعّرها (مقايسة). اللي مش موجود أو البوت مش متأكد منه
//   بيتعلّم "هيتم التواصل معاك من موظف". كل طلب بيتخزن ويوصل إشعار للإدارة.
//   body: { mode:'invoice'|'quote', customer:{name,phone,car}, images:[dataURL...] }
// GET  /api/savings  → قائمة الطلبات (إدارة، requireAdmin)
import { getProducts, getSavingsLeads, saveSavingsLeads, logActivity } from '../db.js';
import { cors, rateLimit, requireAdmin, validPhone, productBrand, productSupplier } from '../util.js';
import { aiEnabled, aiJSON } from '../ai.js';
import { sendSavingsLeadEmail } from '../email.js';

// ---------- المطابقة ----------
function normCode(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function normText(s) {
  return String(s || '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[ً-ٟ]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
const STOP = new Set(['bmw', 'mini', 'امامي', 'خلفي', 'يمين', 'شمال', 'طقم', 'قطعه', 'set', 'front', 'rear', 'left', 'right']);
function tokens(s) {
  return normText(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w));
}
function itemTokens(item) {
  // ندعم الاسم كما كُتب + الاسم العربي المطبّع من البوت (عشان الإنجليزي/العامية يطابقوا كتالوجنا العربي)
  return [...new Set([...tokens(item.name), ...tokens(item.name_ar)])];
}

export function matchProduct(item, products, indexes) {
  const codes = [item.code, item.oem].map(normCode).filter((c) => c.length >= 4);
  for (const c of codes) { const hit = indexes.byCode.get(c); if (hit) return { product: hit, how: 'code' }; }
  for (const c of codes) {
    for (const [code, prod] of indexes.byCode) {
      if (code.length >= 6 && (code.includes(c) || c.includes(code))) return { product: prod, how: 'code' };
    }
  }
  const want = itemTokens(item);
  if (want.length) {
    let best = null, bestScore = 0;
    for (const prod of products) {
      const have = indexes.tokensById.get(prod.id) || [];
      if (!have.length) continue;
      const overlap = want.filter((w) => have.includes(w)).length;
      const score = overlap / Math.max(want.length, 1);
      if (overlap >= 2 && score > bestScore) { bestScore = score; best = prod; }
    }
    if (best && bestScore >= 0.5) return { product: best, how: 'name' };
  }
  return null;
}

// نطابق البنود ونصنّفها: مؤكد (بالكود) / غير متأكد (بالاسم) / غير موجود
export function compareInvoice(items, products) {
  const inStock = products.filter((p) => Number(p.stock) > 0);
  const indexes = { byCode: new Map(), tokensById: new Map() };
  for (const p of inStock) {
    if (p.sku) indexes.byCode.set(normCode(p.sku), p);
    if (p.oem) for (const o of String(p.oem).split(/[,،/]/)) {
      const c = normCode(o); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    if (Array.isArray(p.partNumbers)) for (const pn of p.partNumbers) {
      const c = normCode(pn); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    indexes.tokensById.set(p.id, tokens(p.name));
  }

  const confident = [], unsure = [], unmatched = [];
  let theirTotal = 0, ourTotal = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const theirUnit = Number(item.unit_price ?? item.unitPrice) || 0;
    const res = matchProduct(item, inStock, indexes);
    if (!res) { unmatched.push({ name: item.name || item.name_ar || '', code: item.code || '', qty, theirUnit }); continue; }
    const our = Number(res.product.price) || 0;
    const row = {
      name: item.name || res.product.name,
      code: item.code || res.product.sku || '',
      qty, theirUnit, theirLine: theirUnit * qty,
      ourUnit: our, ourLine: our * qty,
      saving: theirUnit > 0 ? (theirUnit - our) * qty : 0,
      how: res.how,
      product: {
        id: res.product.id, name: res.product.name, sku: res.product.sku || '',
        price: our, image: res.product.image || '',
        brand: productBrand(res.product), supplier: productSupplier(res.product),
      },
    };
    if (res.how === 'code') {
      confident.push(row);
      if (theirUnit > 0) { theirTotal += row.theirLine; ourTotal += row.ourLine; }
    } else {
      unsure.push(row); // مطابقة بالاسم — محتاجة تأكيد موظف
    }
  }

  const saving = theirTotal - ourTotal;
  return {
    confident, unsure, unmatched,
    totals: {
      matchedCount: confident.length,
      unsureCount: unsure.length,
      unmatchedCount: unmatched.length,
      theirTotal: Math.round(theirTotal),
      ourTotal: Math.round(ourTotal),
      saving: Math.round(saving),
      savingPct: theirTotal > 0 ? Math.round((saving / theirTotal) * 100) : 0,
    },
  };
}

// ---------- استخراج البنود بالذكاء الاصطناعي ----------
const EXTRACT_PROMPT = `أنت محلل فواتير ومقايسات قطع غيار سيارات (BMW & MINI) في مصر.
اقرأ الصورة/الصور — قد تكون فاتورة أو مقايسة أسعار، مكتوبة بالعامية المصرية أو الإنجليزية أو بأرقام القطع (part numbers)، بخط يد أو مطبوعة.
استخرج بنود القطع فقط. لكل بند:
- code: رقم القطعة/الكود لو ظاهر (وإلا "")
- oem: رقم OEM لو ظاهر (وإلا "")
- name: اسم القطعة كما هو مكتوب
- name_ar: اسم القطعة بالعربي الفصيح/الدارج المصري المعروف (ترجمة/تطبيع للمصطلح حتى لو الأصل إنجليزي أو عامية)
- qty: الكمية (رقم، افتراضي 1)
- unit_price: سعر الوحدة كرقم فقط لو موجود (وإلا 0)
أرجع JSON فقط:
{ "currency":"العملة لو ظاهرة (مثال EGP)", "items":[ { "code":"", "oem":"", "name":"", "name_ar":"", "qty":1, "unit_price":0 } ] }
تجاهل السطور اللي مش قطع (ضرائب/خصم/إجمالي/مصاريف/توقيع). لو مفيش بنود قطع أرجع items: [].`;

async function extractInvoice(media, texts) {
  const extraText = (texts && texts.length)
    ? 'محتوى ملفات إضافية (Excel/CSV/نص) رفعها العميل — عاملها زي بنود فاتورة/مقايسة:\n' + texts.join('\n----\n')
    : undefined;
  const parsed = await aiJSON(EXTRACT_PROMPT, media, { maxTokens: 2048, extraText });
  return { currency: parsed.currency || 'EGP', items: Array.isArray(parsed.items) ? parsed.items : [] };
}

// ---------- رفع الملفات لـ Cloudinary (رابط دائم عشان الإدارة تشوفها) ----------
// auto/upload بيتعامل مع الصور و PDF (والملفات التانية كـ raw) في نفس النقطة.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'gbooxyif';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'fixit_unsigned';
async function uploadDoc(dataUrl) {
  try {
    const form = new URLSearchParams();
    form.set('file', dataUrl);
    form.set('upload_preset', UPLOAD_PRESET);
    form.set('folder', 'fixit_invoices');
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`, { method: 'POST', body: form });
    const data = await r.json().catch(() => ({}));
    return data.secure_url || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  // إدارة: قائمة الطلبات
  if (req.method === 'GET') {
    if (!requireAdmin(req, res)) return;
    return res.status(200).json(await getSavingsLeads());
  }

  // إدارة: تحديد طلب كـ "تمّت المتابعة" (يشيله من عدّاد الإشعار)، أو حذفه
  if (req.method === 'PUT') {
    if (!requireAdmin(req, res)) return;
    const { id, status } = req.body || {};
    const list = await getSavingsLeads();
    const lead = list.find((l) => l.id === id);
    if (!lead) return res.status(404).json({ error: 'الطلب غير موجود' });
    lead.status = status === 'new' ? 'new' : 'handled';
    await saveSavingsLeads(list);
    return res.status(200).json({ ok: true });
  }
  if (req.method === 'DELETE') {
    if (!requireAdmin(req, res)) return;
    const list = await getSavingsLeads();
    const next = list.filter((l) => l.id !== req.query.id);
    await saveSavingsLeads(next);
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimit(req, res, 'savings', 4)) return;
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'الحاسبة غير مفعّلة مؤقتاً — جرّب لاحقاً.' });
  }

  try {
    const body = req.body || {};
    const mode = body.mode === 'quote' ? 'quote' : 'invoice';
    const customer = body.customer || {};
    const name = String(customer.name || '').trim().slice(0, 80);
    const phone = String(customer.phone || '').trim();
    const car = String(customer.car || '').trim().slice(0, 80);
    // 🔒 التسجيل إجباري قبل التحليل
    if (!name) return res.status(400).json({ error: 'اكتب اسمك الأول' });
    if (!validPhone(phone)) return res.status(400).json({ error: 'اكتب رقم موبايل صحيح (11 رقم يبدأ بـ 01)' });
    if (!car) return res.status(400).json({ error: 'اكتب نوع عربيتك (مثال: BMW F30 2016)' });

    // 📎 نقبل كل الصيغ: صور + PDF (تتبعت للبوت كمرفقات) + Excel/CSV/نص (اتحوّل لنص في المتصفح)
    let files = body.files || body.images || [];
    if (typeof files === 'string') files = [files];
    files = (Array.isArray(files) ? files : []).slice(0, 6)
      .filter((u) => typeof u === 'string'
        && /^(data:(image\/[a-z0-9.+-]+|application\/pdf);base64,|https?:\/\/)/i.test(u));
    let texts = body.texts || [];
    if (typeof texts === 'string') texts = [texts];
    texts = (Array.isArray(texts) ? texts : []).map((x) => String(x || '').slice(0, 50000)).filter(Boolean).slice(0, 6);
    if (!files.length && !texts.length) {
      return res.status(400).json({ error: 'ارفع فاتورتك/مقايستك الأول (صورة، PDF، Excel أو أي ملف)' });
    }

    // نرفع الملفات لـ Cloudinary بالتوازي (روابط دائمة للإدارة) — الفشل ما يوقفش العملية
    const imageUrls = (await Promise.all(files.map(uploadDoc))).filter(Boolean);

    const { currency, items } = await extractInvoice(files, texts);
    const result = compareInvoice(items, await getProducts());
    const needsStaff = result.unsure.length > 0 || result.unmatched.length > 0;

    // نخزّن الطلب (بيانات العميل + روابط الصور + النتيجة) — يظهر في لوحة التحكم
    const lead = {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5),
      at: new Date().toISOString(),
      mode, name, phone, car,
      imageUrls,
      textDocs: texts.length,
      currency,
      lineCount: items.length,
      confident: result.confident,
      unsure: result.unsure,
      unmatched: result.unmatched,
      totals: result.totals,
      needsStaff,
      status: 'new',
    };
    try {
      const list = await getSavingsLeads();
      list.unshift(lead);
      await saveSavingsLeads(list.slice(0, 500));
    } catch { /* التخزين ما يوقفش الرد */ }

    await logActivity('savings', `🧾 ${mode === 'quote' ? 'تسعير مقايسة' : 'حساب توفير'} — ${name} (${phone})${needsStaff ? ' · محتاج مراجعة موظف' : ''}`);
    // إشعار للإدارة بالبريد (لو Resend مضبوط) — غير معطّل للعملية
    try { await sendSavingsLeadEmail(lead, null); } catch { /* تجاهل */ }

    return res.status(200).json({
      ok: true, mode, currency,
      ...result,
      needsStaff,
      leadId: lead.id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
