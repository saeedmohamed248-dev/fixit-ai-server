// نقطة مزامنة المخزون مع الأنظمة الخارجية (شوبيفاي / موس تك / أي نظام تاني)
// الفكرة: لو قطعة اتباعت في النظام التاني، النظام ده يبعت إشعار هنا فيتخصم المخزون تلقائياً.
//
// GET  /api/sync?secret=XXX  → قائمة المخزون الحالي (SKU + الكمية + السعر + الفروع) للسحب من النظام الخارجي
// POST /api/sync?secret=XXX  → خصم مخزون. يقبل شكلين:
//    1) بسيط:            { "sku": "BP-123", "quantity": 1 }
//    2) Shopify webhook:  { "line_items": [ { "sku": "BP-123", "quantity": 1 }, ... ] }
//       (اربط webhook "orders/create" من شوبيفاي على الرابط ده مع ?secret=)
//
// 🏬 موس تك بيبعت كمان توزيع المخزون على الفروع (branches) + الفرع الافتراضي
//    للشحن (originBranch...) عشان الموقع يعرف القطعة بتتشحن منين ويحسب الشحن.
//
// لازم ضبط متغير SYNC_SECRET في إعدادات Vercel قبل الاستخدام.
import { getProducts, saveProducts, logActivity } from '../db.js';
import { cors, productCategory, productBrand, productSupplier } from '../util.js';

function checkSecret(req, res) {
  if (!process.env.SYNC_SECRET) {
    res.status(503).json({ error: 'المزامنة غير مفعّلة: أضِف متغير SYNC_SECRET في إعدادات Vercel' });
    return false;
  }
  const provided = req.headers['x-sync-secret'] || req.query.secret;
  if (provided !== process.env.SYNC_SECRET) {
    res.status(401).json({ error: 'رمز المزامنة غير صحيح' });
    return false;
  }
  return true;
}

// 🏬 تطبيع بيانات الفروع الجاية من موس تك على المنتج (توزيع المخزون + فرع الشحن)
function applyBranchFields(target, item, existing = {}) {
  if (Array.isArray(item.branches)) target.branches = item.branches;
  else if (target.branches === undefined) target.branches = existing.branches || [];

  if (item.originBranchId !== undefined && item.originBranchId !== null) {
    target.originBranchId = item.originBranchId;
  } else if (target.originBranchId === undefined) {
    target.originBranchId = existing.originBranchId ?? null;
  }

  if (item.originBranch) target.originBranch = item.originBranch;
  else if (target.originBranch === undefined) target.originBranch = existing.originBranch || '';

  if (item.originLocation) target.originLocation = item.originLocation;
  else if (target.originLocation === undefined) target.originLocation = existing.originLocation || '';

  return target;
}

// 🖼️ نسخ صورة المنتج إلى Cloudinary (رابط دائم)
// موس تك بيبعت رابط صورة إما مؤقّت (S3 موقّع بينتهي بعد ساعة) أو محلي (نسبي) —
// الاتنين بيكسروا الصورة على الموقع بعد شوية. الحل: أول ما توصل الصورة، الموقع
// بينسخها لـ Cloudinary (unsigned preset) ويستخدم الرابط الدائم اللي مايكسرش.
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'gbooxyif';
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'fixit_unsigned';
const _stripQuery = (u) => (u || '').split('?')[0];

