// GET    /api/products            → قائمة المنتجات (المتاح في المخزون فقط)
// GET    /api/products?all=1       → كل المنتجات بما فيها اللي مخزونها صفر (إدارة)
// GET    /api/products?id=p1      → منتج واحد (بيرجع حتى لو مخزونه صفر)
// POST   /api/products            → إضافة منتج (إدارة)
// PUT    /api/products            → تعديل منتج (إدارة)
// DELETE /api/products?id=p1      → حذف منتج (إدارة)
import { getProducts, saveProducts, logActivity } from '../db.js';
import { cors, requireAdmin, productCategory, productBrand, productSupplier } from '../util.js';

// نضمن حقول العرض المشتقّة (فئة + نوع عربية + مورّد) للمنتجات الجاية من موس تك
function withDerived(p) {
  return { ...p, category: productCategory(p), brand: productBrand(p), supplier: productSupplier(p) };
}

// حساب الحجم بالمتر المكعب من الأبعاد (سم): الطول×العرض×الارتفاع ÷ مليون
function cbmFromDims(o) {
  const l = Number(o.lengthCm) || 0, w = Number(o.widthCm) || 0, h = Number(o.heightCm) || 0;
  return +((l * w * h) / 1e6).toFixed(4);
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const products = await getProducts();

    if (req.method === 'GET') {
      const { id, q, brand, category, condition, model, sort, all } = req.query;

      if (id) {
        const product = products.find((p) => p.id === id);
        if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
        // نضمن الحقول المشتقّة (منتجات موس تك بتوصل من غير فئة ونوع عربية صحيح)
        return res.status(200).json(withDerived(product));
      }

      // 🗂️ نضمن فئة + نوع عربية (BMW/MINI) + مورّد لكل منتج قبل الفلترة عشان
      //    الفلاتر والتنظيم يشتغلوا حتى على المنتجات اللي اتزامنت من موس تك.
      let list = products.map(withDerived);
      // 🚫 إخفاء المنتجات اللي مخزونها صفر من المتجر تلقائياً (المتجر يعرض المتاح بس).
      //    ?all=1 بيرجّع الكل (للإدارة/الأدوات). المنتج بيفضل محفوظ — بس مش بيظهر
      //    في القوايم، ويرجع لوحده أول ما مخزونه يزيد من مزامنة موس تك.
      if (!all) list = list.filter((p) => Number(p.stock) > 0);
      if (brand) list = list.filter((p) => p.brand === brand);
      if (category) list = list.filter((p) => p.category === category);
      if (condition) list = list.filter((p) => p.condition === condition);
      if (model) list = list.filter((p) => p.models.includes(model));
      if (q) {
        const term = q.trim().toLowerCase();
        list = list.filter((p) =>
          [p.name, p.nameEn || '', p.sku, p.oem, p.description, ...p.models]
            .join(' ')
            .toLowerCase()
            .includes(term)
        );
      }
      if (sort === 'price_asc') list = [...list].sort((a, b) => a.price - b.price);
      else if (sort === 'price_desc') list = [...list].sort((a, b) => b.price - a.price);
      else if (sort === 'best') list = [...list].sort((a, b) => (b.sold || 0) - (a.sold || 0));
      else if (sort === 'rating') list = [...list].sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));

      return res.status(200).json(list);
    }

    if (req.method === 'POST') {
      if (!requireAdmin(req, res)) return;
      const body = req.body || {};
      if (!body.name || !body.price) {
        return res.status(400).json({ error: 'اسم المنتج والسعر مطلوبان' });
      }
      const product = {
        id: 'p' + Date.now(),
        sku: body.sku || '',
        name: body.name,
        nameEn: body.nameEn || '',
        descriptionEn: body.descriptionEn || '',
        deliveryNote: body.deliveryNote || '',
        deliveryNoteEn: body.deliveryNoteEn || '',
        brand: body.brand || 'BMW',
        models: Array.isArray(body.models) ? body.models : [],
        category: body.category || 'أخرى',
        condition: body.condition === 'used' ? 'used' : 'new',
        price: Number(body.price) || 0,
        oldPrice: Number(body.oldPrice) || 0,
        wholesalePrice: Number(body.wholesalePrice) || 0,
        customsPct: Number(body.customsPct) || 0,
        lengthCm: Number(body.lengthCm) || 0,
        widthCm: Number(body.widthCm) || 0,
        heightCm: Number(body.heightCm) || 0,
        weightKg: Number(body.weightKg) || 0,
        cbm: cbmFromDims(body),
        stock: Number(body.stock) || 0,
        oem: body.oem || '',
        image: body.image || '',
        images: Array.isArray(body.images) ? body.images : [],
        description: body.description || '',
        // 🏬 توزيع الفروع + الفرع الافتراضي للشحن (بيتملّي من مزامنة موس تك)
        branches: Array.isArray(body.branches) ? body.branches : [],
        originBranchId: body.originBranchId ?? null,
        originBranch: body.originBranch || '',
        originLocation: body.originLocation || '',
        createdAt: new Date().toISOString(),
        sold: 0,
        ratingAvg: 0,
        ratingCount: 0,
      };
      products.push(product);
      await saveProducts(products);
      await logActivity('product', `🔧 إضافة منتج جديد: ${product.name} (مخزون ${product.stock})`);
      return res.status(201).json(product);
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const body = req.body || {};
      const index = products.findIndex((p) => p.id === body.id);
      if (index === -1) return res.status(404).json({ error: 'المنتج غير موجود' });
      const before = products[index];
      const updated = { ...before, ...body, id: before.id };
      updated.price = Number(updated.price) || 0;
      updated.oldPrice = Number(updated.oldPrice) || 0;
      updated.wholesalePrice = Number(updated.wholesalePrice) || 0;
      updated.customsPct = Number(updated.customsPct) || 0;
      updated.lengthCm = Number(updated.lengthCm) || 0;
      updated.widthCm = Number(updated.widthCm) || 0;
      updated.heightCm = Number(updated.heightCm) || 0;
      updated.weightKg = Number(updated.weightKg) || 0;
      updated.cbm = cbmFromDims(updated);
      updated.stock = Number(updated.stock) || 0;
      const stockChanged = updated.stock !== before.stock;
      products[index] = updated;
      await saveProducts(products);
      await logActivity('product', stockChanged
        ? `📊 تعديل مخزون "${updated.name}": من ${before.stock} إلى ${updated.stock}`
        : `✏️ تعديل بيانات المنتج: ${updated.name}`);
      return res.status(200).json(updated);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const { id } = req.query;
      const index = products.findIndex((p) => p.id === id);
      if (index === -1) return res.status(404).json({ error: 'المنتج غير موجود' });
      const [removed] = products.splice(index, 1);
      await saveProducts(products);
      await logActivity('product', `🗑️ حذف المنتج: ${removed.name}`);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
