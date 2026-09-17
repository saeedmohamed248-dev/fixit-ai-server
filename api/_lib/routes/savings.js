// 🧾💰 حاسبة التوفير — العميل يرفع صورة فاتورته، والبوت يقرأ البنود بالذكاء
//    الاصطناعي (OpenAI Vision)، يطابقها بأسعار الموقع، ويحسب كان هيوفّر كام مع فيكس إت.
// POST /api/savings  { images: ["data:image/...;base64,..."] }  (عام — بحد أقصى للطلبات)
//   يرجّع: { currency, lineItems:[...], matched:[...], unmatched:[...], totals:{...} }
import { getProducts } from '../db.js';
import { cors, rateLimit, productBrand, productSupplier } from '../util.js';
import { aiEnabled, aiJSON } from '../ai.js';

// توحيد أكواد القطع للمطابقة: حروف/أرقام كبيرة بدون أي فواصل
function normCode(s) {
  return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}
// توحيد النص العربي/اللاتيني للمطابقة بالاسم
function normText(s) {
  return String(s || '')
    .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/[ً-ٟ]/g, '')       // تشكيل
    .toLowerCase().replace(/\s+/g, ' ').trim();
}
const STOP = new Set(['bmw', 'mini', 'امامي', 'خلفي', 'يمين', 'شمال', 'طقم', 'قطعه', 'set', 'front', 'rear']);
function tokens(s) {
  return normText(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w));
}

// 🔎 نطابق بند الفاتورة بأقرب منتج على الموقع: بالكود (SKU/OEM) الأول، وإلا بالاسم.
export function matchProduct(item, products, indexes) {
  const codes = [item.code, item.oem].map(normCode).filter((c) => c.length >= 4);
  for (const c of codes) {
    const hit = indexes.byCode.get(c);
    if (hit) return { product: hit, how: 'code' };
  }
  // مطابقة جزئية بالكود (كود الفاتورة ممكن يكون جزء من SKU أو العكس)
  for (const c of codes) {
    for (const [code, prod] of indexes.byCode) {
      if (code.length >= 6 && (code.includes(c) || c.includes(code))) return { product: prod, how: 'code' };
    }
  }
  // مطابقة بالاسم: أعلى تداخل في الكلمات المميزة
  const want = tokens(item.name);
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

// 🧮 نطابق كل بنود الفاتورة ونحسب الفرق
export function compareInvoice(items, products) {
  const inStock = products.filter((p) => Number(p.stock) > 0);
  const indexes = { byCode: new Map(), tokensById: new Map() };
  for (const p of inStock) {
    if (p.sku) indexes.byCode.set(normCode(p.sku), p);
    if (p.oem) for (const o of String(p.oem).split(/[,،/]/)) {
      const c = normCode(o); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    // 🔢 كل أرقام البارت البديلة لنفس القطعة (لو موس تك بعتها) — تحسّن المطابقة
    if (Array.isArray(p.partNumbers)) for (const pn of p.partNumbers) {
      const c = normCode(pn); if (c.length >= 4 && !indexes.byCode.has(c)) indexes.byCode.set(c, p);
    }
    indexes.tokensById.set(p.id, tokens(p.name));
  }

  const matched = [], unmatched = [];
  let theirMatchedTotal = 0, ourMatchedTotal = 0;
  for (const item of items) {
    const qty = Math.max(1, Number(item.qty) || 1);
    const theirUnit = Number(item.unit_price ?? item.unitPrice) || 0;
    const res = matchProduct(item, inStock, indexes);
    if (res && theirUnit > 0) {
      const our = Number(res.product.price) || 0;
      const theirLine = theirUnit * qty, ourLine = our * qty;
      theirMatchedTotal += theirLine; ourMatchedTotal += ourLine;
      matched.push({
        name: item.name || res.product.name,
        code: item.code || res.product.sku || '',
        qty,
        theirUnit, theirLine,
        ourUnit: our, ourLine,
        saving: theirLine - ourLine,
        how: res.how,
        product: {
          id: res.product.id, name: res.product.name, sku: res.product.sku || '',
          price: our, image: res.product.image || '',
          brand: productBrand(res.product), supplier: productSupplier(res.product),
        },
      });
    } else {
      unmatched.push({ name: item.name || '', code: item.code || '', qty, theirUnit });
    }
  }

  const saving = theirMatchedTotal - ourMatchedTotal;
  const savingPct = theirMatchedTotal > 0 ? Math.round((saving / theirMatchedTotal) * 100) : 0;
  return {
    lineItems: items.length,
    matched, unmatched,
    totals: {
      matchedCount: matched.length,
      unmatchedCount: unmatched.length,
      theirTotal: Math.round(theirMatchedTotal),
      ourTotal: Math.round(ourMatchedTotal),
      saving: Math.round(saving),
      savingPct,
    },
  };
}

const EXTRACT_PROMPT = `أنت محلل فواتير قطع غيار سيارات. من صورة/صور الفاتورة، استخرج بنود القطع فقط.
لكل بند: رقم القطعة (part number/كود لو ظاهر)، رقم OEM لو ظاهر، اسم القطعة كما هو، الكمية، وسعر الوحدة (رقم فقط).
أرجع JSON بالشكل ده فقط بدون أي كلام:
{
  "currency": "العملة لو ظاهرة (مثال: EGP)",
  "items": [
    { "code": "رقم القطعة أو ''", "oem": "رقم OEM أو ''", "name": "اسم القطعة", "qty": 1, "unit_price": 0 }
  ]
}
قواعد: تجاهل أي سطور مش قطع (ضرائب، خصومات، إجمالي، مصاريف). سعر الوحدة رقم من غير عملة. لو مفيش بنود قطع أرجع items: [].`;

async function extractInvoice(images) {
  const parsed = await aiJSON(EXTRACT_PROMPT, images, { maxTokens: 2048 });
  return { currency: parsed.currency || 'EGP', items: Array.isArray(parsed.items) ? parsed.items : [] };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // حد أقصى للطلبات (البوت بيستهلك رصيد OpenAI): 4 محاولات في الدقيقة لكل IP
  if (!rateLimit(req, res, 'savings', 4)) return;
  if (!aiEnabled()) {
    return res.status(503).json({ error: 'الحاسبة غير مفعّلة: أضِف GEMINI_API_KEY في إعدادات Vercel' });
  }

  try {
    let { images } = req.body || {};
    if (typeof images === 'string') images = [images];
    if (!Array.isArray(images) || !images.length) {
      return res.status(400).json({ error: 'ارفع صورة الفاتورة الأول' });
    }
    // نقبل حتى 4 صور (فاتورة متعددة الصفحات) ونتأكد إنها صور data URL أو روابط
    images = images.slice(0, 4).filter((u) => typeof u === 'string' && /^(data:image\/|https?:\/\/)/i.test(u));
    if (!images.length) return res.status(400).json({ error: 'صيغة الصورة غير مدعومة — ارفع صورة (JPG/PNG)' });

    const { currency, items } = await extractInvoice(images);
    if (!items.length) {
      return res.status(200).json({ currency, ...compareInvoice([], []), note: 'no_items' });
    }
    const products = await getProducts();
    const result = compareInvoice(items, products);
    return res.status(200).json({ currency, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
