// 🔎 SEO: بيكتب النص العربي جوه عناصر data-i18n الفاضية في صفحات HTML الثابتة
// عشان جوجل يشوف العناوين والنصوص من غير ما يستنى الجافاسكريبت.
// الترجمة بتفضل شغالة عادي (applyI18n بيستبدل المحتوى). شغّله: node scripts/prerender-i18n.mjs
import fs from 'fs';
import vm from 'vm';
const src = fs.readFileSync('js/i18n.js', 'utf8');
const store = {};
const ctx = {}; ctx.window = ctx; Object.assign(ctx, { location: { search: '' }, localStorage: { getItem: () => null, setItem() {} }, document: { documentElement: { dataset: {} } }, URLSearchParams });
vm.createContext(ctx);
vm.runInContext(src + '\n;globalThis.__I18N = I18N;', ctx);
const I18N = ctx.__I18N;
let total = 0;
for (const f of fs.readdirSync('.').filter((n) => n.endsWith('.html') && n !== 'admin.html')) {
  let html = fs.readFileSync(f, 'utf8'); let n = 0;
  html = html.replace(/(<([a-z0-9]+)\b[^>]*\bdata-i18n="([^"]+)"[^>]*>)(<\/\2>)/g, (m, open, tag, key, close) => {
    const v = I18N[key] && I18N[key].ar;
    if (!v || /\{\w+\}/.test(v)) return m;
    n++; return open + v + close;
  });
  html = html.replace(/(<input\b[^>]*\bdata-i18n-ph="([^"]+)")(?![^>]*placeholder=)([^>]*>)/g, (m, a, key, b) => {
    const v = I18N[key] && I18N[key].ar; if (!v) return m; n++;
    return `${a} placeholder="${v.replace(/"/g, '&quot;')}"${b}`;
  });
  if (n) { fs.writeFileSync(f, html); total += n; console.log(f, n); }
}
console.log('filled', total);
