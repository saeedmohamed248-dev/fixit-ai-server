// 🤖 بوت كتابة المحتوى — يكتب الاسم الإنجليزي والوصف من الاسم العربي
// POST /api/describe  { name, brand?, models?, category?, condition? }  (إدارة)
// يرجّع { nameEn, description, descriptionEn }
import { cors, requireAdmin } from '../util.js';
import { aiEnabled, aiJSON } from '../ai.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  if (!aiEnabled()) {
    return res.status(503).json({ error: 'بوت الكتابة غير مفعّل: أضِف GEMINI_API_KEY في إعدادات Vercel' });
  }

  try {
    const { name, brand, models, category, condition } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم القطعة مطلوب' });

    const info = [
      `القطعة: ${name}`,
      brand && `الماركة: ${brand}`,
      Array.isArray(models) && models.length && `الموديلات: ${models.join(', ')}`,
      category && `الفئة: ${category}`,
      `الحالة: ${condition === 'new' ? 'جديد' : 'مستعمل وارد'}`,
    ].filter(Boolean).join('\n');

    const prompt = `أنت كاتب محتوى محترف لمتجر قطع غيار BMW & MINI. من بيانات القطعة دي:
${info}

اكتب JSON فقط بالشكل ده:
{
  "nameEn": "اسم القطعة بالإنجليزي (مختصر واحترافي)",
  "description": "وصف عربي احترافي 1-2 جملة يوضّح القطعة وموديلاتها وحالتها بشكل يبني ثقة التاجر",
  "descriptionEn": "نفس الوصف بالإنجليزي"
}
خلي الكلام واقعي وصادق (مستعمل وارد لو الحالة مستعمل). بدون أي نص خارج الـ JSON.`;

    const out = await aiJSON(prompt, [], { temperature: 0.5 });
    const clip = (s, n) => String(s || '').slice(0, n);
    return res.status(200).json({
      nameEn: clip(out.nameEn, 200),
      description: clip(out.description, 600),
      descriptionEn: clip(out.descriptionEn, 600),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