async function rehostImage(imageUrl) {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return null;
  if (/res\.cloudinary\.com/i.test(imageUrl)) return imageUrl; // دائم بالفعل
  try {
    const form = new URLSearchParams();
    form.set('file', imageUrl);          // Cloudinary بيجيب الصورة من الرابط ده
    form.set('upload_preset', UPLOAD_PRESET);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: form,
    });
    const data = await r.json().catch(() => ({}));
    return data.secure_url || null;
  } catch {
    return null; // فشل النسخ → نسيب الرابط الأصلي (المزامنة ما تتكسرش)
  }
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (!checkSecret(req, res)) return;

  try {
    const products = await getProducts();

    if (req.method === 'GET') {
      const inventory = products.map((p) => ({
        sku: p.sku, name: p.name, stock: p.stock, price: p.price, condition: p.condition,
        // 🏬 من أي فرع بتتشحن القطعة + توزيع المخزون على الفروع
        branches: p.branches || [],
        originBranchId: p.originBranchId ?? null,
        originBranch: p.originBranch || '',
        originLocation: p.originLocation || '',
      }));
      return res.status(200).json(inventory);
    }

    if (req.method === 'POST') {
      const body = req.body || {};

      // ✨ مزامنة كاملة من Mouss Tec: إنشاء/تحديث منتجات بالكامل حسب الـ SKU
      // { action: "upsert", items: [{ sku, name, brand, condition, price, stock, models, oem, branches, originBranch... }] }
      if (body.action === 'upsert' && Array.isArray(body.items)) {
        let created = 0, updated = 0;
        // 🖼️ انسخ أي صورة جديدة/متغيّرة إلى Cloudinary بالتوازي قبل الحفظ — عشان
        //    نستخدم رابط دائم. لو الصورة نفس المصدر اللي اتنسخ قبل كده بنسيبها.
        const resolvedImages = await Promise.all(body.items.map(async (item) => {
          if (!item || !item.image) return null;
          const ex = products.find((p) => p.sku === item.sku);
          if (ex?.imageSource && _stripQuery(item.image) === ex.imageSource && ex.image) {
            return ex.image; // نفس الصورة المنسوخة قبل كده
          }
          return (await rehostImage(item.image)) || ex?.image || item.image;
        }));
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          if (!item.sku || !item.name) continue;
          const existing = products.find((p) => p.sku === item.sku);
          const fields = {
            name: item.name,
            nameEn: item.nameEn || existing?.nameEn || '',
            // 🚗 موس تك بيبعت اسم المورّد في brand — نخزّنه كـ supplier ونحسب نوع
            //    العربية (BMW/MINI) من الاسم/الموديلات عشان الفلتر يشتغل صح.
            supplier: productSupplier({ brand: item.brand, supplier: item.supplier }),
            condition: item.condition === 'used' ? 'used' : 'new',
            price: Number(item.price) || 0,
            oldPrice: Number(item.oldPrice) || existing?.oldPrice || 0,
            stock: Math.max(0, Number(item.stock) || 0),
            models: Array.isArray(item.models) ? item.models : existing?.models || [],
            oem: item.oem || existing?.oem || '',
            image: resolvedImages[i] || existing?.image || '',
            // نخزّن مصدر الصورة (بدون التوقيع المؤقّت) عشان نعرف نتخطّاها لو متغيّرتش
            imageSource: item.image ? _stripQuery(item.image) : (existing?.imageSource || ''),
            description: item.description || existing?.description || '',
          };
          // 🗂️ فئة المنتج: نستخدم اللي موس تك بعتها لو معروفة، وإلا نستنتجها من الاسم
          //    عشان المتجر يتنظّم في فئات بدل "أخرى".
          fields.category = productCategory({ category: item.category, name: fields.name });
          // 🚗 نوع العربية (بيعتمد على الاسم والموديلات)
          fields.brand = productBrand({ brand: item.brand, name: fields.name, models: fields.models });
          // 🏬 توزيع الفروع + الفرع الافتراضي للشحن
          applyBranchFields(fields, item, existing || {});
          if (existing) { Object.assign(existing, fields); updated++; }
          else {
            products.push({
              id: 'p' + Date.now() + Math.random().toString(36).slice(2, 5),
              sku: item.sku, images: [], sold: 0, ratingAvg: 0, ratingCount: 0,
              descriptionEn: '', ...fields,
            });
            created++;
          }
        }
        await saveProducts(products);
        await logActivity('sync', `🔄 مزامنة موس تك: تحديث ${updated} وإضافة ${created} منتج`);
        return res.status(200).json({ ok: true, created, updated });
      }

      // ✨ تحديث مخزون مطلق (القيمة النهائية مش خصم): { action: "set", items: [{ sku, stock, price?, branches?, originBranch? }] }
      if (body.action === 'set' && Array.isArray(body.items)) {
        const updated = [];
        for (const item of body.items) {
          const product = products.find((p) => p.sku === item.sku);
          if (!product) continue;
          product.stock = Math.max(0, Number(item.stock) || 0);
          if (item.price) product.price = Number(item.price);
          // 🏬 حدّث توزيع الفروع لو موس تك بعته (المخزون ممكن يكون اتنقل بين الفروع)
          applyBranchFields(product, item, product);
          updated.push({ sku: product.sku, stock: product.stock });
        }
        await saveProducts(products);
        if (updated.length) {
          await logActivity('sync', `🔄 موس تك حدّث مخزون ${updated.length} قطعة`);
        }
        return res.status(200).json({ ok: true, updated });
      }

      // 🧹 تنضيف: الموقع يطابق موس تك بالظبط. { action: "prune", skus: [ ...كل SKU نشط في موس تك ] }
      //    بيحذف أي منتج ليه sku مش موجود في القائمة (زي المنتجات التجريبية أو القديمة).
      //    المنتجات من غير sku (اللي اتعملت على الموقع مباشرة) بتتساب زي ما هي.
      if (body.action === 'prune' && Array.isArray(body.skus)) {
        const keep = new Set(body.skus.filter(Boolean).map(String));
        let removed = 0;
        const kept = products.filter((p) => {
          if (p.sku && !keep.has(String(p.sku))) { removed++; return false; }
          return true;
        });
        await saveProducts(kept);
        if (removed) {
          await logActivity('sync', `🧹 تنضيف موس تك: حذف ${removed} منتج مش موجود في المخزون`);
        }
        return res.status(200).json({ ok: true, removed, kept: kept.length });
      }

      // ندعم الشكل البسيط وشكل Shopify order webhook
      const lines = Array.isArray(body.line_items)
        ? body.line_items
        : body.sku
          ? [{ sku: body.sku, quantity: body.quantity || 1 }]
          : [];

      if (lines.length === 0) {
        return res.status(400).json({ error: 'أرسل sku و quantity أو line_items' });
      }

      const updated = [];
      const notFound = [];
      for (const line of lines) {
        if (!line.sku) continue;
        const product = products.find((p) => p.sku === line.sku);
        if (!product) {
          notFound.push(line.sku);
          continue;
        }
        const qty = Math.max(1, Number(line.quantity) || 1);
        product.stock = Math.max(0, product.stock - qty);
        updated.push({ sku: product.sku, name: product.name, stock: product.stock });
      }

      await saveProducts(products);
      if (updated.length) {
        await logActivity('sync', `🔄 مزامنة خارجية: خصم مخزون ${updated.map((u) => u.sku).join('، ')}`);
      }
      return res.status(200).json({ ok: true, updated, notFound });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
