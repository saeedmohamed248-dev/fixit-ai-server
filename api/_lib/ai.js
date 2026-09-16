// 🤖 طبقة الذكاء الاصطناعي — Google Gemini (باقة مجانية سخية + رؤية).
//   بديل OpenAI: نفس الوظائف (نص / JSON / رؤية / دردشة) بمفتاح واحد مجاني.
//   الإعداد في Vercel: GEMINI_API_KEY (أو AI_VISION_API_KEY). الموديل اختياري
//   عبر GEMINI_MODEL (افتراضي gemini-2.0-flash — سريع ومجاني ويدعم الصور و JSON).
const KEY = () => process.env.GEMINI_API_KEY || process.env.AI_VISION_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function aiEnabled() { return Boolean(KEY()); }

// data URL صورة → صيغة Gemini (inline base64)
function dataUrlToInline(u) {
  const m = /^data:([^;]+);base64,(.*)$/i.exec(u || '');
  return m ? { inline_data: { mime_type: m[1], data: m[2] } } : null;
}

async function callGemini(contents, { json = false, temperature = 0.4, system, maxTokens } = {}) {
  const key = KEY();
  if (!key) throw new Error('الذكاء الاصطناعي غير مفعّل: أضِف GEMINI_API_KEY في إعدادات Vercel');
  const body = {
    contents,
    generationConfig: {
      temperature,
      ...(json ? { responseMimeType: 'application/json' } : {}),
      ...(maxTokens ? { maxOutputTokens: maxTokens } : {}),
    },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const r = await fetch(`${BASE}/${MODEL()}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || `فشل الاتصال بالذكاء الاصطناعي (${r.status})`);
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

function parseJSON(text) {
  try { return JSON.parse(text); }
  catch { const m = text && text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

// نص حر من برومبت
export async function aiText(prompt, opts = {}) {
  return callGemini([{ role: 'user', parts: [{ text: prompt }] }], opts);
}

// JSON من برومبت + صور اختيارية (data URLs) — للرؤية والاستخراج المنظّم
export async function aiJSON(prompt, images = [], opts = {}) {
  const parts = [{ text: prompt }];
  for (const u of images) { const inl = dataUrlToInline(u); if (inl) parts.push(inl); }
  const text = await callGemini([{ role: 'user', parts }], { json: true, temperature: 0, ...opts });
  return parseJSON(text);
}

// دردشة بصيغة OpenAI (messages[{role,content}]) → رد نصي
export async function aiChat(messages = [], opts = {}) {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n') || undefined;
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
    }));
  return callGemini(contents, { system, ...opts });
}
