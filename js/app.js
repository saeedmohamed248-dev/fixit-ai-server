// كود مشترك بين كل الصفحات: الهيدر، الفوتر، السلة، الحساب، المفضلة، الاتصال بالـ API

// 📱 لما التطبيق يشتغل كتطبيق موبايل (أندرويد/iOS) عبر Capacitor بيكون محمّل
// محلياً من https://localhost، فالمسار النسبي /api مش هيوصل للسيرفر. عشان كده
// بنوجّه نداءات الـ API لدومين الإنتاج. على الويب العادي بيفضل نسبي زي ما هو.
const PROD_ORIGIN = 'https://fixitauto.parts';
const IS_NATIVE = !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
const API = IS_NATIVE ? PROD_ORIGIN + '/api' : '/api';

/* ---------- 🇪🇬🇦🇪 الفرع: قطاعي (مصر) / جملة (الإمارات) ---------- */
// الوضع محفوظ في المتصفح، والافتراضي القطاعي (مصر). العملة في الجملة: درهم/دولار
window.MODE = localStorage.getItem('mode') === 'wholesale' ? 'wholesale' : 'retail';
window.WCUR = localStorage.getItem('wcur') === 'usd' ? 'usd' : 'aed';
function isWholesale() { return MODE === 'wholesale'; }
function wsConf() { return SITE.wholesale || {}; }
// 🇦🇪 فرع الجملة يبيع قطع مستعملة (وارد) فقط — مفيش جديد
// 🏬 فرع القطعة: الإمارات (جملة) ولا مصر (قطاعي)؟ بنطابق اسم/مكان الفرع بالكلمات المضبوطة
//    في config (wholesale.branchMatch).
// 🐛 [FIX]: قبل كده أي فرع مكتوب على القطعة كان بيحسب — حتى لو رصيده فيه صفر — فقطعة مصر
//    اللي ليها سطر فاضي في فرع الإمارات كانت بتظهر للتجار، والمتجر القطاعي كان بيعرض قطع
//    الإمارات لعملاء مصر. دلوقتي العبرة بالفرع اللي فيه رصيد فعلاً.
function wsUaeRe() {
  const pat = (wsConf().branchMatch) || 'إمارات|امارات|uae|dubai|دبي|الشارقة|sharjah';
  try { return new RegExp(pat, 'i'); } catch { return /إمارات|امارات|uae|dubai/i; }
}
function wsIsUaeBranch(b) { return wsUaeRe().test([b && b.name, b && b.location].filter(Boolean).join(' | ')); }
function wsStockedBranches(p) { return (p.branches || []).filter((b) => Number(b.stock) > 0); }
function wsInUaeBranch(p) {
  const stocked = wsStockedBranches(p);
  if (stocked.length) return stocked.some(wsIsUaeBranch);
  // مفيش رصيد في أي فرع (أو قطعة متضافة يدوي من اللوحة): بالفرع المكتوب عليها
  const parts = [p.originBranch, p.originLocation];
  for (const b of (p.branches || [])) { parts.push(b.name, b.location); }
  return wsUaeRe().test(parts.filter(Boolean).join(' | '));
}
function wsInEgyptBranch(p) {
  const stocked = wsStockedBranches(p);
  if (stocked.length) return stocked.some((b) => !wsIsUaeBranch(b));
  return !wsInUaeBranch(p);
}
// مكتب التجارة (جملة) يعرض قطع فرع الإمارات بس، والمتجر القطاعي يعرض قطع مصر بس.
// قطعة ليها رصيد في الفرعين بتظهر في الاتنين.
function wsCatalogFilter(list) {
  return (list || []).filter(isWholesale() ? wsInUaeBranch : wsInEgyptBranch);
}
// 🆕 وصل حديثاً — القطع المضافة خلال آخر 21 يوم
const NEW_ARRIVAL_DAYS = 21;
function isNewArrival(p) {
  if (!p || !p.createdAt) return false;
  return (Date.now() - new Date(p.createdAt).getTime()) / 86400000 <= NEW_ARRIVAL_DAYS;
}
// ترتيب من الأحدث للأقدم
function byNewest(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }
// أحدث المنتجات (مع فلتر الفرع)
function newArrivals(list, n = 8) {
  return wsCatalogFilter([...(list || [])]).filter(isNewArrival).sort(byNewest).slice(0, n);
}
function usdRate() { return Number(wsConf().usdRate) || 3.6725; }
function setMode(m) {
  const ws = m === 'wholesale';
  localStorage.setItem('mode', ws ? 'wholesale' : 'retail');
  location.href = ws ? '/trade.html' : '/index.html';
}
function setWCur(c) {
  localStorage.setItem('wcur', c === 'usd' ? 'usd' : 'aed');
  location.reload();
}
// رقم الواتساب حسب الفرع (جملة الإمارات ليها رقمها)
function waNumber() {
  return isWholesale() && wsConf().whatsapp ? wsConf().whatsapp : SITE.whatsapp;
}
function phoneDisplay() {
  return isWholesale() && wsConf().phoneDisplay ? wsConf().phoneDisplay : SITE.phoneDisplay;
}
// سعر العرض للمنتج حسب الفرع والعملة — يرجّع رقم، أو null لو مفيش سعر جملة
// 🇦🇪 سعر الجملة بالدرهم: لو مش متحدد، قطع فرع الإمارات بتستخدم سعرها الأساسي
//    (موس تك بيبعت سعر فرع الإمارات بالدرهم في خانة السعر، ومش بيملا خانة الجملة)
function wsBaseAED(p) {
  const w = Number(p.wholesalePrice) || 0;
  if (w > 0) return w;
  return wsInUaeBranch(p) ? (Number(p.price) || 0) : 0;
}
function dispPrice(p) {
  if (isWholesale()) {
    const aed = wsBaseAED(p);
    if (aed <= 0) return null;
    return WCUR === 'usd' ? aed / usdRate() : aed;
  }
  return Number(p.price) || 0;
}
// السعر قبل الخصم (الشطب) — للقطاعي فقط
function dispOld(p) {
  if (isWholesale()) return 0;
  return Number(p.oldPrice) || 0;
}

