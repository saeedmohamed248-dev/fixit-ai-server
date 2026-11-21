import type { Lang } from './i18n';
import type { Product, Settings } from './types';

export function money(lang: Lang, n: number) {
  const v = Math.round(Number(n) || 0);
  if (lang === 'en') return 'EGP ' + v.toLocaleString('en-US');
  return v.toLocaleString('ar-EG') + ' ج.م';
}

export function num(lang: Lang, n: number) {
  return (Number(n) || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ar-EG');
}

export function pName(lang: Lang, p: Pick<Product, 'name' | 'nameEn'>) {
  return (lang === 'en' && p.nameEn) || p.name;
}

export function pDesc(lang: Lang, p: Product) {
  return (lang === 'en' && p.descriptionEn) || p.description || '';
}

export function pImages(p: Product): string[] {
  const list = [...(p.images || [])];
  if (p.image && !list.includes(p.image)) list.unshift(p.image);
  return list.filter(Boolean);
}

/** صورة مصغّرة سريعة من Cloudinary (لو الصورة من هناك) */
export function thumb(url: string | undefined, w = 400) {
  if (!url) return '';
  if (url.includes('res.cloudinary.com') && url.includes('/upload/') && !url.includes('/upload/w_')) {
    return url.replace('/upload/', `/upload/w_${w},c_limit,q_auto,f_auto/`);
  }
  return url;
}

export function discountPct(p: Product) {
  if (!p.oldPrice || p.oldPrice <= p.price || !p.price) return 0;
  return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
}

export const NEW_ARRIVAL_DAYS = 21;
export function isNewArrival(p: Product) {
  if (!p.createdAt) return false;
  return (Date.now() - new Date(p.createdAt).getTime()) / 86400000 <= NEW_ARRIVAL_DAYS;
}

// 🏬 المتجر القطاعي (مصر) بيعرض قطع فروع مصر بس — نفس منطق الموقع
const UAE_RE = /إمارات|امارات|uae|u\.a\.e|dubai|دبي|الشارقة|شارقة|sharjah|أبوظبي|ابوظبي|abu ?dhabi|trade/i;
const isUaeBranch = (b: { name?: string; location?: string }) => UAE_RE.test([b.name, b.location].filter(Boolean).join(' | '));
export function inUaeBranch(p: Product) {
  const stocked = (p.branches || []).filter((b) => Number(b.stock) > 0);
  if (stocked.length) return stocked.some(isUaeBranch);
  const parts = [p.originBranch, p.originLocation];
  for (const b of p.branches || []) parts.push(b.name, b.location);
  return UAE_RE.test(parts.filter(Boolean).join(' | '));
}
export function inEgyptBranch(p: Product) {
  const stocked = (p.branches || []).filter((b) => Number(b.stock) > 0);
  if (stocked.length) return stocked.some((b) => !isUaeBranch(b));
  return !inUaeBranch(p);
}

function featureOn(s: Settings, k: 'freeShip' | 'deposit') {
  const off = k === 'freeShip' ? s.freeShipOff : s.depositOff;
  const until = k === 'freeShip' ? s.freeShipOffUntil : s.depositOffUntil;
  if (off !== true) return true;
  if (until && Date.now() > new Date(until + 'T23:59:59+02:00').getTime()) return true;
  return false;
}
export function freeShippingOver(s: Settings) {
  if (!featureOn(s, 'freeShip')) return 0;
  return Number(s.freeShippingOver) || 0;
}
export function depositEnabled(s: Settings) {
  return featureOn(s, 'deposit');
}
export function calcDeposit(total: number, s: Settings) {
  const t = Math.max(0, Math.round(total));
  let pct = Number(s.depositPct);
  if (!Number.isFinite(pct) || pct <= 0) pct = 20;
  pct = Math.min(90, Math.max(5, pct));
  let min = s.depositMin === undefined || s.depositMin === '' ? 300 : Number(s.depositMin);
  if (!Number.isFinite(min) || min < 0) min = 300;
  let deposit = Math.ceil((t * pct) / 100 / 10) * 10;
  deposit = Math.min(t, Math.max(deposit, min));
  return deposit;
}

export const validPhone = (p: string) => /^01\d{9}$/.test(p.replace(/[\s-]/g, ''));

export function toLatinDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function dateStr(lang: Lang, iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso.slice(0, 10);
  }
}

// 🚗 أسماء الشاسيهات
export const CHASSIS_LABEL: Record<string, string> = {
  E30: '3 Series', E36: '3 Series', E46: '3 Series', E90: '3 Series', E92: '3 Series Coupe', E93: '3 Series Cab', F30: '3 Series', G20: '3 Series',
  E34: '5 Series', E39: '5 Series', E60: '5 Series', E61: '5 Series Touring', F10: '5 Series', F07: '5 GT',
  E63: '6 Series', E65: '7 Series', E66: '7 Series L', F01: '7 Series', F02: '7 Series L',
  E81: '1 Series', E87: '1 Series', F20: '1 Series', F22: '2 Series', F45: '2 Active Tourer', F24: '4 GC', F26: 'X4', F25: 'X3', F15: 'X5', F16: 'X6',
  E70: 'X5', E83: 'X3', E84: 'X1', F48: 'X1', G05: 'X5', E99: 'BMW',
  X1: 'X1', X2: 'X2', X3: 'X3', X4: 'X4', X5: 'X5', X6: 'X6',
  R50: 'Cooper', R52: 'Cooper Cab', R55: 'Clubman', R56: 'Cooper', R57: 'Cooper Cab', R58: 'Coupe', R60: 'Countryman',
  F54: 'Clubman', F55: 'Cooper 5-door', F56: 'Cooper', F57: 'Cooper Cab', F60: 'Countryman',
};
export const isMiniChassis = (c: string) => /^R5|^R6|^F5[4-7]|^F60/.test(c);
