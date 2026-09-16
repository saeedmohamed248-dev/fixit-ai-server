// 🤖 اسأل الخبير — دردشة تشخيص القطعة (Google Gemini، باقة مجانية).
// POST /api/diagnose  { messages: [{role, content}, ...] }
// بيرجّع نفس شكل رد OpenAI ({choices:[{message:{content}}]}) عشان الواجهة ما تتغيّرش.
import { aiEnabled, aiChat } from '../ai.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (!aiEnabled()) {
        return res.status(503).json({ error: 'المساعد غير مفعّل: أضِف GEMINI_API_KEY في إعدادات Vercel' });
    }

    try {
        const { messages } = req.body || {};
        const reply = await aiChat(messages || [], { temperature: 0.7 });
        // شكل متوافق مع OpenAI عشان الواجهة (assistant.html) تقرأه من غير تغيير
        return res.status(200).json({ choices: [{ message: { role: 'assistant', content: reply } }] });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