/* ---------- 📊 التسعير المتدرّج حسب الكمية (جملة) ---------- */
// شرائح الأسعار مرتبة تنازلياً حسب أقل كمية
function wsTiers() {
  const t = (wsConf().tiers || []).filter((x) => x && x.min >= 1);
  const list = t.length ? t : [{ min: 1, off: 0 }];
  return [...list].sort((a, b) => a.min - b.min);
}
function wsMOQ() { return Math.max(1, Number(wsConf().moq) || 1); }
// الشريحة المطبّقة على كمية معيّنة
function tierFor(qty) {
  const tiers = wsTiers();
  let chosen = tiers[0];
  for (const tr of tiers) if (qty >= tr.min) chosen = tr;
  return chosen;
}
// سعر الوحدة بالدرهم بعد خصم الشريحة
function wsUnitAED(p, qty = 1) {
  const base = wsBaseAED(p);
  if (base <= 0) return null;
  const off = Number(tierFor(qty).off) || 0;
  return base * (1 - off / 100);
}
// سعر الوحدة بعملة العرض (درهم/دولار) عند كمية معيّنة — أو null
function tierUnit(p, qty = 1) {
  const aed = wsUnitAED(p, qty);
  if (aed === null) return null;
  return WCUR === 'usd' ? aed / usdRate() : aed;
}
// جدول الأسعار المتدرّجة الجاهز لصفحة المنتج / منصة التجارة
function tierTableHtml(p) {
  if (!isWholesale() || wsLocked() || dispPrice(p) === null) return '';
  const tiers = wsTiers();
  if (tiers.length < 2) return '';
  const rows = tiers.map((tr, i) => {
    const next = tiers[i + 1];
    const range = next
      ? `${tr.min} – ${next.min - 1}`
      : t('tier_pcs_plus', { n: tr.min });
    const unit = tierUnit(p, tr.min);
    return `<tr class="${tr.off > 0 && !next ? 'best' : ''}">
      <td>${range}</td>
      <td><span class="u">${money(unit)}</span></td>
      <td class="save">${tr.off > 0 ? '−' + tr.off + '%' : '—'}</td>
    </tr>`;
  }).join('');
  return `
  <div class="tier-block">
    <h3 style="margin:4px 0 2px;">📊 ${t('tier_title')}</h3>
    <div class="panel-sub" style="color:var(--muted);font-size:13px;">${t('tier_sub')}</div>
    <table class="tier-table">
      <thead><tr><th>${t('tier_qty')}</th><th>${t('tier_unit')}</th><th>${t('tier_save')}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

/* ---------- 🚢 محرك الشحن والحاويات (CBM · Load Planner · Freight · Incoterms) ---------- */
function containerList() {
  return [...(wsConf().containers || [])].sort((a, b) => (a.sort || 0) - (b.sort || 0));
}
function lclMaxCbm() { return Number(wsConf().lclMaxCbm) || 15; }
// حجم/وزن السلة — items = [{ p, qty }]
function sumCbm(items) { return items.reduce((s, i) => s + (Number(i.p.cbm) || 0) * i.qty, 0); }
function sumWeight(items) { return items.reduce((s, i) => s + (Number(i.p.weightKg) || 0) * i.qty, 0); }
// أصغر حاوية تكفي الحجم والوزن — أو LCL أو حاويات متعددة
function planLoad(cbm, kg) {
  if (cbm <= 0) return { mode: 'EMPTY', cbm: 0 };
  if (cbm < lclMaxCbm()) return { mode: 'LCL', cbm, chargeableCbm: Math.max(cbm, 1) };
  const sizes = containerList();
  for (const ct of sizes) {
    if (cbm <= ct.usableCbm && kg <= ct.maxKg) {
      return { mode: 'FCL', container: ct, count: 1, cbm, fillPct: Math.round(cbm / ct.usableCbm * 100) };
    }
  }
  const big = sizes[sizes.length - 1] || { usableCbm: 68, code: '40HC' };
  const count = Math.ceil(cbm / big.usableCbm);
  return { mode: 'FCL_MULTI', container: big, count, cbm, fillPct: Math.round(cbm / (big.usableCbm * count) * 100) };
}
// كود الدولة من نص حساب التاجر (حر) → EG / RU / DEFAULT
function countryCode(str) {
  const s = String(str || '').toLowerCase();
  if (/(مصر|egypt|eg\b)/.test(s)) return 'EG';
  if (/(روسيا|russia|ru\b|россия)/.test(s)) return 'RU';
  return 'DEFAULT';
}
function dealerCountryCode() { return countryCode(currentUser()?.country); }
function lane(code) { return (wsConf().freight?.lanes || {})[code] || (wsConf().freight?.lanes || {}).DEFAULT || {}; }
function countryPolicy(code) { return (wsConf().countryPolicy || {})[code] || (wsConf().countryPolicy || {}).DEFAULT || { incoterms: ['FOB', 'CIF'], customs: false }; }
function incotermDef(c) { return (wsConf().incoterms || {})[c] || {}; }
// شروط الدفع حسب الدولة (مصر: 65/35 · غيرها: كامل مقدّماً)
function paymentTerms(code) {
  const p = wsConf().payment || {};
  return p[code] || p.DEFAULT || { fullUpfront: true };
}
function freightMarkup() { return Number(wsConf().freight?.markupPct) || 0; }
// تكلفة الشحن الخام (دولار) قبل الهامش
function rawFreightUsd(code, plan) {
  const ln = lane(code);
  if (plan.mode === 'LCL') return Math.max((Number(ln.lclPerCbm) || 0) * plan.chargeableCbm, Number(ln.minCharge) || 0);
  if (plan.mode === 'FCL' || plan.mode === 'FCL_MULTI') {
    const per = (ln.fcl || {})[plan.container.code] || 0;
    return per * (plan.count || 1);
  }
  return 0;
}
function freightUsd(code, plan) { return rawFreightUsd(code, plan) * (1 + freightMarkup() / 100); }
// تقدير الجمارك: نسبة جمرك كل منتج (من لوحة التحكم) على قيمته + ضريبة ورسوم الدولة
function customsEstimateUsd(code, items, cifExclDutyUsd) {
  const c = (wsConf().customs || {})[code];
  if (!c) return 0;
  const duty = items.reduce((s, i) => {
    const aed = wsUnitAED(i.p, i.qty);
    const goodsUsd = aed === null ? 0 : (aed / usdRate()) * i.qty;
    return s + goodsUsd * ((Number(i.p.customsPct) || 0) / 100);
  }, 0);
  const vat = cifExclDutyUsd * ((Number(c.vatPct) || 0) / 100);
  return duty + vat + (Number(c.clearanceUsd) || 0);
}
// عرض سعر شحن كامل بالدولار — items=[{p,qty}]
function freightQuote(items, incotermCode, code) {
  const inc = incotermDef(incotermCode);
  const cbm = sumCbm(items), kg = sumWeight(items);
  const plan = planLoad(cbm, kg);
  // قيمة البضاعة بالدولار (أسعار الجملة بالدرهم ÷ سعر الصرف، مع خصم الكمية)
  const goods = items.reduce((s, i) => {
    const aed = wsUnitAED(i.p, i.qty);
    return s + (aed === null ? 0 : (aed / usdRate()) * i.qty);
  }, 0);
  let freight = 0, insurance = 0, customs = 0;
  if (inc.freight) freight = freightUsd(code, plan);
  if (inc.insurance) insurance = (goods + freight) * ((Number(wsConf().freight?.insurancePct) || 0) / 100);
  if (inc.customs && countryPolicy(code).customs) customs = customsEstimateUsd(code, items, goods + freight + insurance);
  return { cbm, kg, plan, goods, freight, insurance, customs, total: goods + freight + insurance + customs, port: lane(code).port || '' };
}
function usdMoney(n) { return '$ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n); }
function leadBufferPct() { return Number(wsConf().leadBufferPct) || 40; }
// صياغة مدة التوريد: أيام + تقريب بالشهور لو طويلة
function monthsAr(m) {
  const map = { 0.5: 'نص شهر', 1: 'شهر', 1.5: 'شهر ونص', 2: 'شهرين', 2.5: 'شهرين ونص', 3: '3 شهور', 3.5: '3 شهور ونص', 4: '4 شهور', 4.5: '4 شهور ونص', 5: '5 شهور' };
  return map[m] || `${m} شهر`;
}
function fmtLead(min, max) {
  const days = LANG === 'en' ? `${min}–${max} days` : `${min}–${max} يوم`;
  const avg = (min + max) / 2;
  if (avg < 25) return days;
  const months = Math.round(avg / 30 * 2) / 2;
  const m = LANG === 'en' ? `≈ ${months} mo` : `≈ ${monthsAr(months)}`;
  return `${days} (${m})`;
}
// وصف الحمولة الموصى بها بلغة العرض
function loadLabel(plan) {
  if (plan.mode === 'EMPTY') return '';
  if (plan.mode === 'LCL') return t('load_lcl');
  const ctName = LANG === 'en' ? plan.container.nameEn : plan.container.nameAr;
  if (plan.mode === 'FCL') return `${ctName} · ${plan.fillPct}%`;
  return `${plan.count}× ${ctName} · ${plan.fillPct}%`;
}

// 🚚 ملاحظة التوصيل/الوصول اليدوية للقطعة (باللغة الحالية)
function deliveryNote(p) {
  const note = (LANG === 'en' && p.deliveryNoteEn) ? p.deliveryNoteEn : (p.deliveryNote || '');
  return note.trim();
}
function deliveryBadge(p, cls = '') {
  const n = deliveryNote(p);
  if (!isWholesale() || !n) return '';
  return `<div class="delivery-badge ${cls}">🚚 ${esc(n)}</div>`;
}

// أسعار الجملة تظهر بس للتجار المسجّلين
function wsLocked() { return isWholesale() && !currentUser(); }
// كتلة السعر الجاهزة (قديم + حالي) أو "السعر عند الطلب" أو قفل تسجيل الدخول
function priceBlock(p) {
  // ⚠️ span مش <a>: الكارت نفسه لينك، واللينك جوه لينك بيخلّي المتصفح يقسم الكارت لقطع متفرقة
  if (wsLocked()) return `<span class="price price-lock" data-login role="link">🔒 ${t('ws_login_price')}</span>`;
  const d = dispPrice(p);
  if (d === null) return `<span class="price price-req">${t('price_request')}</span>`;
  const old = dispOld(p);
  const showOld = old > (Number(p.price) || 0);
  return `${showOld ? `<span class="old-price">${money(old)}</span>` : ''}<span class="price">${money(d)}</span>`;
}

/* ---------- إعدادات المتجر (من لوحة التحكم) ---------- */
window.SETTINGS = {};

// تغميق لون hex بنسبة معينة (لاشتقاق درجات اللون الأساسي)
function shadeColor(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + pct / 100))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ---------- 📣 Meta Pixel (فيسبوك/انستجرام) — الـ ID بيتحط من لوحة التحكم ← الإعدادات ---------- */
function initPixel(id) {
  id = String(id || '').trim();
  if (!/^\d{6,20}$/.test(id) || window._pxInit || IS_NATIVE) return;
  window._pxInit = id;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  fbq('init', id);
  fbq('track', 'PageView');
  (window._pxQueue || []).forEach((a) => fbq('track', a[0], a[1]));
  window._pxQueue = [];
}
/* ---------- 📈 Google Analytics 4 — الـ ID من لوحة التحكم ← الإعدادات ---------- */
function initGA(id) {
  id = String(id || '').trim();
  if (!/^G-[A-Z0-9]{4,15}$/.test(id) || window._gaInit || IS_NATIVE) return;
  window._gaInit = id;
  const sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.googletagmanager.com/gtag/js?id=' + id; document.head.appendChild(sc);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { dataLayer.push(arguments); };
  gtag('js', new Date()); gtag('config', id);
}
// 💬 كل ضغطة على واتساب بتتسجّل (بنعرف أي صفحة بتجيب عملاء)
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
  if (a) try { trackEvent('wa_click', { path: location.pathname }); } catch {}
}, true);
function px(ev, data) {
  try {
    if (window.fbq) fbq('track', ev, data || {});
    else (window._pxQueue = window._pxQueue || []).push([ev, data || {}]);
  } catch {}
}
function pxCurrency() { return isWholesale() ? (WCUR === 'usd' ? 'USD' : 'AED') : 'EGP'; }

function applySettings(s) {
  if (!s || typeof s !== 'object') return;
  window.SETTINGS = s;
  if (s.metaPixel) initPixel(s.metaPixel);
  if (s.gaId) initGA(s.gaId);
  if (s.accent && /^#[0-9a-fA-F]{6}$/.test(s.accent)) {
    const root = document.documentElement.style;
    root.setProperty('--accent', s.accent);
    root.setProperty('--accent-dark', shadeColor(s.accent, -14));
    root.setProperty('--accent-deep', shadeColor(s.accent, -28));
  }
  if (s.storeName) SITE.name = s.storeName;
  if (s.whatsapp) SITE.whatsapp = s.whatsapp;
  if (s.phoneDisplay) SITE.phoneDisplay = s.phoneDisplay;
  if (s.instapay) SITE.instapay = s.instapay;
  if (s.wallet) SITE.wallet = s.wallet;
  if (s.freeShippingOver !== undefined && s.freeShippingOver !== '') {
    SITE.freeShippingOver = Number(s.freeShippingOver) || 0;
  }
}

// نطبق نسخة متخزنة فوراً (من غير وميض)، وبعدين نحدّث من السيرفر
try { applySettings(JSON.parse(localStorage.getItem('site_settings'))); } catch {}
fetch(API + '/settings')
  .then((r) => r.json())
  .then((s) => {
    localStorage.setItem('site_settings', JSON.stringify(s));
    applySettings(s);
    if (window._layoutRendered) renderLayout(window._active || '');
  })
  .catch(() => {});

/* ---------- API ---------- */
async function api(path, options = {}) {
  // ⚠️ الـ headers لازم تتدمج بعد ...options — غير كده أي طلب فيه توكن كان بيفقد Content-Type: application/json
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || (LANG === 'en' ? 'Something went wrong, try again' : 'حصل خطأ، حاول تاني'));
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------- 📈 تتبّع (تحليلات مجمّعة — بدون أي بيانات شخصية) ---------- */
function anonId() {
  try {
    let v = localStorage.getItem('an_vid');
    if (!v) { v = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12)); localStorage.setItem('an_vid', v); }
    return v;
  } catch { return 'nostore-' + Math.random().toString(36).slice(2, 12); }
}
// 🧭 معرّف الزيارة (الجلسة): بيتجدد بعد 30 دقيقة خمول — عشان نشوف رحلة كل زائر صفحة بصفحة
function sessId() {
  try {
    // ⚠️ ليه توقيت خاص بيه (an_sid_t) بيتحدّث مع كل حدث — قبل كده أي بحث قبل تسجيل الصفحة كان بيعمل "زيارة" جديدة فاضية
    const now = Date.now(), last = Number(sessionStorage.getItem('an_sid_t') || 0);
    let s = sessionStorage.getItem('an_sid');
    if (!s || (last && now - last > 30 * 60 * 1000)) { s = 's' + now.toString(36) + Math.random().toString(36).slice(2, 8); sessionStorage.setItem('an_sid', s); }
    sessionStorage.setItem('an_sid_t', String(now));
    return s;
  } catch { return 'nos'; }
}
// ⏱️ الوقت الفعلي على الصفحة (بنحسب بس وهي ظاهرة قدامه) — بيتبعت لما يقفل/يسيب الصفحة
let _pgStart = Date.now(), _pgVisible = 0, _pgSent = false;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { _pgVisible += Date.now() - _pgStart; sendLeave(); }
  else { _pgStart = Date.now(); _pgSent = false; }
});
window.addEventListener('pagehide', () => { if (document.visibilityState !== 'hidden') _pgVisible += Date.now() - _pgStart; sendLeave(); });
function sendLeave() {
  if (_pgSent || /admin/.test(location.pathname)) return;
  _pgSent = true;
  track('leave', { path: location.pathname, dur: Math.min(3600, Math.round(_pgVisible / 1000)), scroll: Math.round(Math.min(1, (scrollY + innerHeight) / Math.max(1, document.documentElement.scrollHeight)) * 100) });
}
// 🔥 نشاط تاجر الجملة المسجّل بيتربط بحسابه — عشان لوحة التحكم تفرز الجاد من اللي بيجمع أسعار
function traderTag() {
  try { const u = currentUser(); return u && u.account === 'wholesale' && userToken() ? { tk: userToken() } : {}; } catch { return {}; }
}
function track(type, data = {}) {
  try {
    if (localStorage.getItem('admin_token')) return; // زيارات صاحب المتجر مش بتتحسب
  } catch {}
  // الخروج من الصفحة: sendBeacon بيوصل حتى والصفحة بتتقفل
  if (type === 'leave' && navigator.sendBeacon) {
    try { navigator.sendBeacon(API + '/track', new Blob([JSON.stringify({ t: type, vid: anonId(), sid: sessId(), br: isWholesale() ? 'ae' : 'eg', ...traderTag(), ...data })], { type: 'application/json' })); return; } catch {}
  }
  try {
    fetch(API + '/track', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ t: type, vid: anonId(), sid: sessId(), br: isWholesale() ? 'ae' : 'eg', ...traderTag(), ...data }), keepalive: true,
    }).catch(() => {});
  } catch {}
}
function trackPageview(extra = {}) {
  let nv = false, ns = false;
  try { if (!localStorage.getItem('visited')) { localStorage.setItem('visited', '1'); nv = true; } } catch {}
  // جلسة جديدة لو أول صفحة في التاب أو بعد 30 دقيقة خمول
  try {
    const last = Number(sessionStorage.getItem('an_last') || 0);
    if (!last || Date.now() - last > 30 * 60 * 1000) ns = true;
    sessionStorage.setItem('an_last', String(Date.now()));
  } catch { ns = true; }
  const utm = new URLSearchParams(location.search).get('utm_source') || '';
  track('view', { path: location.pathname, q: location.search.slice(0, 80), nv, ns, ref: ns ? document.referrer : '', utm: ns ? utm : '', locked: wsLocked() ? 1 : 0, cart: Object.keys(getCart()).length, ...extra });
}
function trackEvent(ev, extra = {}) {
  track('event', { ev, ...extra });
  // 📣 نفس الأحداث بتروح لفيسبوك بالأسماء القياسية (للإعلانات والـ Retargeting)
  const map = { add_cart: 'AddToCart', checkout: 'InitiateCheckout', ws_order: 'Lead', container_request: 'Lead', part_request: 'Lead' };
  if (ev === 'order_placed') px('Purchase', { value: Number(extra.val) || 0, currency: 'EGP', order_id: extra.ord });
  else if (map[ev]) px(map[ev], extra.pid ? { content_ids: [extra.pid], content_type: 'product' } : {});
  else if (ev === 'wa_click') px('Contact', {});
  try { if (window.gtag) gtag('event', ev === 'order_placed' ? 'purchase' : ev, ev === 'order_placed' ? { value: Number(extra.val) || 0, currency: 'EGP', transaction_id: extra.ord } : {}); } catch {}
}
// 🔎 تسجيل البحث (مرة واحدة لكل كلمة في الجلسة) — n=0 يعني مالقاش حاجة متاحة في المخزون
// بنستنى العميل يخلّص كتابة (ثانية ونص من غير كتابة) — عشان مانسجّلش "طقم فوانيس خ" و"خا" و"خلف" كل واحدة لوحدها
let _searchTimer = null, _searchPending = null;
function flushSearch() {
  clearTimeout(_searchTimer);
  const x = _searchPending; _searchPending = null;
  if (!x) return;
  try { if (sessionStorage.getItem('an_lastq') === x.q) return; sessionStorage.setItem('an_lastq', x.q); } catch {}
  trackEvent('search', x);
}
function trackSearch(q, n) {
  q = String(q || '').trim().toLowerCase();
  if (q.length < 3) return;
  _searchPending = { q, n };
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(flushSearch, 1500);
}
window.addEventListener('pagehide', flushSearch);
// زيارة الصفحة تلقائياً (ما عدا لوحة التحكم، أو الصفحات اللي بتسجّل بنفسها زي المنتج)
document.addEventListener('DOMContentLoaded', () => {
  if (window.SKIP_AUTOVIEW || /admin/.test(location.pathname)) return;
  trackPageview();
});
// 🔒 "سجّل دخول لرؤية السعر" جوه الكارت: يودّي لصفحة الحساب بدل صفحة المنتج
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-login]');
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  location.href = '/account.html?mode=register&next=' + encodeURIComponent(location.pathname + location.search);
}, true);
// تتبّع نقرات واتساب
document.addEventListener('click', (e) => {
  if (e.target.closest('a[href^="https://wa.me"]')) trackEvent('whatsapp');
}, true);

/* ---------- حساب العميل ---------- */
function currentUser() {
  try { return JSON.parse(localStorage.getItem('user')) || null; }
  catch { return null; }
}
function userToken() { return localStorage.getItem('user_token') || ''; }
function setSession(token, user) {
  localStorage.setItem('user_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function clearSession() {
  localStorage.removeItem('user_token');
  localStorage.removeItem('user');
}
function userHeaders() {
  return userToken() ? { Authorization: 'Bearer ' + userToken() } : {};
}

/* ---------- السلة (localStorage) ---------- */
function getCart() {
  try { return JSON.parse(localStorage.getItem('cart')) || {}; }
  catch { return {}; }
}
function setCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}
function addToCart(id, qty = 1) {
  const cart = getCart();
  cart[id] = (cart[id] || 0) + qty;
  setCart(cart);
  toast(t('toast_added'), { href: '/cart.html', label: LANG === 'en' ? 'Checkout →' : 'كمّل الطلب ←' });
  trackEvent('add_cart', { pid: id });
}
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  setCart(cart);
  const pc = getPartChoices();
  if (pc[id]) { delete pc[id]; try { localStorage.setItem('cartPart', JSON.stringify(pc)); } catch {} }
}
/* 🔢 البارت نمبر اللي العميل اختاره لكل قطعة في السلة (لنفس القطعة أكتر من رقم) */
function getPartChoices() {
  try { return JSON.parse(localStorage.getItem('cartPart')) || {}; }
  catch { return {}; }
}
function setPartChoice(id, partNumber) {
  const pc = getPartChoices();
  if (partNumber) pc[id] = String(partNumber); else delete pc[id];
  try { localStorage.setItem('cartPart', JSON.stringify(pc)); } catch {}
}
function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}
/* 🛒 شريط ثابت «كمّل الطلب» — بيظهر طول ما السلة فيها حاجة (الزوار كانوا بيحطوا في السلة ومش بيرجعولها) */
function updateCartBar() {
  if (/\/(cart|account|admin)\.html/.test(location.pathname)) return;
  const n = cartCount();
  let bar = document.getElementById('cart-bar');
  if (!n) { if (bar) bar.remove(); document.body.classList.remove('has-cartbar'); return; }
  if (!bar) {
    bar = document.createElement('a');
    bar.id = 'cart-bar';
    bar.className = 'cart-bar';
    bar.href = '/cart.html';
    bar.addEventListener('click', () => trackEvent('cartbar_click'));
    document.body.appendChild(bar);
  }
  bar.innerHTML = `<span>🛒 ${LANG === 'en' ? 'Cart' : 'سلتك'} (${n})</span><b>${LANG === 'en' ? 'Complete order →' : 'كمّل الطلب ←'}</b>`;
  document.body.classList.add('has-cartbar');
}
document.addEventListener('DOMContentLoaded', () => { try { updateCartBar(); } catch {} });

function updateCartBadge() {
  try { updateCartBar(); } catch {}
  const badge = document.querySelector('.cart-badge');
  if (badge) {
    const n = cartCount();
    badge.textContent = n;
    badge.style.display = n > 0 ? 'grid' : 'none';
  }
  const wBadge = document.querySelector('.wish-badge');
  if (wBadge) {
    const n = getWishlist().length;
    wBadge.textContent = n;
    wBadge.style.display = n > 0 ? 'grid' : 'none';
  }
}

/* ---------- المفضلة ---------- */
function getWishlist() {
  try { return JSON.parse(localStorage.getItem('wishlist')) || []; }
  catch { return []; }
}
function toggleWishlist(id) {
  let list = getWishlist();
  const has = list.includes(id);
  list = has ? list.filter((x) => x !== id) : [...list, id];
  localStorage.setItem('wishlist', JSON.stringify(list));
  updateCartBadge();
  toast(has ? t('wish_removed') : t('wish_added'));
  return !has;
}
function inWishlist(id) { return getWishlist().includes(id); }

/* ---------- 🚗 جراج عربيتي ---------- */
const CAR_GROUPS = {
  BMW: [
    ['E36', '3 · 1990-2000'], ['E46', '3 · 1998-2006'], ['E90', '3 · 2005-2012'], ['E92', '3 Coupé · 2006-2013'],
    ['F30', '3 · 2012-2019'], ['G20', '3 · 2019+'], ['E87', '1 · 2004-2011'], ['F20', '1 · 2011-2019'],
    ['E39', '5 · 1995-2004'], ['E60', '5 · 2003-2010'], ['F10', '5 · 2010-2017'], ['G30', '5 · 2017+'],
    ['E65', '7 · 2001-2008'], ['F01', '7 · 2008-2015'], ['F02', '7 L · 2008-2015'],
    ['E84', 'X1 · 2009-2015'], ['F48', 'X1 · 2015-2022'], ['E83', 'X3 · 2003-2010'], ['F25', 'X3 · 2010-2017'],
    ['G01', 'X3 · 2017+'], ['E70', 'X5 · 2006-2013'], ['F15', 'X5 · 2013-2018'], ['G05', 'X5 · 2018+'], ['F16', 'X6 · 2014-2019'],
  ],
  MINI: [
    ['R56', 'Hatch · 2006-2013'], ['R55', 'Clubman · 2007-2014'], ['R60', 'Countryman · 2010-2016'],
    ['F56', 'Hatch · 2014+'], ['F55', '5-door · 2014+'], ['F54', 'Clubman · 2015+'], ['F60', 'Countryman · 2017+'],
  ],
};
const CAR_MODELS = Object.values(CAR_GROUPS).flat().map((x) => x[0]);

function getGarage() {
  try {
    const g = JSON.parse(localStorage.getItem('garage')) || null;
    if (g && g.model) g.model = String(g.model).toUpperCase();
    return g && g.model ? g : null;
  } catch { return null; }
}
function garageLabel(g = getGarage()) {
  if (!g) return '';
  const row = Object.values(CAR_GROUPS).flat().find((x) => x[0] === g.model);
  let fam = row ? row[1].split(' · ')[0] : '';
  if (/^\d$/.test(fam)) fam = (LANG === 'en' ? 'Series ' : 'الفئة ') + fam;
  return g.model + (fam ? ' · ' + fam : '') + (g.year ? ' ' + g.year : '');
}
// 🚗 هل القطعة بتركب على عربية العميل؟ true / false / null (مش معروف)
function fitsCar(p) {
  const g = getGarage();
  const codes = (p && p.fits) || [];
  if (!g || !codes.length) return null;
  return codes.includes(g.model);
}
function openGarageModal() {
  document.getElementById('garage-modal')?.remove();
  const garage = getGarage();
  const modal = document.createElement('div');
  modal.id = 'garage-modal';
  modal.className = 'modal-overlay open';
  let sel = garage?.model || '';
  const grid = Object.entries(CAR_GROUPS).map(([brand, list]) => `
    <div class="gm-brand">${brand === 'MINI' ? 'MINI Cooper' : 'BMW'}</div>
    <div class="gm-grid">${list.map(([c, d]) => `<button type="button" class="gm-car ${sel === c ? 'on' : ''}" data-c="${c}"><b>${c}</b><small>${d}</small></button>`).join('')}</div>`).join('');
  modal.innerHTML = `
  <div class="modal gm-modal">
    <button class="gm-x" type="button" aria-label="close">✕</button>
    <h3>${t('garage_title')}</h3>
    <p style="color: var(--muted); font-size: 13px; margin-bottom: 10px;">${t('garage_sub')}</p>
    <input id="g-search" type="search" placeholder="${LANG === 'en' ? 'Search: F30, X5, 2015…' : 'ابحث: F30 أو X5 أو 2015…'}" dir="ltr">
    <div class="gm-list">${grid}</div>
    <div class="gm-foot">
      <input id="g-year" type="number" min="1985" max="2030" placeholder="${t('garage_year')}" value="${garage?.year || ''}">
      <button class="btn" id="g-save" ${sel ? '' : 'disabled'}>${t('garage_save')}</button>
    </div>
    ${garage ? `<button class="btn btn-outline btn-sm" id="g-remove" style="width:100%;margin-top:8px;">${t('garage_remove')}</button>` : ''}
  </div>`;
  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  modal.querySelector('.gm-x').addEventListener('click', close);
  modal.querySelectorAll('.gm-car').forEach((b) => b.addEventListener('click', () => {
    sel = b.dataset.c;
    modal.querySelectorAll('.gm-car').forEach((x) => x.classList.toggle('on', x === b));
    modal.querySelector('#g-save').disabled = false;
  }));
  modal.querySelector('#g-search').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    const yr = /^\d{4}$/.test(q) ? Number(q) : 0;
    modal.querySelectorAll('.gm-car').forEach((b) => {
      const txt = b.textContent.toLowerCase();
      let show = !q || txt.includes(q);
      if (yr) { const m = txt.match(/(\d{4})-?(\d{4})?(\+)?/); show = !!m && yr >= +m[1] && (m[3] || yr <= +(m[2] || m[1])); }
      b.style.display = show ? '' : 'none';
    });
  });
  modal.querySelector('#g-save').addEventListener('click', () => {
    if (!sel) return;
    localStorage.setItem('garage', JSON.stringify({ model: sel, year: modal.querySelector('#g-year').value.trim() }));
    toast(t('garage_saved'));
    close();
    if (typeof window.onGarageChange === 'function') window.onGarageChange();
    else location.reload();
  });
  modal.querySelector('#g-remove')?.addEventListener('click', () => {
    localStorage.removeItem('garage');
    close();
    if (typeof window.onGarageChange === 'function') window.onGarageChange();
    else location.reload();
  });
}
// شارة التوافق مع عربية العميل على صفحة المنتج
function compatBadge(p) {
  const g = getGarage();
  if (!g) return '';
  const fit = fitsCar(p);
  const m = esc(garageLabel(g));
  if (fit === true) return `<div class="compat compat-ok">${t('compat_ok', { m })}</div>`;
  if (fit === false) return `<div class="compat compat-no">${t('compat_no', { m })}</div>`;
  return `<div class="compat compat-ask">${t('compat_ask', { m })}</div>`;
}

/* ---------- شاهدتها مؤخراً ---------- */
function pushRecent(id) {
  let list = [];
  try { list = JSON.parse(localStorage.getItem('recent')) || []; } catch {}
  list = [id, ...list.filter((x) => x !== id)].slice(0, 8);
  localStorage.setItem('recent', JSON.stringify(list));
}
function getRecent() {
  try { return JSON.parse(localStorage.getItem('recent')) || []; }
  catch { return []; }
}

/* ---------- أدوات عرض ---------- */
function money(n) {
  if (isWholesale()) {
    if (WCUR === 'usd') {
      const v = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
      return '$ ' + v;
    }
    const v = new Intl.NumberFormat(LANG === 'en' ? 'en-US' : 'ar-EG', { maximumFractionDigits: 2 }).format(n);
    return LANG === 'en' ? 'AED ' + v : v + ' د.إ';
  }
  if (LANG === 'en') return SITE.currencyEn + ' ' + new Intl.NumberFormat('en-EG').format(n);
  return new Intl.NumberFormat('ar-EG').format(n) + ' ' + SITE.currency;
}
// 🇪🇬 مبالغ الطلبات والنقاط والرصيد محفوظة بالجنيه دايماً — نعرضها بالجنيه حتى لو الموقع في وضع الجملة
function moneyEGP(n) {
  if (LANG === 'en') return SITE.currencyEn + ' ' + new Intl.NumberFormat('en-EG').format(n);
  return new Intl.NumberFormat('ar-EG').format(n) + ' ' + SITE.currency;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// اسم المنتج ووصفه باللغة الحالية
// 🔗 رابط المنتج: على الموقع الرابط النظيف /p/… (أحسن لجوجل) — في التطبيق الملف المحلي
function productUrl(p) { return window.Capacitor ? '/product.html?id=' + encodeURIComponent(p.id) : '/' + (LANG === 'en' ? 'en/' : '') + 'p/' + encodeURIComponent(p.id); }
function pname(p) { return LANG === 'en' && p.nameEn ? p.nameEn : p.name; }
function pdesc(p) { return LANG === 'en' && p.descriptionEn ? p.descriptionEn : p.description; }

const CATEGORY_ICONS = {
  'فرامل': '🛑', 'فلاتر وصيانة': '🛢️', 'عفشة وتعليق': '🔩',
  'كهرباء وإشعال': '⚡', 'تبريد': '❄️', 'وقود': '⛽', 'محرك': '⚙️',
  'هيكل وإكسسوارات': '🚗', 'أخرى': '🔧',
};
function categoryIcon(cat) { return CATEGORY_ICONS[cat] || '🔧'; }

function imgFallback(img, icon) {
  const d = document.createElement('div');
  d.className = img.className + ' img-placeholder';
  d.innerHTML = '<span>' + (icon || '🔧') + '</span>';
  img.replaceWith(d);
}
// 🖼️ الصور المحفوظة قبل كده بدومين الموقع/مسار نسبي (/media/...) — مكانها الحقيقي سيرفر موس تك
const MEDIA_BASE = (SITE.mediaBase || 'https://fixit-02e0.mousstec.com').replace(/\/+$/, '');
function fixMediaUrl(u) {
  u = String(u || '').trim();
  if (/^\/media\//i.test(u)) return MEDIA_BASE + u;
  return u.replace(/^https?:\/\/(www\.)?fixitauto\.parts(?=\/media\/)/i, MEDIA_BASE);
}
function firstImage(p) {
  return fixMediaUrl(p.image || (Array.isArray(p.images) && p.images[0]) || '');
}
function productImage(p, cssClass = 'card-img') {
  const src = firstImage(p);
  // لو رابط الصورة بايظ/انتهى، نعرض أيقونة الفئة بدل مربع فاضي
  if (src) return `<img class="${cssClass}" src="${esc(src)}" alt="${esc(pname(p))}${p.oem ? ' ' + esc(p.oem) : ''}" loading="lazy" decoding="async" onerror="imgFallback(this, '${categoryIcon(p.category)}')">`;
  return `<div class="${cssClass} img-placeholder"><span>${categoryIcon(p.category)}</span></div>`;
}

function conditionBadge(p) {
  return p.condition === 'used'
    ? `<span class="badge badge-used">${t('cond_used')}</span>`
    : `<span class="badge badge-new">${t('cond_new')}</span>`;
}

function starsHtml(avg, count) {
  if (!count) return '';
  const full = Math.round(avg);
  return `<span class="stars">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span class="stars-count">(${count})</span>`;
}

function productCard(p) {
  const out = p.stock <= 0;
  const discount = !isWholesale() && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `
  <a class="card ${out ? 'card-out' : ''}" href="${productUrl(p)}">
    <div class="card-img-wrap">
      ${productImage(p)}
      ${discount ? `<span class="discount-tag">${LANG === 'en' ? discount + '% ' + t('discount') : t('discount') + ' ' + discount + '%'}</span>` : ''}
      ${isNewArrival(p) ? `<span class="new-ribbon">🆕 ${t('new_arrival')}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-badges">
        ${conditionBadge(p)}
        <span class="badge badge-brand">${esc(p.brand)}</span>
        ${p.supplier ? `<span class="badge badge-supplier" title="${t('supplier')}">${esc(p.supplier)}</span>` : ''}
        ${p.stock > 0 && p.stock <= 2 ? `<span class="badge badge-used">⏳ ${t('low_left', { n: p.stock })}</span>` : ''}
      </div>
      <h3 class="card-title">${esc(pname(p))}</h3>
      ${fitsCar(p) === true ? `<div class="fit-badge">✅ ${t('fits_yours')}</div>` : ''}
      <div class="card-models">${((p.fits && p.fits.length) ? p.fits : p.models.filter((m) => m && m !== '—')).slice(0, 6).map((m) => esc(m)).join(' • ')}</div>
      ${p.ratingCount ? `<div class="card-rating">${starsHtml(p.ratingAvg, p.ratingCount)}</div>` : ''}
      ${isWholesale() && !wsLocked() && dispPrice(p) !== null && wsTiers().length > 1
        ? `<div class="tier-hint">📊 ${t('tier_hint')}</div>` : ''}
      ${deliveryBadge(p, 'card-delivery')}
      <div class="card-footer">
        <div class="card-price">
          ${priceBlock(p)}
        </div>
        ${out
          ? `<span class="stock-out">${t('out_stock')}</span>`
          : `<button class="btn-icon add-btn" data-id="${esc(p.id)}" title="${t('add_cart')}">🛒</button>`}
      </div>
    </div>
  </a>`;
}

// زرار الإضافة للسلة داخل الكروت
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-btn');
  if (btn) {
    e.preventDefault();
    addToCart(btn.dataset.id, 1);
  }
});

