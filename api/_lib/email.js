// إرسال الإيميلات عبر Resend — يعمل فقط لو RESEND_API_KEY مضبوط
// المتغيرات في Vercel:
//   RESEND_API_KEY  = مفتاح Resend
//   EMAIL_FROM      = العنوان المرسِل، مثلاً "FixIt <orders@fixitauto.parts>"
//                     (لو مش مضبوط بيستخدم دومين Resend التجريبي)
const FROM = process.env.EMAIL_FROM || 'FixIt <onboarding@resend.dev>';
const KEY = process.env.RESEND_API_KEY;

export function emailEnabled() {
  return Boolean(KEY);
}

// قالب موحّد بهوية FixIt (متجاوب وبسيط عشان يظهر في كل برامج الإيميل)
function wrap(title, bodyHtml, accent = '#f97316') {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><body style="margin:0;background:#f4f5f7;font-family:Tahoma,Arial,sans-serif;color:#101828;">
  <div style="max-width:560px;margin:0 auto;padding:24px;">
    <div style="background:${accent};color:#fff;padding:18px 22px;border-radius:14px 14px 0 0;font-size:22px;font-weight:bold;">🔧 FixIt</div>
    <div style="background:#fff;padding:24px 22px;border-radius:0 0 14px 14px;border:1px solid #e4e7ec;border-top:none;">
      <h2 style="margin:0 0 14px;font-size:19px;">${title}</h2>
      ${bodyHtml}
    </div>
    <p style="text-align:center;color:#98a2b3;font-size:12px;margin-top:16px;">
      FixIt — قطع غيار BMW & MINI · <a href="https://fixitauto.parts" style="color:${accent};">fixitauto.parts</a>
    </p>
  </div></body></html>`;
}

async function send(to, subject, html) {
  if (!KEY || !to) return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) console.warn('Resend error', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.warn('Email send failed (non-blocking):', e.message);
  }
}

const money = (n) => new Intl.NumberFormat('ar-EG').format(n) + ' ج.م';

/* ---------- الإيميلات الجاهزة ---------- */

export function sendWelcome(user) {
  if (!user.email) return;
  const html = wrap('أهلاً بيك في FixIt 🧡', `
    <p>يا هلا ${escapeHtml(user.name)}، حسابك اتفعّل بنجاح!</p>
    <p>من دلوقتي هتقدر تتابع طلباتك، تجمّع نقاط مع كل شراء، وتوصلك تذكيرات صيانة عربيتك.</p>
    <p style="margin-top:18px;"><a href="https://fixitauto.parts/shop.html" style="background:#f97316;color:#fff;padding:11px 22px;border-radius:10px;text-decoration:none;display:inline-block;">ابدأ التسوق 🚗</a></p>`);
  return send(user.email, 'أهلاً بيك في FixIt 🔧', html);
}

export function sendOrderConfirm(order, email) {
  if (!email) return;
  const rows = order.items.map((i) =>
    `<tr><td style="padding:6px 0;border-bottom:1px solid #eee;">${escapeHtml(i.name)} × ${i.qty}</td>
     <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:left;">${money(i.price * i.qty)}</td></tr>`).join('');
  const html = wrap('استلمنا طلبك بنجاح ✅', `
    <p>شكراً ${escapeHtml(order.customer.name)}! طلبك رقم <b>${escapeHtml(order.number)}</b> اتسجّل.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0;">${rows}
      <tr><td style="padding:10px 0;font-weight:bold;">الإجمالي</td>
          <td style="padding:10px 0;text-align:left;font-weight:bold;color:#ea580c;">${money(order.total)}</td></tr>
    </table>
    <p>هنتواصل معاك على ${escapeHtml(order.customer.phone)} لتأكيد الطلب وتحديد الشحن.</p>
    <p><a href="https://fixitauto.parts/track.html?number=${encodeURIComponent(order.number)}&phone=${encodeURIComponent(order.customer.phone)}" style="color:#ea580c;">تابع حالة طلبك ←</a></p>`);
  return send(email, `تأكيد طلبك ${order.number} — FixIt`, html);
}

const STATUS_MSG = {
  confirmed: ['تم تأكيد طلبك ✅', 'طلبك اتأكد وجاري تجهيزه.'],
  shipped: ['طلبك في الطريق 🚚', 'طلبك اتشحن ودلوقتي في الطريق ليك.'],
  delivered: ['تم تسليم طلبك 📦', 'اتسلّم طلبك — شكراً لتعاملك مع FixIt 🧡'],
  cancelled: ['تم إلغاء طلبك', 'للأسف اتلغى طلبك. لو عندك استفسار كلمنا.'],
};

export function sendStatusUpdate(order, email) {
  if (!email || !STATUS_MSG[order.status]) return;
  const [subject, line] = STATUS_MSG[order.status];
  const html = wrap(subject, `
    <p>${escapeHtml(line)}</p>
    <p>طلب رقم <b>${escapeHtml(order.number)}</b> — الإجمالي ${money(order.total)}</p>
    <p><a href="https://fixitauto.parts/track.html?number=${encodeURIComponent(order.number)}&phone=${encodeURIComponent(order.customer.phone)}" style="color:#ea580c;">تفاصيل الطلب ←</a></p>`);
  return send(email, `${subject} — ${order.number}`, html);
}

export function sendMaintenanceReminder(entry, email) {
  if (!email) return;
  const html = wrap('تذكير صيانة عربيتك 🔧', `
    <p>يا ${escapeHtml(entry.customerName || 'صديقنا')}، فاكر إن ميعاد <b>${escapeHtml(entry.title)}</b> قرّب؟</p>
    <p>الموعد: <b>${escapeHtml(entry.dueDate)}</b></p>
    <p>حافظ على عربيتك في أفضل حالة — احجز صيانتك دلوقتي.</p>
    <p><a href="https://wa.me/201125157767" style="background:#16a34a;color:#fff;padding:11px 22px;border-radius:10px;text-decoration:none;display:inline-block;">احجز واتساب 💬</a></p>`);
  return send(email, 'تذكير صيانة عربيتك — FixIt', html);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
