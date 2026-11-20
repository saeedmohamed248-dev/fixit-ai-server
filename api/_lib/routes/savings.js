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
// كلمات مالهاش وزن في المطابقة، وكلمات اتجاه لازم تتطابق لو اتكتبت، ومرادفات عامية
const NOISE = new Set(['bmw', 'mini', 'طقم', 'قطعه', 'set', 'كامل', 'جديد', 'مستعمل', 'اصلي', 'original']);
const POS_GROUPS = [['امامي', 'front', 'قدام'], ['خلفي', 'rear', 'ورا'], ['يمين', 'right'], ['شمال', 'left', 'يسار']];
const POS = new Map(POS_GROUPS.flatMap((g, i) => g.map((w) => [w, i])));
const OPPOSITE = { 0: 1, 1: 0, 2: 3, 3: 2 };
const SYN = { 'فحمات': 'تيل', 'فحمة': 'تيل', 'باد': 'تيل', 'pads': 'تيل', 'pad': 'تيل', 'جيربوكس': 'فتيس', 'gearbox': 'فتيس', 'تنشنر': 'شداد', 'tensioner': 'شداد',
  'كشاف': 'فانوس', 'headlight': 'فانوس', 'ابره': 'ابر', 'ابرة': 'ابر', 'radiator': 'رادياتير', 'طرمبه': 'طلمبه', 'طرمبة': 'طلمبه', 'طلمبة': 'طلمبه', 'مضخه': 'طلمبه', 'pump': 'طلمبه', 'ميه': 'مياه', 'مية': 'مياه', 'مايه': 'مياه', 'water': 'مياه',
  'بوجيه': 'بوجيهات', 'بوجيهات': 'بوجيهات', 'بوجي': 'بوجيهات', 'شمعات': 'بوجيهات', 'plugs': 'بوجيهات', 'موتور': 'محرك', 'engine': 'محرك', 'رادياتر': 'رادياتير', 'مساعدين': 'مساعد', 'سيور': 'سير', 'belt': 'سير' };
function tokens(s) {
  return normText(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2).map((w) => SYN[w] || w);
}
function itemTokens(item) {
  return [...new Set([...tokens(item.name), ...tokens(item.name_ar)])];
}
// أكواد الشاسيه/المحرك من كلام العميل (F30, E90, N20, X5 ...)
export function carCodes(text) {
  return [...new Set((String(text || '').toUpperCase().match(/\b([EFGR]\d{2}|X[1-7]|[NBS]\d{2})\b/g) || []))];
}
const tokHit = (w, have) => have.some((h) => h === w || (w.length >= 3 && h.length >= 3 && (h.startsWith(w) || w.startsWith(h))));

// نقيّم كل منتج قصاد البند: الكلمات الأساسية لازم تتطابق، الاتجاه لو اتكتب لازم يتطابق، وموديل العربية بيرفع الترتيب
function scoreProduct(want, prod, have, cars) {
  const core = want.filter((w) => !NOISE.has(w) && !POS.has(w) && !/^\d+$/.test(w));
  if (!core.length) return 0;
  // «بدون فتيس» = القطعة مش فتيس
  const neg = have.flatMap((h, i) => (h === 'بدون' || h === 'without') && have[i + 1] ? [have[i + 1]] : []);
  if (core.some((w) => neg.includes(w))) return 0;
  const hits = core.filter((w) => tokHit(w, have)).length;
  if (!hits || hits < Math.ceil(core.length * 0.6)) return 0;
  let score = hits / core.length;
  for (const w of want) {
    if (!POS.has(w)) continue;
    const g = POS.get(w);
    if (have.some((h) => POS.get(h) === g)) score += 0.3;
    else if (have.some((h) => POS.get(h) === OPPOSITE[g])) return 0; // كتب أمامي والمنتج خلفي
  }
  if (cars.length) {
    // كل كود مطابق (شاسيه F30 / محرك N20) بيرفع الترتيب، والمحرك أهم.
    // ولو القطعة مكتوب عليها موديل/محرك تاني غير اللي العميل كتبه → تنزل لتحت
    const txt = (prod.name + ' ' + (prod.models || []).join(' ') + ' ' + (prod.fits || []).join(' ')).toUpperCase();
    const its = carCodes(txt);
    const isEngine = (c) => /^[NBS]\d{2}$/.test(c);
    for (const kind of [isEngine, (c) => !isEngine(c)]) {
      const mine = cars.filter(kind), theirs = its.filter(kind);
      if (!mine.length || !theirs.length) continue;
      const hit = mine.some((c) => theirs.includes(c));
      score += hit ? (kind === isEngine ? 1.5 : 1) : (kind === isEngine ? -1.2 : -0.6);
    }
  }
  return score;
}