// كروت تحميل هيكلية (Skeleton) بدل نص "جاري التحميل"
function skeletonCards(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="card skeleton-card">
      <div class="sk sk-img"></div>
      <div class="card-body">
        <div class="sk sk-line" style="width: 40%;"></div>
        <div class="sk sk-line" style="width: 85%;"></div>
        <div class="sk sk-line" style="width: 60%;"></div>
      </div>
    </div>`).join('');
}

// ظهور تدريجي للعناصر مع السكرول
function initReveal() {
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); }
    });
  }, { threshold: 0.08 });
  const observeAll = () => document.querySelectorAll('.card:not(.shown), .feature:not(.shown), .cat-card:not(.shown)').forEach((el) => {
    el.classList.add('reveal');
    io.observe(el);
  });
  observeAll();
  new MutationObserver(observeAll).observe(document.body, { childList: true, subtree: true });
}
document.addEventListener('DOMContentLoaded', initReveal);

function toast(msg, action) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  if (action) {
    const a = document.createElement('a');
    a.href = action.href; a.textContent = action.label; a.className = 'toast-action';
    el.appendChild(a);
  }
  el.classList.toggle('has-action', !!action);
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), action ? 4000 : 2200);
}

function waLink(text) {
  return `https://wa.me/${waNumber()}?text=${encodeURIComponent(text)}`;
}

