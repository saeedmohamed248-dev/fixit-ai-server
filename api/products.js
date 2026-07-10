// GET    /api/products            → قائمة المنتجات (مع فلاتر اختيارية)
// GET    /api/products?id=p1      → منتج واحد
// POST   /api/products            → إضافة منتج (إدارة)
// PUT    /api/products            → تعديل منتج (إدارة)
// DELETE /api/products?id=p1      → حذف منتج (إدارة)
import { getProducts, saveProducts, logActivity } from './_lib/db.js';
import { cors, requireAdmin } from './_lib/util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const products = await getProducts();

    if (req.method === 'GET') {
      const { id, q, brand, category, condition, model, sort } = req.query;

      if (id) {
        const product = products.find((p) => p.id === id);
        if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
        return res.status(200).json(product);
      }

      let list = products;
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
        brand: body.brand || 'BMW',
        models: Array.isArray(body.models) ? body.models : [],
        category: body.category || 'أخرى',
        condition: body.condition === 'used' ? 'used' : 'new',
        price: Number(body.price) || 0,
        oldPrice: Number(body.oldPrice) || 0,
        stock: Number(body.stock) || 0,
        oem: body.oem || '',
        image: body.image || '',
        images: Array.isArray(body.images) ? body.images : [],
        description: body.description || '',
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
