// 🤖 طبقة الذكاء الاصطناعي — Google Gemini (باقة مجانية سخية + رؤية).
//   بديل OpenAI: نفس الوظائف (نص / JSON / رؤية / دردشة) بمفتاح واحد مجاني.
//   الإعداد في Vercel: GEMINI_API_KEY (أو AI_VISION_API_KEY). الموديل اختياري
//   عبر GEMINI_MODEL (افتراضي gemini-3.6-flash — سريع ومجاني ويدعم الصور و JSON).
const KEY = () => process.env.GEMINI_API_KEY || process.env.AI_VISION_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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
  const url = `${BASE}/${MODEL()}:generateContent?key=${encodeURIComponent(key)}`;
  const payload = JSON.stringify(body);
  // 🔁 إعادة محاولة عند الضغط المؤقت (429/500/503/overloaded) — بتراجع بسيط
  let data = {}, status = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    status = r.status;
    data = await r.json().catch(() => ({}));
    if (r.ok) {
      return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    }
    const msg = (data.error?.message || '').toLowerCase();
    const retryable = status === 429 || status === 500 || status === 503
      || /overload|high demand|unavailable|try again|rate/i.test(msg);
    if (!retryable || attempt === 2) break;
    await new Promise((res) => setTimeout(res, 1200 * (attempt + 1)));
  }
  const em = (data.error?.message || '').toLowerCase();
  if (status === 429 || status === 503 || /overload|high demand|unavailable/i.test(em)) {
    throw new Error('الخدمة مزحومة دلوقتي — جرّب تاني بعد شوية.');
  }
  throw new Error(data.error?.message || `فشل الاتصال بالذكاء الاصطناعي (${status})`);
}

function parseJSON(text) {
  try { return JSON.parse(text); }
  catch { const m = text && text.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : {}; }
}

// نص حر من برومبت
export async function aiText(prompt, opts = {}) {
  return callGemini([{ role: 'user', parts: [{ text: prompt }] }], opts);
}

// JSON من برومبت + مرفقات اختيارية (data URLs لصور أو PDF) + نص إضافي اختياري
// (مثلاً محتوى ملف Excel/CSV اتحوّل لنص) — للرؤية والاستخراج المنظّم.
export async function aiJSON(prompt, media = [], opts = {}) {
  const { extraText, ...gen } = opts;
  const parts = [{ text: prompt }];
  for (const u of media) { const inl = dataUrlToInline(u); if (inl) parts.push(inl); }
  if (extraText) parts.push({ text: String(extraText).slice(0, 100000) });
  const text = await callGemini([{ role: 'user', parts }], { json: true, temperature: 0, ...gen });
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
