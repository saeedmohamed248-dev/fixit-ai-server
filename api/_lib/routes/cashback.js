// 💰 كاش باك — عروض بيحددها الأدمن + رصيد لكل عميل (برقم الموبايل) يشتري بيه تاني
// العرض: قطع معينة (أو الكل) + أقل سعر للقطعة + قيمة الكاش باك (ثابت/نسبة، لكل قطعة/للطلب)
//   + فترة العرض (من/إلى) + صلاحية الرصيد بالأيام + شرط الاستخدام: الفاتورة ≥ (المضاعف × الكاش باك)
// الرصيد بيتسجل "معلّق" مع الطلب، ويتفعّل لما الطلب يتسلّم (delivered)، ويتلغي لو الطلب اتلغى.
//
// GET  /api/cashback?offers=1          → العروض الشغالة (عام)
// GET  /api/cashback?mine=1            → رصيد وحركات العميل المسجّل
// POST /api/cashback {action:'preview', items:[{id,qty}], net} → هيكسب كام + يقدر يستخدم كام
// GET  /api/cashback                   → (إدارة) العروض + ملخص أرصدة العملاء
// GET  /api/cashback?phone=010...      → (إدارة) كشف حساب عميل: الطلبات + حركات الكاش باك
// POST /api/cashback {action:'campaign', campaign}  → (إدارة) إضافة/تعديل عرض
// POST /api/cashback {action:'adjust', phone, amount, note, validDays, multiplier} → (إدارة) إضافة/خصم يدوي
// DELETE /api/cashback?id=...          → (إدارة) حذف عرض
import { getProducts, getOrders, getUsers, logActivity } from '../db.js';
import { getUser } from '../auth.js';
import { cors, requireAdmin, validPhone } from '../util.js';
import * as db from '../db.js';

const DAY = 86400000;
const round = (n) => Math.round(Number(n) || 0);
const normPhone = (p) => String(p || '').replace(/\D/g, '').replace(/^20(?=1\d{9}$)/, '0');

// تخزين: لو db.js مفيهوش الكولكشن، نستخدم الذاكرة (للتجربة المحلية)
const mem = {};
async function col(key) {
  const g = db['get' + key];
  return g ? g() : (mem[key] || []);
}
async function saveCol(key, v) {
  const s = db['save' + key];
  if (s) return s(v);
  mem[key] = v;
}
export const getCampaigns = () => col('CashbackCampaigns');
const saveCampaigns = (v) => saveCol('CashbackCampaigns', v);
export const getLedger = () => col('CashbackLedger');
const saveLedger = (v) => saveCol('CashbackLedger', v);

function inWindow(c, at = Date.now()) {
  if (!c.active) return false;
  if (c.start && at < new Date(c.start + 'T00:00:00+02:00').getTime()) return false;
  if (c.end && at > new Date(c.end + 'T23:59:59+02:00').getTime()) return false;
  return true;
}

// كام كاش باك هيكسب الطلب ده (أفضل عرض واحد — من غير تجميع عروض)
export function computeEarn(items, campaigns, at = Date.now()) {
  let best = null;
  for (const c of campaigns) {
    if (!inWindow(c, at)) continue;
    const ids = Array.isArray(c.productIds) ? c.productIds : [];
    const q = items.filter((i) => (!ids.length || ids.includes(i.id)) && Number(i.price) >= (Number(c.minPrice) || 0));
    if (!q.length) continue;
    const qSub = q.reduce((s, i) => s + i.price * i.qty, 0);
    const qQty = q.reduce((s, i) => s + i.qty, 0);
    const v = Number(c.value) || 0;
    let amount = c.amountType === 'percent'
      ? qSub * v / 100
      : c.per === 'order' ? v : v * qQty;
    if (Number(c.maxPerOrder) > 0) amount = Math.min(amount, Number(c.maxPerOrder));
    amount = round(amount);
    if (amount > 0 && (!best || amount > best.amount)) best = { amount, campaign: c };
  }
  return best;
}