/* ---------- البحث الفوري في الهيدر ---------- */
function initHeaderSearch() {
  const input = document.getElementById('hdr-search');
  const box = document.getElementById('hdr-suggest');
  if (!input || !box) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) { box.classList.remove('open'); return; }
    timer = setTimeout(async () => {
      try {
        const results = wsCatalogFilter(await api('/products?q=' + encodeURIComponent(q))).slice(0, 6);
        trackSearch(q, results[0] && results[0]._near ? 0 : results.length);
        box.innerHTML = results.length
          ? (results[0]._near ? `<div class="suggest-empty" style="padding:6px 10px;">🔎 ${LANG === 'en' ? 'Closest results' : 'أقرب نتايج'} — <a href="/shop.html?q=${encodeURIComponent(q)}">${LANG === 'en' ? 'not it? request it' : 'مش هي؟ اطلبها'}</a></div>` : '') + results.map((p) => `
            <a href="${productUrl(p)}" class="suggest-item">
              <span class="suggest-icon">${categoryIcon(p.category)}</span>
              <span class="suggest-name">${esc(pname(p))}<small>${p.models.map(esc).join(' • ')}</small></span>
              <b>${wsLocked() ? '🔒' : (dispPrice(p) === null ? t('price_request') : money(dispPrice(p)))}</b>
            </a>`).join('') + `<a class="suggest-all" href="/shop.html?q=${encodeURIComponent(q)}">${t('suggest_all')}</a>`
          : `<div class="suggest-empty">${t('suggest_none')} "${esc(q)}"
              <a class="btn btn-sm" style="display:block;margin-top:8px;text-align:center;" href="/shop.html?q=${encodeURIComponent(q)}">📩 ${LANG === 'en' ? 'Can\'t find it? Request it — we\'ll source it' : 'مش لاقيها؟ اطلبها — هنوفّرهالك'}</a>
              <a class="btn btn-sm btn-green" style="display:block;margin-top:6px;text-align:center;" target="_blank" rel="noopener" href="${waLink((LANG === 'en' ? 'I need a part: ' : 'محتاج قطعة: ') + q)}">💬 ${LANG === 'en' ? 'Ask on WhatsApp' : 'اطلبها على واتساب'}</a></div>`;
        box.classList.add('open');
      } catch {}
    }, 300);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') location.href = '/shop.html?q=' + encodeURIComponent(input.value.trim());
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.hdr-search-wrap')) box.classList.remove('open');
  });
}

