// أسئلة وأجوبة المنتجات (زي أمازون)
// GET    /api/questions?productId=p1 → أسئلة منتج
// POST   /api/questions               → سؤال جديد { productId, name, question }
// PUT    /api/questions               → رد المتجر (إدارة) { id, answer }
// DELETE /api/questions?id=           → حذف (إدارة)
import { getQuestions, saveQuestions, getProducts, logActivity } from './_lib/db.js';
import { cors, requireAdmin, rateLimit } from './_lib/util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;

  try {
    const questions = await getQuestions();

    if (req.method === 'GET') {
      const { productId } = req.query;
      const list = productId ? questions.filter((q) => q.productId === productId) : questions;
      return res.status(200).json([...list].reverse());
    }

    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'questions', 5)) return;
      const { productId, name, question } = req.body || {};
      if (!productId || !name?.trim() || !question?.trim()) {
        return res.status(400).json({ error: 'اكتب اسمك وسؤالك' });
      }
      const products = await getProducts();
      const product = products.find((p) => p.id === productId);
      if (!product) return res.status(404).json({ error: 'المنتج غير موجود' });
      const entry = {
        id: 'qa' + Date.now(),
        productId,
        name: name.trim().slice(0, 60),
        question: question.trim().slice(0, 400),
        answer: '',
        createdAt: new Date().toISOString(),
      };
      questions.push(entry);
      await saveQuestions(questions);
      await logActivity('question', `❓ سؤال جديد على "${product.name}" من ${entry.name}`);
      return res.status(201).json(entry);
    }

    if (req.method === 'PUT') {
      if (!requireAdmin(req, res)) return;
      const { id, answer } = req.body || {};
      const entry = questions.find((q) => q.id === id);
      if (!entry) return res.status(404).json({ error: 'السؤال غير موجود' });
      entry.answer = String(answer || '').trim().slice(0, 600);
      entry.answeredAt = new Date().toISOString();
      await saveQuestions(questions);
      return res.status(200).json(entry);
    }

    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const index = questions.findIndex((q) => q.id === req.query.id);
      if (index === -1) return res.status(404).json({ error: 'السؤال غير موجود' });
      questions.splice(index, 1);
      await saveQuestions(questions);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