// الأرصدة المتاحة (lots) لعميل
function liveLots(ledger, phone, now = Date.now()) {
  return ledger
    .filter((e) => e.phone === phone && e.kind === 'lot' && e.status === 'active' && e.remaining > 0 &&
      (!e.validUntil || new Date(e.validUntil).getTime() >= now))
    .sort((a, b) => new Date(a.validUntil || 8.64e15) - new Date(b.validUntil || 8.64e15));
}

// كام يقدر يستخدم في فاتورة صافيها net: لازم net ≥ المضاعف × المستخدم
export function redeemPlan(ledger, phone, net) {
  const lots = liveLots(ledger, phone);
  const balance = lots.reduce((s, l) => s + l.remaining, 0);
  let used = 0, maxMult = 1;
  const take = [];
  for (const l of lots) {
    const m = Math.max(maxMult, Number(l.multiplier) || 1);
    const cap = Math.floor(net / m) - used; // أقصى إضافة مع المضاعف ده
    if (cap <= 0) break;
    const amt = Math.min(l.remaining, cap);
    take.push({ id: l.id, amt });
    used += amt; maxMult = m;
    if (amt < l.remaining) break;
  }
  // أقل مضاعف مطلوب لاستخدام كل الرصيد
  const fullMult = lots.reduce((m, l) => Math.max(m, Number(l.multiplier) || 1), 1);
  return { balance, usable: used, take, needForFull: balance * fullMult, multiplier: fullMult };
}

function summarize(ledger, phone) {
  const now = Date.now();
  const lots = ledger.filter((e) => e.phone === phone && e.kind === 'lot');
  return {
    balance: liveLots(ledger, phone, now).reduce((s, l) => s + l.remaining, 0),
    pending: lots.filter((l) => l.status === 'pending').reduce((s, l) => s + l.amount, 0),
    earned: lots.filter((l) => l.status !== 'cancelled' && l.source !== 'adjust').reduce((s, l) => s + l.amount, 0),
    used: ledger.filter((e) => e.phone === phone && e.kind === 'redeem' && !e.reversed).reduce((s, e) => s + e.amount, 0),
  };
}

// ========== ربط مع الطلبات ==========
// بيتنادى من orders.js جوه إنشاء الطلب (قبل الحفظ)
export async function applyToNewOrder(order, { redeem, phone }) {
  const ledger = await getLedger();
  const campaigns = await getCampaigns();
  const p = normPhone(phone || order.customer.phone);
  let cashbackUsed = 0;
  if (redeem) {
    const plan = redeemPlan(ledger, p, order.total);
    for (const t of plan.take) {
      const lot = ledger.find((l) => l.id === t.id);
      lot.remaining -= t.amt;
    }
    cashbackUsed = plan.usable;
    if (cashbackUsed > 0) {
      ledger.push({ id: 'cr' + Date.now(), kind: 'redeem', phone: p, name: order.customer.name, amount: cashbackUsed,
        orderNumber: order.number, at: new Date().toISOString(), take: plan.take });
    }
  }
  const earn = computeEarn(order.items, campaigns);
  if (earn) {
    const c = earn.campaign;
    ledger.push({ id: 'cl' + Date.now() + Math.random().toString(36).slice(2, 5), kind: 'lot', source: 'order', status: 'pending',
      phone: p, name: order.customer.name, amount: earn.amount, remaining: earn.amount,
      campaignId: c.id, campaignName: c.name, orderNumber: order.number,
      multiplier: Number(c.multiplier) || 1, validDays: Number(c.validDays) || 0, at: new Date().toISOString() });
  }
  await saveLedger(ledger);
  return { cashbackUsed, cashbackEarned: earn ? earn.amount : 0, cashbackCampaign: earn ? earn.campaign.name : '' };
}

