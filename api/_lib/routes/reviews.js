// تقييمات ومراجعات المنتجات
// GET    /api/reviews?productId=p1  → مراجعات منتج
// POST   /api/reviews               → إضافة مراجعة { productId, rating, name, comment }
// DELETE /api/reviews?id=r1         → حذف مراجعة (إدارة)
import { getProducts, saveProducts, getReviews, saveReviews } from '../db.js';
import { getUser } from '../auth.js';
import { cors, requireAdmin, rateLimit } from '../util.js';

async function recalcRating(productId) {
  const [products, reviews] = [await getProducts(), await getReviews()];
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  const list = reviews.filter((r) => r.productId === productId);
  product.ratingCount = list.length;
  product.ratingAvg = list.length
    ? Math.round((list.reduce((s, r) => s + r.rating, 0) / list.length) * 10) / 10
    : 0;
  await saveProducts(products);
}

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    if (req.method === 'GET') {
      const reviews = await getReviews();
      const { productId } = req.query;
      const list = productId ? reviews.filter((r) => r.productId === productId) : reviews;
      return res.status(200).json([...list].reverse());
    }

    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'reviews', 5)) return;
      const { productId, rating, name, comment } = req.body || {};
      const stars = Number(rating);
      if (!productId || !stars || stars < 1 || stars > 5) {
        return res.status(400).json({ error: 'التقييم لازم يكون من 1 لـ 5 نجوم' });
      }
      if (!name?.trim()) return res.status(400).json({ error: 'اكتب اسمك' });

      const products = await getProducts();
      if (!products.some((p) => p.id === productId)) {
        return res.status(404).json({ error: 'المنتج غير موجود' });
      }

      const session = getUser(req);
      const reviews = await getReviews();
      const review = {
        id: 'r' + Date.now(),
        productId,
        rating: stars,
        name: name.trim().slice(0, 60),
        comment: (comment || '').trim().slice(0, 600),
        userId: session?.uid || null,
        verified: Boolean(session), // عميل مسجّل
        createdAt: new Date().toISOString(),
      };
      reviews.push(review);
      await saveReviews(reviews);
      await recalcRating(productId);
      return res.status(201).json(review);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const reviews = await getReviews();
      const index = reviews.findIndex((r) => r.id === req.query.id);
      if (index === -1) return res.status(404).json({ error: 'المراجعة غير موجودة' });
      const [removed] = reviews.splice(index, 1);
      await saveReviews(reviews);
      await recalcRating(removed.productId);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
