// 🚢🕒 بوت تقدير مدة التوريد — حسب الدولة ووسيلة الشحن (جوي/بحري) والظروف الحالية
// POST /api/leadtime  { country, mode }   mode = 'sea' | 'air'
// يرجّع { minDays, maxDays, baseMin, baseMax, mode } بعد إضافة هامش احتياطي
import { cors, rateLimit } from '../util.js';

// تقديرات احتياطية (أيام) من الإمارات لو البوت مش متاح — تعكس ظروف حالية متحفّظة
const FALLBACK = {
  sea: { EG: [45, 65], RU: [40, 60], DEFAULT: [45, 70] },
  air: { EG: [4, 8], RU: [6, 11], DEFAULT: [5, 10] },
};

function codeOf(country) {
  const s = String(country || '').toLowerCase();
  if (/(مصر|egypt|eg)/.test(s)) return 'EG';
  if (/(روسيا|russia|ru|россия)/.test(s)) return 'RU';
  return 'DEFAULT';
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!rateLimit(req, res, 'leadtime', 20)) return;

  try {
    const { country, mode } = req.body || {};
    const m = mode === 'air' ? 'air' : 'sea';
    const bufferPct = Number(req.body?.bufferPct) || 40; // هامش احتياطي 30–50% (افتراضي 40)
    const applyBuffer = (a, b) => [Math.round(a * (1 + bufferPct / 100)), Math.round(b * (1 + bufferPct / 100))];

    let baseMin, baseMax, source = 'fallback';

    if (process.env.OPENAI_KEY) {
      try {
        const modeAr = m === 'air' ? 'شحن جوي' : 'شحن بحري (حاوية)';
        const prompt = `أنت خبير لوجستيات شحن دولي. قدّر مدة الشحن الواقعية الحالية (بالأيام) من الإمارات (الشارقة/جبل علي) إلى "${country || 'وجهة دولية'}" عن طريق ${modeAr}.
خُد في اعتبارك ظروف الشحن الحالية (زحام الموانئ، اضطرابات البحر الأحمر، مواعيد الإبحار). أرجع JSON فقط:
{"minDays": number, "maxDays": number}
أرقام واقعية فقط بدون أي نص إضافي.`;
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_KEY}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          }),
        });
        const data = await r.json();
        if (r.ok) {
          const out = JSON.parse(data.choices?.[0]?.message?.content || '{}');
          const mn = Number(out.minDays), mx = Number(out.maxDays);
          if (mn > 0 && mx >= mn) { baseMin = Math.round(mn); baseMax = Math.round(mx); source = 'ai'; }
        }
      } catch { /* نسقط على التقدير الاحتياطي */ }
    }

    if (baseMin === undefined) {
      const tbl = FALLBACK[m][codeOf(country)] || FALLBACK[m].DEFAULT;
      [baseMin, baseMax] = tbl;
    }

    const [minDays, maxDays] = applyBuffer(baseMin, baseMax);
    return res.status(200).json({ mode: m, baseMin, baseMax, minDays, maxDays, bufferPct, source });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
