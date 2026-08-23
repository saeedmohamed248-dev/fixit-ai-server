// 🤖 بوت تقدير الأبعاد والوزن — يقدّر حجم ووزن القطعة من اسمها (للشحن الدولي)
// POST /api/estimate  { name, brand?, models?, category? }  (إدارة)
// يرجّع { lengthCm, widthCm, heightCm, weightKg }
import { cors, requireAdmin } from '../util.js';

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAdmin(req, res)) return;

  if (!process.env.OPENAI_KEY) {
    return res.status(503).json({ error: 'بوت التقدير غير مفعّل: أضِف OPENAI_KEY في إعدادات Vercel' });
  }

  try {
    const { name, brand, models, category } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'اسم القطعة مطلوب' });

    const desc = [
      `القطعة: ${name}`,
      brand && `الماركة: ${brand}`,
      Array.isArray(models) && models.length && `الموديلات: ${models.join(', ')}`,
      category && `الفئة: ${category}`,
    ].filter(Boolean).join('\n');

    const prompt = `أنت خبير شحن دولي لقطع غيار السيارات (BMW & MINI). قدّر أبعاد ووزن الكرتونة/التغليف للشحن البحري/الجوي لهذه القطعة المستعملة الوارد.
${desc}

أرجع JSON فقط بهذا الشكل بالأرقام (سم وكجم)، بتقديرات واقعية للتصدير:
{"lengthCm": number, "widthCm": number, "heightCm": number, "weightKg": number}
لو القطعة كبيرة زي موتور كامل (N20/N52...) أو نص كت (half-cut) قدّر بواقعية (الموتور ~90×70×70 سم و150-200 كجم مثلاً). أرقام فقط، بدون أي نص إضافي.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data.error?.message || 'فشل الاتصال بالبوت' });

    let out = {};
    try { out = JSON.parse(data.choices?.[0]?.message?.content || '{}'); } catch { out = {}; }
    const num = (v, min, max) => {
      const n = Math.round((Number(v) || 0) * 10) / 10;
      return Math.max(min, Math.min(max, n));
    };
    return res.status(200).json({
      lengthCm: num(out.lengthCm, 1, 600),
      widthCm: num(out.widthCm, 1, 300),
      heightCm: num(out.heightCm, 1, 300),
      weightKg: num(out.weightKg, 0.1, 2000),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
