// بيانات أولية — المنتجات الحقيقية بتيجي من مزامنة موس تك (fixit_sync_all).
// سيبنا القائمة فاضية عشان الموقع مايبدأش بأي منتجات تجريبية.
export const CATEGORIES = [
  'فرامل',
  'عفشة وتعليق',
  'محرك',
  'كهرباء وإشعال',
  'تبريد',
  'وقود',
  'فلاتر وصيانة',
  'هيكل وإكسسوارات',
];

// 🚫 مفيش منتجات تجريبية — الكتالوج بيتملّي من موس تك عبر /api/sync
export const SEED_PRODUCTS = [];

// تاريخ إضافة تقريبي (يشتغل عادي لو القائمة فاضية)
SEED_PRODUCTS.forEach((p, i) => {
  if (!p.createdAt) {
    const daysAgo = (SEED_PRODUCTS.length - 1 - i) * 2;
    p.createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
  }
});

// 🚫 مفيش حاويات تجريبية — بتتضاف من لوحة التحكم
export const SEED_CONTAINERS = [];
