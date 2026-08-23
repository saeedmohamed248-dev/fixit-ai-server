// كود مشترك بين كل الصفحات: الهيدر، الفوتر، السلة، الحساب، المفضلة، الاتصال بالـ API
const API = '/api';

/* ---------- 🇪🇬🇦🇪 الفرع: قطاعي (مصر) / جملة (الإمارات) ---------- */
// الوضع محفوظ في المتصفح، والافتراضي القطاعي (مصر). العملة في الجملة: درهم/دولار
window.MODE = localStorage.getItem('mode') === 'wholesale' ? 'wholesale' : 'retail';
window.WCUR = localStorage.getItem('wcur') === 'usd' ? 'usd' : 'aed';
function isWholesale() { return MODE === 'wholesale'; }
function wsConf() { return SITE.wholesale || {}; }
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
function dispPrice(p) {
  if (isWholesale()) {
    const aed = Number(p.wholesalePrice) || 0;
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
  const base = Number(p.wholesalePrice) || 0;
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
function customsEstimateUsd(code, cifUsd) {
  const c = (wsConf().customs || {})[code];
  if (!c) return 0;
  return cifUsd * ((Number(c.dutyPct) || 0) / 100) + cifUsd * ((Number(c.vatPct) || 0) / 100) + (Number(c.clearanceUsd) || 0);
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
  if (inc.customs && countryPolicy(code).customs) customs = customsEstimateUsd(code, goods + freight + insurance);
  return { cbm, kg, plan, goods, freight, insurance, customs, total: goods + freight + insurance + customs, port: lane(code).port || '' };
}
function usdMoney(n) { return '$ ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n); }
// وصف الحمولة الموصى بها بلغة العرض
function loadLabel(plan) {
  if (plan.mode === 'EMPTY') return '';
  if (plan.mode === 'LCL') return t('load_lcl');
  const ctName = LANG === 'en' ? plan.container.nameEn : plan.container.nameAr;
  if (plan.mode === 'FCL') return `${ctName} · ${plan.fillPct}%`;
  return `${plan.count}× ${ctName} · ${plan.fillPct}%`;
}

// أسعار الجملة تظهر بس للتجار المسجّلين
function wsLocked() { return isWholesale() && !currentUser(); }
// كتلة السعر الجاهزة (قديم + حالي) أو "السعر عند الطلب" أو قفل تسجيل الدخول
function priceBlock(p) {
  if (wsLocked()) return `<a class="price price-lock" href="/account.html">🔒 ${t('ws_login_price')}</a>`;
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

function applySettings(s) {
  if (!s || typeof s !== 'object') return;
  window.SETTINGS = s;
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
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || (LANG === 'en' ? 'Something went wrong, try again' : 'حصل خطأ، حاول تاني'));
  return data;
}

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
  toast(t('toast_added'));
}
function removeFromCart(id) {
  const cart = getCart();
  delete cart[id];
  setCart(cart);
}
function cartCount() {
  return Object.values(getCart()).reduce((a, b) => a + b, 0);
}
function updateCartBadge() {
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
const CAR_MODELS = ['E36', 'E46', 'E60', 'E90', 'E92', 'F10', 'F20', 'F22', 'F30', 'F32', 'F36', 'G20', 'G30', 'X1', 'X3', 'X5', 'X6', 'R50', 'R55', 'R56', 'R60', 'F54', 'F55', 'F56'];

function getGarage() {
  try { return JSON.parse(localStorage.getItem('garage')) || null; }
  catch { return null; }
}
function openGarageModal() {
  let modal = document.getElementById('garage-modal');
  if (!modal) {
    const garage = getGarage();
    modal = document.createElement('div');
    modal.id = 'garage-modal';
    modal.className = 'modal-overlay open';
    modal.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <h3>${t('garage_title')}</h3>
      <p style="color: var(--muted); font-size: 13px; margin-bottom: 14px;">${t('garage_sub')}</p>
      <div class="form-stack">
        <div><label>${t('garage_model')}</label>
          <select id="g-model">${CAR_MODELS.map((m) => `<option ${garage?.model === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <div><label>${t('garage_year')}</label><input id="g-year" type="number" min="1990" max="2030" value="${garage?.year || ''}"></div>
        <button class="btn" id="g-save">${t('garage_save')}</button>
        ${garage ? `<button class="btn btn-outline btn-sm" id="g-remove">${t('garage_remove')}</button>` : ''}
      </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    modal.querySelector('#g-save').addEventListener('click', () => {
      localStorage.setItem('garage', JSON.stringify({
        model: modal.querySelector('#g-model').value,
        year: modal.querySelector('#g-year').value.trim(),
      }));
      toast(t('garage_saved'));
      modal.remove();
      renderLayout(window._active || '');
    });
    modal.querySelector('#g-remove')?.addEventListener('click', () => {
      localStorage.removeItem('garage');
      modal.remove();
      renderLayout(window._active || '');
    });
  }
}
// شارة التوافق مع عربية العميل على صفحة المنتج
function compatBadge(p) {
  const garage = getGarage();
  if (!garage) return '';
  const label = garage.model + (garage.year ? ' ' + garage.year : '');
  return p.models.includes(garage.model)
    ? `<div class="compat compat-ok">${t('compat_ok', { m: label })}</div>`
    : `<div class="compat compat-no">${t('compat_no', { m: label })}</div>`;
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
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// اسم المنتج ووصفه باللغة الحالية
function pname(p) { return LANG === 'en' && p.nameEn ? p.nameEn : p.name; }
function pdesc(p) { return LANG === 'en' && p.descriptionEn ? p.descriptionEn : p.description; }

const CATEGORY_ICONS = {
  'فرامل': '🛑', 'فلاتر وصيانة': '🛢️', 'عفشة وتعليق': '🔩',
  'كهرباء وإشعال': '⚡', 'تبريد': '❄️', 'وقود': '⛽', 'هيكل وإكسسوارات': '🚗',
};
function categoryIcon(cat) { return CATEGORY_ICONS[cat] || '🔧'; }

function firstImage(p) {
  return p.image || (Array.isArray(p.images) && p.images[0]) || '';
}
function productImage(p, cssClass = 'card-img') {
  const src = firstImage(p);
  if (src) return `<img class="${cssClass}" src="${esc(src)}" alt="${esc(pname(p))}" loading="lazy">`;
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
  <a class="card ${out ? 'card-out' : ''}" href="/product.html?id=${esc(p.id)}">
    <div class="card-img-wrap">
      ${productImage(p)}
      ${discount ? `<span class="discount-tag">${LANG === 'en' ? discount + '% ' + t('discount') : t('discount') + ' ' + discount + '%'}</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-badges">
        ${conditionBadge(p)}
        <span class="badge badge-brand">${esc(p.brand)}</span>
        ${p.stock > 0 && p.stock <= 2 ? `<span class="badge badge-used">⏳ ${t('low_left', { n: p.stock })}</span>` : ''}
      </div>
      <h3 class="card-title">${esc(pname(p))}</h3>
      <div class="card-models">${p.models.map((m) => esc(m)).join(' • ')}</div>
      ${p.ratingCount ? `<div class="card-rating">${starsHtml(p.ratingAvg, p.ratingCount)}</div>` : ''}
      ${isWholesale() && !wsLocked() && dispPrice(p) !== null && wsTiers().length > 1
        ? `<div class="tier-hint">📊 ${t('tier_hint')}</div>` : ''}
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

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
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
        const results = (await api('/products?q=' + encodeURIComponent(q))).slice(0, 6);
        box.innerHTML = results.length
          ? results.map((p) => `
            <a href="/product.html?id=${esc(p.id)}" class="suggest-item">
              <span class="suggest-icon">${categoryIcon(p.category)}</span>
              <span class="suggest-name">${esc(pname(p))}<small>${p.models.map(esc).join(' • ')}</small></span>
              <b>${wsLocked() ? '🔒' : (dispPrice(p) === null ? t('price_request') : money(dispPrice(p)))}</b>
            </a>`).join('') + `<a class="suggest-all" href="/shop.html?q=${encodeURIComponent(q)}">${t('suggest_all')}</a>`
          : `<div class="suggest-empty">${t('suggest_none')} "${esc(q)}" — <a href="/assistant.html">${t('ask_expert')}</a></div>`;
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
        <a class="logo" href="${isWholesale() ? '/trade.html' : '/index.html'}">
          <span class="logo-mark">${isWholesale() ? '🌐' : '🔧'}</span>
          <span class="logo-text">${isWholesale()
            ? `Fix<em>It</em> <span class="trade-tag">TRADE</span><small>${LANG === 'en' ? esc(wsConf().taglineEn || '') : esc(wsConf().taglineAr || '')}</small>`
            : `${logoHtml()}<small>${t('brand_tag')}</small>`}</span>
        </a>
        <div class="hdr-search-wrap">
          <input id="hdr-search" type="search" placeholder="${t('search_ph')}" autocomplete="off">
          <div class="hdr-suggest" id="hdr-suggest"></div>
        </div>
        <div class="header-actions">
          ${branchSwitch}
          ${curSwitch}
          <button class="lang-btn" onclick="setLang('${otherLang}')" title="Switch language">${otherLang === 'en' ? 'EN' : 'عربي'}</button>
          ${isWholesale() ? '' : `<button class="lang-btn garage-chip" onclick="openGarageModal()">${getGarage() ? '🚗 ' + esc(getGarage().model) : t('garage_btn')}</button>`}
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
          <a href="/shop.html?brand=BMW">BMW</a>
          <a href="/shop.html?brand=MINI">MINI</a>
          <a href="/trade.html#order-pad">${t('nav_quick_order')}</a>
          <a href="/trade.html#rfq">${t('nav_rfq')}</a>
          <a href="/track.html" class="${active === 'track' ? 'active' : ''}">${t('nav_track')}</a>
          ` : `
          <a href="/index.html" class="${active === 'home' ? 'active' : ''}">${t('nav_home')}</a>
          <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">${t('nav_shop')}</a>
          <a href="/shop.html?brand=BMW">BMW</a>
          <a href="/shop.html?brand=MINI">MINI</a>
          <a href="/shop.html?condition=used">${t('nav_used')}</a>
          <a href="/shop.html?condition=new">${t('nav_new')}</a>
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
    footer.innerHTML = `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <div class="logo"><span class="logo-mark">🔧</span><span class="logo-text">${logoHtml()}</span></div>
          <p>${LANG === 'en' ? esc(SITE.sloganEn) : esc(SITE.slogan)}. ${t('footer_desc')}</p>
          <div class="pay-badges">${t('pay_badges')}</div>
        </div>
        <div>
          <h4>${t('footer_shop')}</h4>
          <a href="/shop.html">${t('footer_all')}</a>
          <a href="/shop.html?brand=BMW">${t('footer_bmw')}</a>
          <a href="/shop.html?brand=MINI">${t('footer_mini')}</a>
          <a href="/wishlist.html">${t('footer_wish')}</a>
        </div>
        <div>
          <h4>${t('footer_service')}</h4>
          <a href="/request.html">${t('req_link')} 🔎</a>
          <a href="/track.html">${t('footer_track')}</a>
          <a href="/account.html">${t('footer_account')}</a>
          <a href="/policies.html">${t('footer_policies')}</a>
          <a href="/assistant.html">${t('footer_expert')}</a>
        </div>
        <div>
          <h4>${t('footer_contact')}</h4>
          <a href="${waLink(t('wa_greeting'))}" target="_blank" rel="noopener">📱 ${t('whatsapp')}: ${esc(phoneDisplay())}</a>
          <span>📍 ${isWholesale()
            ? (LANG === 'en' ? esc(wsConf().addressEn || 'UAE') : esc(wsConf().addressAr || 'الإمارات'))
            : (LANG === 'en' ? esc(SITE.addressEn) : esc(SITE.address))}</span>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(SITE.name)} — ${t('footer_rights')}</div>
    </footer>
    <a class="wa-float" target="_blank" rel="noopener" href="${waLink(t('wa_part'))}" title="WhatsApp">💬</a>
    <button class="scroll-top" id="scroll-top" title="⬆">⬆</button>`;

    const topBtn = document.getElementById('scroll-top');
    window.addEventListener('scroll', () => {
      topBtn.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  applyI18n();
  updateCartBadge();
}
