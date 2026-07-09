// كود مشترك بين كل الصفحات: الهيدر، الفوتر، السلة، الحساب، المفضلة، الاتصال بالـ API
const API = '/api';

/* ---------- API ---------- */
async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حصل خطأ، حاول تاني');
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
  toast('تمت الإضافة للسلة ✓');
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
  toast(has ? 'اتشالت من المفضلة' : 'اتضافت للمفضلة ❤️');
  return !has;
}
function inWishlist(id) { return getWishlist().includes(id); }

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
  return new Intl.NumberFormat('ar-EG').format(n) + ' ' + SITE.currency;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
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
  if (src) return `<img class="${cssClass}" src="${esc(src)}" alt="${esc(p.name)}" loading="lazy">`;
  return `<div class="${cssClass} img-placeholder"><span>${categoryIcon(p.category)}</span></div>`;
}

function conditionBadge(p) {
  return p.condition === 'used'
    ? '<span class="badge badge-used">مستعمل وارد</span>'
    : '<span class="badge badge-new">جديد</span>';
}

function starsHtml(avg, count) {
  if (!count) return '';
  const full = Math.round(avg);
  return `<span class="stars" title="${avg} من 5">${'★'.repeat(full)}${'☆'.repeat(5 - full)}</span> <span class="stars-count">(${count})</span>`;
}

function productCard(p) {
  const out = p.stock <= 0;
  const discount = p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
  return `
  <a class="card ${out ? 'card-out' : ''}" href="/product.html?id=${esc(p.id)}">
    <div class="card-img-wrap">
      ${productImage(p)}
      ${discount ? `<span class="discount-tag">خصم ${discount}%</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-badges">
        ${conditionBadge(p)}
        <span class="badge badge-brand">${esc(p.brand)}</span>
      </div>
      <h3 class="card-title">${esc(p.name)}</h3>
      <div class="card-models">${p.models.map((m) => esc(m)).join(' • ')}</div>
      ${p.ratingCount ? `<div class="card-rating">${starsHtml(p.ratingAvg, p.ratingCount)}</div>` : ''}
      <div class="card-footer">
        <div class="card-price">
          ${p.oldPrice > p.price ? `<span class="old-price">${money(p.oldPrice)}</span>` : ''}
          <span class="price">${money(p.price)}</span>
        </div>
        ${out
          ? '<span class="stock-out">نفذت الكمية</span>'
          : `<button class="btn-icon add-btn" data-id="${esc(p.id)}" title="أضف للسلة">🛒</button>`}
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
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(text)}`;
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
              <span class="suggest-name">${esc(p.name)}<small>${p.models.map(esc).join(' • ')}</small></span>
              <b>${money(p.price)}</b>
            </a>`).join('') + `<a class="suggest-all" href="/shop.html?q=${encodeURIComponent(q)}">عرض كل النتائج ←</a>`
          : `<div class="suggest-empty">مفيش نتائج لـ "${esc(q)}" — <a href="/assistant.html">اسأل الخبير 🤖</a></div>`;
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
function renderLayout(active = '') {
  const user = currentUser();
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
    <div class="topbar">🚚 شحن لجميع المحافظات ${SITE.freeShippingOver ? `— مجاني فوق ${money(SITE.freeShippingOver)}` : ''} &nbsp;|&nbsp; <a href="${waLink('السلام عليكم، عندي استفسار')}" target="_blank" rel="noopener">واتساب: ${esc(SITE.phoneDisplay)}</a></div>
    <header class="header">
      <div class="container header-inner">
        <a class="logo" href="/index.html">
          <span class="logo-mark">B</span>
          <span class="logo-text">${esc(SITE.name)}<small>BMW &amp; MINI Parts</small></span>
        </a>
        <div class="hdr-search-wrap">
          <input id="hdr-search" type="search" placeholder="🔍 ابحث عن قطعة، رقم OEM، موديل..." autocomplete="off">
          <div class="hdr-suggest" id="hdr-suggest"></div>
        </div>
        <div class="header-actions">
          <a class="hdr-icon" href="/account.html" title="${user ? esc(user.name) : 'حسابي'}">
            👤 <small>${user ? esc(user.name.split(' ')[0]) : 'دخول'}</small>
          </a>
          <a class="hdr-icon wish-link" href="/wishlist.html" title="المفضلة">
            ❤️ <span class="wish-badge">0</span>
          </a>
          <a class="hdr-icon cart-link" href="/cart.html" title="السلة">
            🛒 <span class="cart-badge">0</span>
          </a>
        </div>
      </div>
      <nav class="nav container" id="main-nav">
        <a href="/index.html" class="${active === 'home' ? 'active' : ''}">الرئيسية</a>
        <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">كل القطع</a>
        <a href="/shop.html?brand=BMW">BMW</a>
        <a href="/shop.html?brand=MINI">MINI</a>
        <a href="/shop.html?condition=used">مستعمل وارد</a>
        <a href="/shop.html?condition=new">جديد</a>
        <a href="/track.html" class="${active === 'track' ? 'active' : ''}">تتبع طلبك</a>
        <a href="/assistant.html" class="${active === 'assistant' ? 'active' : ''}">اسأل الخبير 🤖</a>
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
          <div class="logo"><span class="logo-mark">B</span><span class="logo-text">${esc(SITE.name)}</span></div>
          <p>${esc(SITE.slogan)}. كل القطع مفحوصة وبضمان، استيراد مباشر من أوروبا وأمريكا.</p>
          <div class="pay-badges">💵 عند الاستلام &nbsp; 🏦 انستاباي &nbsp; 📱 محافظ إلكترونية</div>
        </div>
        <div>
          <h4>التسوق</h4>
          <a href="/shop.html">كل المنتجات</a>
          <a href="/shop.html?brand=BMW">قطع BMW</a>
          <a href="/shop.html?brand=MINI">قطع MINI</a>
          <a href="/wishlist.html">المفضلة</a>
        </div>
        <div>
          <h4>خدمة العملاء</h4>
          <a href="/track.html">تتبع طلبك</a>
          <a href="/account.html">حسابي</a>
          <a href="/policies.html">الشحن والاسترجاع والضمان</a>
          <a href="/assistant.html">اسأل الخبير</a>
        </div>
        <div>
          <h4>تواصل معنا</h4>
          <a href="${waLink('السلام عليكم')}" target="_blank" rel="noopener">📱 واتساب: ${esc(SITE.phoneDisplay)}</a>
          <span>📍 ${esc(SITE.address)}</span>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} ${esc(SITE.name)} — جميع الحقوق محفوظة</div>
    </footer>
    <a class="wa-float" target="_blank" rel="noopener" href="${waLink('السلام عليكم، عايز أسأل عن قطعة')}" title="كلمنا واتساب">💬</a>`;
  }

  updateCartBadge();
}