// بيتنادى لما حالة الطلب تتغير
export async function onOrderStatus(order, status) {
  const ledger = await getLedger();
  let changed = false;
  for (const e of ledger) {
    if (e.orderNumber !== order.number) continue;
    if (e.kind === 'lot' && e.source === 'order') {
      if (status === 'delivered' && e.status === 'pending') {
        e.status = 'active'; e.activatedAt = new Date().toISOString();
        if (e.validDays > 0) e.validUntil = new Date(Date.now() + e.validDays * DAY).toISOString();
        changed = true;
      } else if (status === 'cancelled' && e.status !== 'cancelled') {
        e.status = 'cancelled'; e.remaining = 0; changed = true;
      }
    }
    // طلب اتلغى وكان مستخدم فيه كاش باك → نرجّع الرصيد
    if (e.kind === 'redeem' && status === 'cancelled' && !e.reversed) {
      for (const t of e.take || []) { const lot = ledger.find((l) => l.id === t.id); if (lot) lot.remaining += t.amt; }
      e.reversed = true; changed = true;
    }
  }
  if (changed) {
    await saveLedger(ledger);
    if (status === 'delivered') await logActivity('credit', `💰 تفعيل كاش باك طلب ${order.number} لـ ${order.customer.name}`);
  }
}

// ========== API ==========
export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    const q = req.query || {};
    const body = req.body || {};

    if (req.method === 'GET' && q.offers) {
      const list = (await getCampaigns()).filter((c) => inWindow(c)).map((c) => ({
        id: c.id, name: c.name, start: c.start, end: c.end, productIds: c.productIds || [], minPrice: c.minPrice,
        amountType: c.amountType, value: c.value, per: c.per, maxPerOrder: c.maxPerOrder, multiplier: c.multiplier, validDays: c.validDays,
      }));
      return res.status(200).json(list);
    }

    if (req.method === 'GET' && q.mine) {
      const s = getUser(req);
      if (!s) return res.status(401).json({ error: 'سجّل دخول الأول' });
      const u = (await getUsers()).find((x) => x.id === s.uid);
      const phone = normPhone(u && u.phone);
      const ledger = await getLedger();
      return res.status(200).json({
        ...summarize(ledger, phone),
        history: ledger.filter((e) => e.phone === phone).slice(-50).reverse()
          .map(({ take, ...e }) => e),
      });
    }

    if (req.method === 'POST' && body.action === 'preview') {
      const products = await getProducts();
      const items = (Array.isArray(body.items) ? body.items : []).slice(0, 50).map((i) => {
        const p = products.find((x) => x.id === i.id);
        return p ? { id: p.id, price: Number(p.price) || 0, qty: Math.max(1, Math.floor(Number(i.qty)) || 1) } : null;
      }).filter(Boolean);
      const earn = computeEarn(items, await getCampaigns());
      const out = { earn: earn ? earn.amount : 0, campaign: earn ? earn.campaign.name : '',
        multiplier: earn ? Number(earn.campaign.multiplier) || 1 : 0, validDays: earn ? Number(earn.campaign.validDays) || 0 : 0 };
      const s = getUser(req);
      if (s) {
        const u = (await getUsers()).find((x) => x.id === s.uid);
        if (u && u.phone) Object.assign(out, { redeem: redeemPlan(await getLedger(), normPhone(u.phone), Math.max(0, Number(body.net) || 0)) });
        if (out.redeem) delete out.redeem.take;
      }
      return res.status(200).json(out);
    }

    // ---- إدارة ----
    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') {
      const ledger = await getLedger();
      if (q.phone) {
        const phone = normPhone(q.phone);
        const orders = (await getOrders()).filter((o) => normPhone(o.customer && o.customer.phone) === phone)
          .map((o) => ({ number: o.number, createdAt: o.createdAt, status: o.status, total: o.total, subtotal: o.subtotal,
            discount: o.discount, creditUsed: o.creditUsed, cashbackUsed: o.cashbackUsed || 0, cashbackEarned: o.cashbackEarned || 0,
            payment: o.payment, items: (o.items || []).map((i) => ({ name: i.name, qty: i.qty, price: i.price })) }));
        const user = (await getUsers()).find((u) => normPhone(u.phone) === phone);
        return res.status(200).json({
          phone, name: (user && user.name) || (orders[0] && '') || (ledger.find((e) => e.phone === phone) || {}).name || '',
          hasAccount: Boolean(user), ...summarize(ledger, phone),
          totalSpent: orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + (o.total || 0), 0),
          orders, entries: ledger.filter((e) => e.phone === phone).reverse().map(({ take, ...e }) => e),
        });
      }
      const phones = [...new Set(ledger.map((e) => e.phone))];
      const customers = phones.map((p) => ({ phone: p, name: (ledger.filter((e) => e.phone === p).pop() || {}).name || '', ...summarize(ledger, p) }))
        .sort((a, b) => b.balance + b.pending - (a.balance + a.pending));
      return res.status(200).json({ campaigns: await getCampaigns(), customers });
    }

    if (req.method === 'POST' && body.action === 'campaign') {
      const c = body.campaign || {};
      const name = String(c.name || '').trim().slice(0, 80);
      const value = Number(c.value);
      if (!name) return res.status(400).json({ error: 'اكتب اسم العرض' });
      if (!(value > 0)) return res.status(400).json({ error: 'اكتب قيمة الكاش باك' });
      const clean = {
        id: c.id || 'cb' + Date.now(), name,
        active: c.active !== false,
        start: /^\d{4}-\d{2}-\d{2}$/.test(c.start || '') ? c.start : '',
        end: /^\d{4}-\d{2}-\d{2}$/.test(c.end || '') ? c.end : '',
        productIds: (Array.isArray(c.productIds) ? c.productIds : []).map(String).slice(0, 500),
        minPrice: Math.max(0, Number(c.minPrice) || 0),
        amountType: c.amountType === 'percent' ? 'percent' : 'fixed',
        value,
        per: c.per === 'order' ? 'order' : 'item',
        maxPerOrder: Math.max(0, Number(c.maxPerOrder) || 0),
        multiplier: Math.max(1, Number(c.multiplier) || 1),
        validDays: Math.max(0, Math.floor(Number(c.validDays)) || 0),
        note: String(c.note || '').slice(0, 300),
      };
      const list = await getCampaigns();
      const i = list.findIndex((x) => x.id === clean.id);
      if (i >= 0) list[i] = { ...list[i], ...clean }; else list.unshift({ ...clean, createdAt: new Date().toISOString() });
      await saveCampaigns(list);
      await logActivity('credit', `💰 ${i >= 0 ? 'تعديل' : 'إضافة'} عرض كاش باك: ${name}`);
      return res.status(200).json(clean);
    }

    if (req.method === 'POST' && body.action === 'adjust') {
      const phone = normPhone(body.phone);
      if (!validPhone(phone)) return res.status(400).json({ error: 'رقم موبايل غير صحيح' });
      const amount = round(body.amount);
      if (!amount) return res.status(400).json({ error: 'اكتب المبلغ (+ للإضافة، - للخصم)' });
      const ledger = await getLedger();
      const note = String(body.note || '').slice(0, 200);
      const name = String(body.name || '').slice(0, 80) || (ledger.filter((e) => e.phone === phone).pop() || {}).name || '';
      if (amount > 0) {
        const days = Math.max(0, Math.floor(Number(body.validDays)) || 0);
        ledger.push({ id: 'cl' + Date.now(), kind: 'lot', source: 'adjust', status: 'active', phone, name, amount, remaining: amount,
          multiplier: Math.max(1, Number(body.multiplier) || 1), note, at: new Date().toISOString(),
          validUntil: days ? new Date(Date.now() + days * DAY).toISOString() : '' });
      } else {
        let left = -amount;
        for (const l of liveLots(ledger, phone)) { const a = Math.min(l.remaining, left); l.remaining -= a; left -= a; if (!left) break; }
        ledger.push({ id: 'cr' + Date.now(), kind: 'deduct', phone, name, amount: -amount - left, note, at: new Date().toISOString() });
      }
      await saveLedger(ledger);
      await logActivity('credit', `💰 تعديل يدوي كاش باك ${amount > 0 ? '+' : ''}${amount} ج.م — ${phone}${note ? ' (' + note + ')' : ''}`);
      return res.status(200).json(summarize(ledger, phone));
    }

    if (req.method === 'DELETE' && q.id) {
      await saveCampaigns((await getCampaigns()).filter((c) => c.id !== q.id));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
