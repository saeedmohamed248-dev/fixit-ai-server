// كود مشترك بين كل الصفحات: الهيدر، الفوتر، السلة، الاتصال بالـ API
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

function productImage(p, cssClass = 'card-img') {
  if (p.image) return `<img class="${cssClass}" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
  return `<div class="${cssClass} img-placeholder"><span>${categoryIcon(p.category)}</span></div>`;
}

function conditionBadge(p) {
  return p.condition === 'used'
    ? '<span class="badge badge-used">مستعمل وارد</span>'
    : '<span class="badge badge-new">جديد</span>';
}

function productCard(p) {
  const out = p.stock <= 0;
  return `
  <a class="card ${out ? 'card-out' : ''}" href="/product.html?id=${esc(p.id)}">
    ${productImage(p)}
    <div class="card-body">
      <div class="card-badges">
        ${conditionBadge(p)}
        <span class="badge badge-brand">${esc(p.brand)}</span>
      </div>
      <h3 class="card-title">${esc(p.name)}</h3>
      <div class="card-models">${p.models.map((m) => esc(m)).join(' • ')}</div>
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

/* ---------- الهيدر والفوتر ---------- */
function renderLayout(active = '') {
  const header = document.getElementById('site-header');
  if (header) {
    header.innerHTML = `
    <div class="topbar">🚚 شحن لجميع المحافظات — قطع مفحوصة وبضمان &nbsp;|&nbsp; <a href="${waLink('السلام عليكم، عندي استفسار')}" target="_blank" rel="noopener">واتساب: ${esc(SITE.phoneDisplay)}</a></div>
    <header class="header">
      <div class="container header-inner">
        <a class="logo" href="/index.html">
          <span class="logo-mark">B</span>
          <span class="logo-text">${esc(SITE.name)}<small>BMW &amp; MINI Parts</small></span>
        </a>
        <nav class="nav ${''}" id="main-nav">
          <a href="/index.html" class="${active === 'home' ? 'active' : ''}">الرئيسية</a>
          <a href="/shop.html" class="${active === 'shop' ? 'active' : ''}">المتجر</a>
          <a href="/shop.html?condition=used">مستعمل وارد</a>
          <a href="/shop.html?condition=new">جديد</a>
          <a href="/assistant.html" class="${active === 'assistant' ? 'active' : ''}">اسأل الخبير 🤖</a>
        </nav>
        <div class="header-actions">
          <a class="cart-link" href="/cart.html" title="السلة">
            🛒 <span class="cart-badge">0</span>
          </a>
          <button class="menu-btn" onclick="document.getElementById('main-nav').classList.toggle('open')">☰</button>
        </div>
      </div>
    </header>`;
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML = `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <div class="logo"><span class="logo-mark">B</span><span class="logo-text">${esc(SITE.name)}</span></div>
          <p>${esc(SITE.slogan)}. كل القطع مفحوصة وبضمان، استيراد مباشر من أوروبا وأمريكا.</p>
        </div>
        <div>
          <h4>روابط سريعة</h4>
          <a href="/shop.html">كل المنتجات</a>
          <a href="/shop.html?brand=BMW">قطع BMW</a>
          <a href="/shop.html?brand=MINI">قطع MINI</a>
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