/* ---------- الهيدر والفوتر ---------- */
function siteName() { return LANG === 'en' ? SITE.name : SITE.nameAr + ' FixIt'; }

function logoHtml() {
  // لو الاسم اتغير من الإعدادات نعرضه زي ما هو، غير كده نعرض FixIt بتلوين مميز
  if (SITE.name && SITE.name !== 'FixIt') return esc(SITE.name);
  return 'Fix<em>It</em>';
}

// 🅵🅸🆇🅸🆃 لوجو FixIt الرسمي (SVG) — أزرق بحدود بيضا زي يافطة المحل، والـ X مثلثات
function fixitLogoMark(h = 34) {
  return `
  <svg class="fixit-mark" viewBox="0 0 214 72" height="${h}" role="img" aria-label="FixIt" direction="ltr"
       style="height:${h}px;width:auto;display:block;flex:0 0 auto;overflow:visible;direction:ltr;">
    <g font-family="'Archivo','Segoe UI',system-ui,sans-serif" font-size="58" font-style="italic" font-weight="900"
       direction="ltr" text-anchor="start" fill="#2a2d9e" stroke="#ffffff" stroke-width="7" paint-order="stroke" stroke-linejoin="round">
      <text x="8" y="56">FI</text>
      <text x="146" y="56">IT</text>
    </g>
    <g fill="#2a2d9e" stroke="#ffffff" stroke-width="7" paint-order="stroke" stroke-linejoin="round">
      <polygon points="76,14 92,36 76,58 90,58 106,40 122,58 136,58 120,36 136,14 122,14 106,32 90,14"></polygon>
    </g>
  </svg>`;
}

