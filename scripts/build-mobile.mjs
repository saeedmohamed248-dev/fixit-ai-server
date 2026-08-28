// 📦 تجهيز محتوى الويب لتطبيق الموبايل (Capacitor)
// بينسخ ملفات الموقع الثابتة (HTML/CSS/JS/الصور) جوه مجلد www/ اللي
// Capacitor بيحزمه داخل تطبيق أندرويد/iOS. الـ API (مجلد api/) مابيتحزمش —
// التطبيق بينده على سيرفر الإنتاج مباشرة (شوف js/app.js).
//
// التشغيل: npm run build:mobile   (بيتنده تلقائياً قبل cap sync)
import { cp, rm, mkdir, readdir, writeFile } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('..', import.meta.url));
const www = join(root, 'www');

// ملفات/مجلدات تُنسخ كما هي (كل حاجة الموقع بيحتاجها في المتصفح)
const COPY_DIRS = ['css', 'js', 'assets'];
const COPY_ROOT_FILES = ['favicon.svg', 'manifest.json', 'robots.txt'];

async function main() {
  // نبدأ من مجلد نظيف عشان مايفضلش ملفات قديمة
  await rm(www, { recursive: true, force: true });
  await mkdir(www, { recursive: true });

  // كل صفحات الـ HTML في جذر المشروع
  const entries = await readdir(root, { withFileTypes: true });
  const htmlFiles = entries
    .filter((e) => e.isFile() && extname(e.name) === '.html')
    .map((e) => e.name);

  for (const f of [...htmlFiles, ...COPY_ROOT_FILES]) {
    try { await cp(join(root, f), join(www, f)); } catch {}
  }
  for (const d of COPY_DIRS) {
    try { await cp(join(root, d), join(www, d), { recursive: true }); } catch {}
  }

  // Capacitor لازم يلاقي index.html في جذر www — موجود بالفعل من نسخ الـ HTML
  const count = htmlFiles.length + COPY_DIRS.length + COPY_ROOT_FILES.length;
  console.log(`✅ اتجهّز محتوى التطبيق في www/ (${htmlFiles.length} صفحة، ${count} عنصر).`);
}

main().catch((e) => { console.error('❌ فشل تجهيز www/:', e); process.exit(1); });