export function matchProduct(item, products, indexes, cars = []) {
  const codes = [item.code, item.oem].map(normCode).filter((c) => c.length >= 4);
  for (const c of codes) { const hit = indexes.byCode.get(c); if (hit) return { product: hit, how: 'code', options: [] }; }
  for (const c of codes) {
    for (const [code, prod] of indexes.byCode) {
      if (code.length >= 6 && (code.includes(c) || c.includes(code))) return { product: prod, how: 'code', options: [] };
    }
  }
  const want = itemTokens(item);
  if (!want.length) return null;
  const ranked = products
    .map((prod) => ({ prod, score: scoreProduct(want, prod, (indexes.tokensOf && indexes.tokensOf.get(prod)) || indexes.tokensById.get(prod.id) || [], cars) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (Number(b.prod.price) > 0) - (Number(a.prod.price) > 0));
  if (!ranked.length) return null;
  const options = ranked.slice(0, 4).map((x) => x.prod);
  return { product: ranked[0].prod, how: 'name', options };
}

// نطابق البنود ونصنّفها: مؤكد (بالكود) / غير متأكد (بالاسم) / غير موجود
export function compareInvoice(items, products, cars = []) {
  const inStock = products.filter((p) => Number(p.stock) > 0);
  const indexes = { byCode: new Map(), tokensById: new Map(), tokensOf: new Map() };
  for (const p of inStock) {
    if (p.sku) indexes.byCode.set(normCode(p.sku), p);
    if (p.oem) for (const o of String(p.oem).split(/[,،/]/)) {
      const c = normCode(o); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    if (Array.isArray(p.partNumbers)) for (const pn of p.partNumbers) {
      const c = normCode(pn); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    indexes.tokensById.set(p.id, tokens(p.name));
    indexes.tokensOf.set(p, tokens(p.name));
  }

  const confident = [], unsure = [], unmatched = [];
  let theirTotal = 0, ourTotal = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const theirUnit = Number(item.unit_price ?? item.unitPrice) || 0;
    const res = matchProduct(item, inStock, indexes, cars);
    if (!res) { unmatched.push({ name: item.name || item.name_ar || '', code: item.code || '', qty, theirUnit }); continue; }
    const our = Number(res.product.price) || 0;
    const row = {
      name: item.name || res.product.name,
      code: item.code || res.product.sku || '',
      qty, theirUnit, theirLine: theirUnit * qty,
      ourUnit: our, ourLine: our * qty,
      saving: theirUnit > 0 ? (theirUnit - our) * qty : 0,
      how: res.how,
      options: (res.options || []).map(slim),
      product: {
        id: res.product.id, name: res.product.name, sku: res.product.sku || '',
        price: our, image: res.product.image || '', warranty: res.product.warranty || '', warrantyEn: res.product.warrantyEn || '', condition: res.product.condition || '',
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

function slim(p) {
  return { id: p.id, name: p.name, sku: p.sku || '', price: Number(p.price) || 0, image: p.image || (Array.isArray(p.images) && p.images[0]) || '', warranty: p.warranty || '', warrantyEn: p.warrantyEn || '', condition: p.condition || '' };
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

async function extractInvoice(images) {
  const parsed = await aiJSON(EXTRACT_PROMPT, images, { maxTokens: 8192 });
  return { currency: parsed.currency || 'EGP', items: Array.isArray(parsed.items) ? parsed.items : [] };
}

// ---------- رفع الصور لـ Cloudinary (رابط دائم عشان الإدارة تشوفها) ----------
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'gbooxyif';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'fixit_unsigned';
async function uploadImage(dataUrl) {
  try {
    const form = new URLSearchParams();
    form.set('file', dataUrl);
    form.set('upload_preset', UPLOAD_PRESET);
    form.set('folder', 'fixit_invoices');
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
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

  // 🧭 تتبّع رحلة العميل خطوة بخطوة (حتى لو ماكمّلش) — سجل واحد لكل زيارة (sid)
  if ((req.body || {}).action === 'track') {
    if (!rateLimit(req, res, 'savings_track', 40)) return;
    try {
      const b = req.body;
      const sid = String(b.sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
      const stage = String(b.stage || '').replace(/[^a-z_]/g, '').slice(0, 20);
      const c = b.customer || {};
      const phone = String(c.phone || '').replace(/[\s-]/g, '');
      if (!sid || !stage || !validPhone(phone)) return res.status(200).json({ ok: false });
      const list = await getSavingsLeads();
      let lead = list.find((l) => l.sid === sid);
      if (!lead) {
        lead = { id: 's' + Date.now() + Math.random().toString(36).slice(2, 5), sid, at: new Date().toISOString(), partial: true, status: 'new', steps: [] };
        list.unshift(lead);
      }
      lead.name = String(c.name || lead.name || '').trim().slice(0, 80);
      lead.phone = phone;
      lead.car = String(c.car || lead.car || '').trim().slice(0, 80);
      if (b.mode) lead.mode = ['quote', 'manual', 'invoice'].includes(b.mode) ? b.mode : lead.mode;
      if (Array.isArray(b.draft)) lead.draftItems = b.draft.slice(0, 30).map((i) => ({ name: String(i.name || '').slice(0, 120), code: String(i.code || '').slice(0, 40), qty: Math.max(1, Number(i.qty) || 1), price: Math.max(0, Number(i.price) || 0) })).filter((i) => i.name || i.code);
      if (Array.isArray(b.picks)) lead.picks = b.picks.slice(0, 30).map((x) => ({ line: String(x.line || '').slice(0, 120), name: String(x.name || '').slice(0, 160), price: Number(x.price) || 0, theirs: Number(x.theirs) || 0, qty: Math.max(1, Number(x.qty) || 1) }));
      if (b.info && typeof b.info === 'object') lead.lastInfo = { total: Number(b.info.total) || 0, save: Number(b.info.save) || 0 };
      lead.steps = Array.isArray(lead.steps) ? lead.steps : [];
      const last = lead.steps[lead.steps.length - 1];
      if (!last || last.s !== stage) lead.steps.push({ s: stage, at: new Date().toISOString() });
      else last.at = new Date().toISOString();
      lead.steps = lead.steps.slice(-60);
      lead.lastStage = stage; lead.updatedAt = new Date().toISOString();
      if (['cart', 'order', 'whatsapp'].includes(stage)) lead.status = lead.status === 'handled' ? 'handled' : 'new';
      await saveSavingsLeads(list.slice(0, 800));
      return res.status(200).json({ ok: true });
    } catch { return res.status(200).json({ ok: false }); }
  }

  if (!rateLimit(req, res, 'savings', 4)) return;
  const isManual = (req.body || {}).mode === 'manual';
  if (!isManual && !aiEnabled()) {
    return res.status(503).json({ error: 'الحاسبة غير مفعّلة مؤقتاً — جرّب لاحقاً.' });
  }

  try {
    const body = req.body || {};
    const mode = body.mode === 'quote' ? 'quote' : body.mode === 'manual' ? 'manual' : 'invoice';
    const customer = body.customer || {};
    const name = String(customer.name || '').trim().slice(0, 80);
    const phone = String(customer.phone || '').trim();
    const car = String(customer.car || '').trim().slice(0, 80);
    // 🔒 التسجيل إجباري قبل التحليل
    if (!name) return res.status(400).json({ error: 'اكتب اسمك الأول' });
    if (!validPhone(phone)) return res.status(400).json({ error: 'اكتب رقم موبايل صحيح (11 رقم يبدأ بـ 01)' });
    if (!car) return res.status(400).json({ error: 'اكتب نوع عربيتك (مثال: BMW F30 2016)' });

    const cd = customer.carDetails || {};
    const carDetails = {
      model: String(cd.model || '').trim().slice(0, 60),
      year: String(cd.year || '').replace(/\D/g, '').slice(0, 4),
      engine: String(cd.engine || '').trim().slice(0, 30),
      vin: String(cd.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17),
    };

    // ✍️ العميل كتب القطع بإيده — من غير صور ولا ذكاء اصطناعي
    let manualItems = null;
    if (mode === 'manual') {
      manualItems = (Array.isArray(body.items) ? body.items : []).slice(0, 30).map((i) => ({
        name: String(i.name || '').trim().slice(0, 120),
        code: String(i.code || '').trim().slice(0, 40),
        oem: '',
        qty: Math.min(99, Math.max(1, Number(i.qty) || 1)),
        unit_price: Math.max(0, Number(i.unit_price) || 0),
      })).filter((i) => i.name || i.code.length >= 4);
      if (!manualItems.length) return res.status(400).json({ error: 'اكتب قطعة واحدة على الأقل (الاسم أو رقم القطعة)' });
    }

    let images = manualItems ? [] : body.images;
    if (typeof images === 'string') images = [images];
    if (!manualItems && (!Array.isArray(images) || !images.length)) return res.status(400).json({ error: 'ارفع صورة الفاتورة/المقايسة الأول' });
    images = images.slice(0, 4).filter((u) => typeof u === 'string' && /^(data:image\/|https?:\/\/)/i.test(u));
    if (!manualItems && !images.length) return res.status(400).json({ error: 'صيغة الصورة غير مدعومة — ارفع صورة (JPG/PNG)' });

    // نرفع الصور لـ Cloudinary بالتوازي (روابط دائمة للإدارة) — الفشل ما يوقفش العملية
    const imageUrls = (await Promise.all(images.map(uploadImage))).filter(Boolean);

    const { currency, items } = manualItems ? { currency: 'EGP', items: manualItems } : await extractInvoice(images);
    const result = compareInvoice(items, await getProducts(), carCodes([car, carDetails.model, carDetails.engine].join(' ')));
    const needsStaff = result.unsure.length > 0 || result.unmatched.length > 0;

    // نخزّن الطلب (بيانات العميل + روابط الصور + النتيجة) — يظهر في لوحة التحكم
    const lead = {
      id: 's' + Date.now() + Math.random().toString(36).slice(2, 5),
      at: new Date().toISOString(),
      mode, name, phone, car, carDetails,
      manualItems: manualItems || undefined,
      imageUrls,
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
      // لو الزيارة دي ليها سجل رحلة (sid) → نكمّل عليه بدل سجل جديد
      const sid = String(body.sid || '').replace(/[^a-z0-9]/gi, '').slice(0, 40);
      const prev = sid ? list.find((l) => l.sid === sid) : null;
      if (prev) {
        const steps = (prev.steps || []).concat([{ s: 'analyzed', at: new Date().toISOString() }]).slice(-60);
        Object.assign(prev, lead, { id: prev.id, at: prev.at, sid, partial: false, steps, lastStage: 'analyzed', updatedAt: new Date().toISOString(), status: prev.status === 'handled' ? 'handled' : 'new', runs: (prev.runs || 1) + (prev.partial ? 0 : 1) });
        lead.id = prev.id;
      } else {
        list.unshift({ ...lead, sid: sid || undefined, steps: [{ s: 'analyzed', at: lead.at }], lastStage: 'analyzed' });
      }
      await saveSavingsLeads(list.slice(0, 800));
    } catch { /* التخزين ما يوقفش الرد */ }

    await logActivity('savings', `🧾 ${mode === 'quote' ? 'تسعير مقايسة' : mode === 'manual' ? 'قطع مكتوبة يدوي' : 'حساب توفير'} — ${name} (${phone})${needsStaff ? ' · محتاج مراجعة موظف' : ''}`);
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