function renderLayout(active = '') {
  window._layoutRendered = true;
  window._active = active;
  const user = currentUser();
  const otherLang = LANG === 'ar' ? 'en' : 'ar';
  const topbarMsg = isWholesale()
    ? `🇦🇪 ${t('ws_topbar')}`
    : ((LANG === 'en' ? SETTINGS.topbarEn : SETTINGS.topbarAr) ||
      `${t('topbar')} ${SITE.freeShippingOver ? `— ${t('topbar_free')} ${money(SITE.freeShippingOver)}` : ''}`);
  // مبدّل الفرع: قطاعي مصر ⇄ جملة الإمارات
  const branchSwitch = `
    <div class="branch-switch" title="${t('branch_hint')}">
      <button class="${!isWholesale() ? 'active' : ''}" onclick="setMode('retail')">🇪🇬 ${t('branch_retail')}</button>
      <button class="${isWholesale() ? 'active' : ''}" onclick="setMode('wholesale')">🇦🇪 ${t('branch_wholesale')}</button>
    </div>`;
  // مبدّل العملة (يظهر في الجملة فقط)
  const curSwitch = isWholesale() ? `
    <div class="cur-switch" title="${t('cur_hint')}">
      <button class="${WCUR === 'aed' ? 'active' : ''}" onclick="setWCur('aed')">${t('cur_aed')}</button>
      <button class="${WCUR === 'usd' ? 'active' : ''}" onclick="setWCur('usd')">${t('cur_usd')}</button>
    </div>` : '';
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
    <div class="topbar">${topbarMsg} &nbsp;|&nbsp; <a href="${waLink(t('wa_greeting'))}" target="_blank" rel="noopener">${t('whatsapp')}: ${esc(phoneDisplay())}</a></div>
    <header class="header">
      <div class="container header-inner">
        <a class="logo ${isWholesale() ? '' : 'logo-brand'}" href="${isWholesale() ? '/trade.html' : '/index.html'}">
          ${isWholesale()
            ? `<span class="logo-mark">🌐</span><span class="logo-text">Fix<em>It</em> <span class="trade-tag">TRADE</span><small>${LANG === 'en' ? esc(wsConf().taglineEn || '') : esc(wsConf().taglineAr || '')}</small></span>`
            : (SITE.name && SITE.name !== 'FixIt'
              ? `<span class="logo-mark">🔧</span><span class="logo-text">${logoHtml()}<small>${t('brand_tag')}</small></span>`
              : `${fixitLogoMark(36)}<small class="logo-tagline">${t('brand_tag')}</small>`)}
        </a>
        <div class="hdr-search-wrap">
          <input id="hdr-search" type="search" placeholder="${t('search_ph')}" autocomplete="off">
          <div class="hdr-suggest" id="hdr-suggest"></div>
        </div>
        <div class="header-actions">
          ${branchSwitch}
          ${curSwitch}
          <button class="lang-btn" onclick="setLang('${otherLang}')" title="Switch language">${otherLang === 'en' ? 'EN' : 'عربي'}</button>
          ${isWholesale() ? '' : `<button class="lang-btn garage-chip" onclick="openGarageModal()">${getGarage() ? '🚗 ' + esc(getGarage().model) + ' ✓' : t('garage_btn')}</button>`}
          <a class="hdr-icon" href="/account.html" title="${user ? esc(user.name) : t('login')}">
            👤 <small>${user ? esc(user.name.split(' ')[0]) : t('login')}</small>
          </a>
          <a class="hdr-icon wish-link" href="/wishlist.html" title="${t('footer_wish')}">
            ❤️ <span class="wish-badge">0</span>
          </a>
          <a class="hdr-icon cart-link" href="/cart.html" title="${t('cart')}">
            🛒 <span class="cart-badge">0</span>
          </a>
        </div>
      </div>
      <nav class="nav-bar">
        <div class="container nav" id="main-nav">
          ${isWholesale() ? `
          <a href="/trade.html" class="${active === 'trade' ? 'active' : ''}">${t('nav_trade_desk')}</a>
          <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">${t('nav_catalog')}</a>
          <a href="/shop.html?sort=newest">🆕 ${t('nav_new_arrivals')}</a>
          <a href="/shop.html?brand=BMW" class="nav-prio">⭐ BMW</a>
          <a href="/shop.html?brand=MINI" class="nav-prio">⭐ MINI</a>
          <a href="/shop.html?brand=OTHER">${t('nav_all_makes')}</a>
          <a href="/trade.html#order-pad">${t('nav_quick_order')}</a>
          <a href="/trade.html#rfq">${t('nav_rfq')}</a>
          <a href="/about.html" class="${active === 'about' ? 'active' : ''}">${t('nav_about')}</a>
          <a href="/trade-terms.html" class="${active === 'terms' ? 'active' : ''}">${t('nav_terms')}</a>
          <a href="/track.html" class="${active === 'track' ? 'active' : ''}">${t('nav_track')}</a>
          ` : `
          <a href="/index.html" class="${active === 'home' ? 'active' : ''}">${t('nav_home')}</a>
          <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">${t('nav_shop')}</a>
          <a href="/shop.html?brand=BMW" class="nav-prio">⭐ BMW</a>
          <a href="/shop.html?brand=MINI" class="nav-prio">⭐ MINI</a>
          <a href="/shop.html?brand=OTHER">${t('nav_all_makes')}</a>
          <a href="/shop.html?condition=used">${t('nav_used')}</a>
          <a href="/shop.html?condition=new">${t('nav_new')}</a>
          <a href="/savings.html" class="nav-savings ${active === 'savings' ? 'active' : ''}">${t('nav_savings')}</a>
          <a href="/track.html" class="${active === 'track' ? 'active' : ''}">${t('nav_track')}</a>
          <a href="/assistant.html" class="${active === 'assistant' ? 'active' : ''}">${t('nav_expert')}</a>
          `}
        </div>
      </nav>
    </header>`;
    initHeaderSearch();
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    const wsAddr = LANG === 'en' ? esc(wsConf().addressEn || 'UAE') : esc(wsConf().addressAr || 'الإمارات');
    footer.innerHTML = `
    <footer class="footer">
      ${isWholesale() ? `
      <div class="container footer-grid">
        <div>
          <div class="logo"><span class="logo-mark">🌐</span><span class="logo-text">Fix<em>It</em> <span class="trade-tag">TRADE</span></span></div>
          <p>${t('ft_trade_about')}</p>
          <div class="ft-trust">${t('ft_trade_trust')}</div>
        </div>
        <div>
          <h4>${t('ft_trade_links')}</h4>
          <a href="/trade.html">${t('nav_trade_desk')}</a>
          <a href="/about.html">${t('nav_about')}</a>
          <a href="/shop.html">${t('nav_catalog')}</a>
          <a href="/trade.html#order-pad">${t('nav_quick_order')}</a>
          <a href="/trade.html#rfq">${t('nav_rfq')}</a>
          <a href="/trade.html#faq">${t('faq_title')}</a>
          <a href="/trade-terms.html">${t('nav_terms')}</a>
          <a href="/track.html">${t('footer_track')}</a>
        </div>
        <div>
          <h4>${t('footer_contact')}</h4>
          <a href="${waLink(t('wa_greeting'))}" target="_blank" rel="noopener">📱 ${t('whatsapp')}: ${esc(phoneDisplay())}</a>
          ${wsConf().email ? `<a href="mailto:${esc(wsConf().email)}" dir="ltr" style="text-align:start;">✉️ ${esc(wsConf().email)}</a>` : ''}
          <span>📍 ${wsAddr}</span>
          <a href="/account.html">${t('ws_account_title')}</a>
        </div>
      </div>` : `
      <div class="container footer-grid">
        <div>
          <div class="logo logo-brand">${SITE.name && SITE.name !== 'FixIt' ? `<span class="logo-mark">🔧</span><span class="logo-text">${logoHtml()}</span>` : fixitLogoMark(32)}</div>
          <p>${LANG === 'en' ? esc(SITE.sloganEn) : esc(SITE.slogan)}. ${t('footer_desc')}</p>
          <div class="pay-badges">${t('pay_badges')}</div>
        </div>
        <div>
          <h4>${t('footer_shop')}</h4>
          <a href="/shop.html">${t('footer_all')}</a>
          <a href="/shop.html?brand=BMW">${t('footer_bmw')}</a>
          <a href="/shop.html?brand=MINI">${t('footer_mini')}</a>
          <a href="/wishlist.html">${t('footer_wish')}</a>
          ${window.Capacitor ? '' : [['brakes', 'فرامل'], ['suspension', 'عفشة وتعليق'], ['engine', 'محرك'], ['electrical', 'كهرباء وإشعال'], ['cooling', 'تبريد'], ['filters', 'فلاتر وصيانة']]
            .map(([s, c]) => `<a href="/parts/${s}">${catName(c)}</a>`).join('')}
        </div>
        <div>
          <h4>${t('footer_service')}</h4>
          <a href="/request.html">${t('req_link')} 🔎</a>
          <a href="/track.html">${t('footer_track')}</a>
          <a href="/account.html">${t('footer_account')}</a>
          <a href="/policies.html">${t('footer_policies')}</a>
          <a href="/assistant.html">${t('footer_expert')}</a>
          ${window.Capacitor ? '' : `<a href="/guide">${LANG === 'en' ? 'BMW & MINI guides' : 'دليل أعطال BMW و MINI'}</a>`}
        </div>
        <div>
          <h4>${t('footer_contact')}</h4>
          <a href="${waLink(t('wa_greeting'))}" target="_blank" rel="noopener">📱 ${t('whatsapp')}: ${esc(phoneDisplay())}</a>
          <a href="${esc(SITE.mapsUrl || '#')}" target="_blank" rel="noopener" style="color:inherit;">📍 ${LANG === 'en' ? esc(SITE.addressEn) : esc(SITE.address)} — ${LANG === 'en' ? 'Open in Maps' : 'افتح على الخريطة'} ↗</a>
          <span>🕛 ${LANG === 'en' ? 'Daily 12 PM – 11 PM · Closed Sunday' : 'يوميًا من 12 الظهر لـ 11 بالليل · الأحد إجازة'}</span>
        </div>
      </div>`}
      <div class="footer-bottom">© ${new Date().getFullYear()} ${isWholesale() ? (LANG === 'en' ? esc(wsConf().brandEn || 'FixIt Trade') : esc(wsConf().brandAr || 'فيكس إت تريد')) : esc(SITE.name)} — ${t('footer_rights')} · <a href="/privacy.html" style="color:inherit;text-decoration:underline;">${LANG === 'en' ? 'Privacy Policy' : 'سياسة الخصوصية'}</a></div>
    </footer>
    <a class="wa-float" target="_blank" rel="noopener" href="${waLink(t('wa_part'))}" title="WhatsApp">💬</a>
    ${!['container', 'product', 'cart'].includes(active) && !/\/(product|cart)\.html/.test(location.pathname) ? `<a class="ct-float" href="/container.html">🧩 ${LANG === 'en' ? 'Build / share a container' : 'اعمل أو شارك في حاوية'}</a>` : ''}
    <button class="scroll-top" id="scroll-top" title="⬆">⬆</button>`;

    const topBtn = document.getElementById('scroll-top');
    window.addEventListener('scroll', () => {
      topBtn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  applyI18n();
  updateCartBadge();
  markActiveNav();
  scrollToHash();
}

// 🧭 تحديد الزرار النشط في القائمة حسب الرابط الكامل (مش الصفحة بس) — عشان "وصل حديثاً"
//    و BMW و MINI مايبانوش كأنهم رجّعوا للكتالوج، والقائمة تتحرك لحد الزرار النشط على الموبايل
function markActiveNav() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  const here = location.pathname.replace(/\/$/, '/index.html') + location.search + location.hash;
  const links = [...nav.querySelectorAll('a')];
  const exact = links.find((a) => a.getAttribute('href') === here)
    || links.find((a) => location.hash && a.getAttribute('href') === location.pathname + location.hash);
  if (exact) { links.forEach((a) => a.classList.remove('active')); exact.classList.add('active'); }
  const act = nav.querySelector('a.active');
  if (act) requestAnimationFrame(() => { try { act.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch {} });
}
// ⚓ روابط زي /trade.html#rfq: المحتوى بيترسم بعد التحميل، فالمتصفح مابيلاقيش القسم — نوصله إحنا
function scrollToHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id || scrollToHash._done === location.href) return;
  let tries = 0;
  const go = () => {
    const el = document.getElementById(id);
    if (el && el.offsetParent !== null) { scrollToHash._done = location.href; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    if (++tries < 20) setTimeout(go, 200);
  };
  setTimeout(go, 50);
}
// نفس الصفحة + هاش جديد (طلب سريع ⇄ عرض سعر) — المتصفح بيغيّر الرابط بس
window.addEventListener('hashchange', () => { scrollToHash._done = ''; markActiveNav(); scrollToHash(); });

/* ============================================================
   📱 تهيئة تطبيق الموبايل (Capacitor) — أندرويد / iOS
   كل ده بيشتغل فقط جوه التطبيق (IS_NATIVE)، وعلى الويب مفيش أي تأثير.
   ============================================================ */
function nativePlugin(name) {
  return (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name]) || null;
}

function initNativeApp() {
  if (!IS_NATIVE) return;

  // شريط الحالة: خلفية بلون الهوية ونص فاتح، والمحتوى تحته (مش تحت النوتش)
  const StatusBar = nativePlugin('StatusBar');
  if (StatusBar) {
    try { StatusBar.setOverlaysWebView({ overlay: false }); } catch {}
    try { StatusBar.setStyle({ style: 'DARK' }); } catch {}       // نص فاتح على خلفية غامقة
    try { StatusBar.setBackgroundColor({ color: '#23279c' }); } catch {} // أزرق الهوية (أندرويد)
  }

  // إخفاء شاشة البداية بعد ما الصفحة تجهز فعلاً
  const SplashScreen = nativePlugin('SplashScreen');
  if (SplashScreen) { try { SplashScreen.hide(); } catch {} }

  // زرار الرجوع في أندرويد: يرجّع صفحة، ولو مفيش تاريخ يخرج من التطبيق
  const App = nativePlugin('App');
  if (App && App.addListener) {
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack || (window.history && history.length > 1)) history.back();
        else if (App.exitApp) App.exitApp();
      });
    } catch {}
  }

  // الروابط الخارجية (واتساب/اتصال/إيميل/مواقع) تفتح في تطبيق النظام
  // بدل ما تفتح جوه شاشة التطبيق. الروابط الداخلية للموقع تفضل جوه التطبيق.
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#')) return;
    const isExternalScheme = /^(tel:|mailto:|whatsapp:|geo:|sms:)/i.test(href);
    const isHttp = /^https?:\/\//i.test(href);
    const isInternalHttp = isHttp && (href.startsWith(location.origin) || href.startsWith('https://localhost'));
    if (isExternalScheme || (isHttp && !isInternalHttp)) {
      e.preventDefault();
      // واتساب/اتصال/إيميل: نسلّمها لتطبيق النظام مباشرة عشان يفتح التطبيق الصح.
      // باقي المواقع: نفتحها في متصفح داخلي مريح (يرجع للتطبيق بضغطة).
      const handoff = isExternalScheme || /wa\.me|api\.whatsapp\.com/i.test(href);
      const Browser = nativePlugin('Browser');
      if (!handoff && isHttp && Browser) { try { return void Browser.open({ url: href }); } catch {} }
      window.open(href, '_system');
    }
  }, true);
}

// نشغّل التهيئة أول ما الصفحة تجهز (بعد ما window.Capacitor يبقى متاح)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNativeApp);
} else {
  initNativeApp();
}
