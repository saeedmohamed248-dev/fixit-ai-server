// 🤖 اسأل الخبير — دردشة تشخيص القطعة (Google Gemini).
// POST /api/diagnose  { messages: [{role, content}, ...] }
// بيرجّع نفس شكل رد OpenAI ({choices:[{message:{content}}]}) عشان الواجهة ما تتغيّرش.
//
// 🔒 [FIX]: الـ endpoint كان مفتوح للكل من غير أي حد — أي حد يقدر يبعت طلبات لا نهائية
//    بـ prompt من عنده (حتى الـ system prompt كان جاي من المتصفح) ويستهلك مفتاح Gemini
//    كأنه ذكاء اصطناعي ببلاش لأي غرض. دلوقتي:
//    • تعليمات الخبير (system prompt) ثابتة هنا على السيرفر — أي system جاي من العميل بيتجاهل
//    • حد طلبات لكل IP (DIAGNOSE_RATE_PER_MIN، افتراضي 12 في الدقيقة)
//    • حد لعدد الرسائل وطول كل رسالة والإجمالي، وسقف لطول الرد (DIAGNOSE_MAX_TOKENS)
//    • POST بس
import { aiEnabled, aiChat } from '../ai.js';
import { cors, rateLimit } from '../util.js';

const SYSTEM_PROMPT = 'أنت خبير قطع غيار سيارات BMW وMINI Cooper في متجر "FixIt" بمصر. مهمتك مساعدة العميل في تشخيص المشكلة وتحديد اسم القطعة المطلوبة بالعربي والإنجليزي، وبرقم OEM لو أمكن. اسأل عن الموديل والسنة لو مش واضحين. رد بنفس لغة العميل (عربي مصري بسيط أو إنجليزي). ردودك مختصرة، وفي نهاية كل تشخيص اقترح على العميل يدور على القطعة في المتجر أو يتواصل واتساب لو مش لاقيها. لو السؤال مالوش علاقة بالعربيات أو قطع الغيار، اعتذر بلطف ورجّع الكلام لتشخيص العربية. You are the FixIt BMW & MINI parts expert in Egypt — reply in the same language the customer writes in, and only help with cars and car parts.';

export const LIMITS = {
  maxMessages: 30,     // آخر 30 رسالة بس من المحادثة
  maxChars: 2000,      // للرسالة الواحدة
  maxTotal: 16000,     // لكل المحادثة
};

// بيرجّع الرسائل بعد التنظيف، أو رسالة خطأ
export function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return { error: 'messages لازم تبقى قائمة' };
  const msgs = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content)
    .slice(-LIMITS.maxMessages);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return { error: 'اكتب سؤالك' };
  if (msgs.some((m) => m.content.length > LIMITS.maxChars)) {
    return { error: `الرسالة طويلة — بحد أقصى ${LIMITS.maxChars} حرف` };
  }
  if (msgs.reduce((n, m) => n + m.content.length, 0) > LIMITS.maxTotal) {
    return { error: 'المحادثة طويلة جداً — ابدأ محادثة جديدة' };
  }
  return { messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...msgs] };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!aiEnabled()) {
    return res.status(503).json({ error: 'المساعد غير مفعّل: أضِف GEMINI_API_KEY في إعدادات Vercel' });
  }
  if (!rateLimit(req, res, 'diagnose', Number(process.env.DIAGNOSE_RATE_PER_MIN) || 12)) return;

  const { messages, error } = sanitizeMessages((req.body || {}).messages);
  if (error) return res.status(400).json({ error });

  try {
    const reply = await aiChat(messages, {
      temperature: 0.7,
      maxTokens: Number(process.env.DIAGNOSE_MAX_TOKENS) || 4096,
    });
    // شكل متوافق مع OpenAI عشان الواجهة (assistant.html) تقرأه من غير تغيير
    return res.status(200).json({ choices: [{ message: { role: 'assistant', content: reply } }] });
  } catch (err) {
    console.error('[diagnose]', err);
    // سبب مختصر من غير المفتاح — عشان نعرف المشكلة من اللوحة/الشبكة
    const why = String(err && err.message || '').replace(/key=[^&\s]+/g, 'key=***').slice(0, 160);
    return res.status(502).json({ error: 'المساعد مش متاح دلوقتي — جرّب كمان شوية', reason: why });
  }
}
