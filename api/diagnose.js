// Fixit AI diagnosis endpoint — hardened proxy to OpenAI.
//
// 🛡️ الحماية (كل واحدة بتتفعّل لما الـ env variable بتاعها يتضبط، عشان الموقع
//    الحي ميتكسرش لو اتـ deploy من غير ما تضبطهم — لكن اضبطهم فوراً في الإنتاج):
//    • FIXIT_ACCESS_KEY   → أي طلب لازم يبعت الهيدر x-fixit-key بنفس القيمة.
//                           من غيره الـ endpoint مفتوح للعالم وبيستنزف OPENAI_KEY.
//    • ALLOWED_ORIGINS    → قائمة origins مسموحة (مفصولة بفاصلة) للـ CORS بدل *.
//    • OPENAI_MODEL       → الموديل (افتراضي gpt-4o-mini).
//    • MAX_TOKENS         → سقف توكنز الرد (افتراضي 800) لتحديد التكلفة لكل طلب.

const MAX_MESSAGES = 40;          // أقصى عدد رسائل في الطلب الواحد
const MAX_TOTAL_CHARS = 24000;    // أقصى إجمالي أحرف (حماية من prompt عملاق)

function resolveCors(req, res) {
    const allowed = (process.env.ALLOWED_ORIGINS || '')
        .split(',').map(s => s.trim()).filter(Boolean);
    const origin = req.headers.origin || '';
    if (allowed.length === 0) {
        // مفيش allowlist → سلوك متوافق مع القديم (*)، لكن غير آمن — اضبط ALLOWED_ORIGINS.
        res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
    } else {
        // origin مش مسموح — منُطلّعش هيدر CORS (المتصفح هيمنع القراءة)
        res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-fixit-key');
}

export default async function handler(req, res) {
    resolveCors(req, res);

    // الرد الفوري على preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'method_not_allowed' });
    }

    // 🛡️ مصادقة بمفتاح مشترك (بتتفعّل لو FIXIT_ACCESS_KEY متضبط)
    const requiredKey = process.env.FIXIT_ACCESS_KEY;
    if (requiredKey) {
        const provided = req.headers['x-fixit-key'] || '';
        if (provided !== requiredKey) {
            return res.status(401).json({ error: 'unauthorized' });
        }
    }

    if (!process.env.OPENAI_KEY) {
        return res.status(500).json({ error: 'server_not_configured' });
    }

    try {
        const body = req.body || {};
        const messages = body.messages;

        // ✅ تحقّق من المدخلات — يمنع طلبات مشوّهة وprompts عملاقة
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'messages_required' });
        }
        if (messages.length > MAX_MESSAGES) {
            return res.status(413).json({ error: 'too_many_messages' });
        }
        const totalChars = messages.reduce(
            (n, m) => n + (m && typeof m.content === 'string' ? m.content.length : 0), 0);
        if (totalChars > MAX_TOTAL_CHARS) {
            return res.status(413).json({ error: 'payload_too_large' });
        }

        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const maxTokens = parseInt(process.env.MAX_TOKENS || '800', 10);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_KEY}`,
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: 0.7,
                max_tokens: maxTokens,
            }),
        });

        const data = await response.json();
        // مرّر status الـ OpenAI الحقيقي (بدل ما نرجّع 200 على خطأ upstream)
        return res.status(response.ok ? 200 : response.status).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
