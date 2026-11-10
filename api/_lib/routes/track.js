// 📈 تحليلات حقيقية — عدّادات Redis ذرّية (مفيش فقد زيارات مع الضغط) + زوار فريدين فعلياً
// بدون أي بيانات شخصية: معرّف عشوائي مجهول لكل جهاز، ومفيش IP بيتخزّن.
//
// POST   /api/track  { t:'view'|'event', vid, ns, path?, pid?, pname?, ev?, ref?, utm?, q?, n? }  (عام)
// GET    /api/track?days=14  → تقرير كامل للفترة + مقارنة بالفترة اللي قبلها (إدارة)
// DELETE /api/track  → تصفير (إدارة)
import { kvPipeline, hasPersistence, getOrders, getAnalytics, saveAnalytics, getProducts } from '../db.js';
import { verifyToken } from '../auth.js';
import { cors, requireAdmin, rateLimit, searchScore, carCodes } from '../util.js';

const TZ = 'Africa/Cairo';
const DAY_TTL = 400 * 86400; // نحتفظ بالأيام ~13 شهر
const LIVE_WINDOW = 5 * 60 * 1000; // "متصل الآن" = آخر 5 دقايق
const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pingdom|monitor|preview|facebookexternalhit|curl|wget|python|axios|node-fetch|go-http|java\//i;

const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);
function cairoParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}
const cairoDate = (d) => cairoParts(d).date;
function lastDays(n, offset = 0) {
  const out = [];
  for (let i = n - 1 + offset; i >= offset; i--) out.push(cairoDate(new Date(Date.now() - i * 86400000)));
  return out;
}

/* ---------- مصدر الزيارة / الجهاز ---------- */
function sourceOf(ref, utm, host) {
  const u = clean(utm, 30).toLowerCase();
  if (u) return u;
  let h = '';
  try { h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\.|^lm\./, ''); } catch { return 'direct'; }
  if (!h || (host && h === String(host).replace(/^www\./, ''))) return 'direct';
  if (/google\./.test(h)) return 'google';
  if (/facebook|fb\.com|fb\.me/.test(h)) return 'facebook';
  if (/instagram/.test(h)) return 'instagram';
  if (/whatsapp|wa\.me/.test(h)) return 'whatsapp';
  if (/tiktok/.test(h)) return 'tiktok';
  if (/youtube|youtu\.be/.test(h)) return 'youtube';
  if (/bing\./.test(h)) return 'bing';
  if (/t\.co$|twitter|x\.com/.test(h)) return 'x';
  return h.slice(0, 40);
}
function deviceOf(ua) {
  if (/ipad|tablet/i.test(ua)) return 'tablet';
  if (/mobi|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

/* ---------- تخزين احتياطي في الذاكرة (لو مفيش Redis) — بنفس شكل أوامر Redis ---------- */
const mem = new Map();
function memExec(cmds) {
  return cmds.map(([op, key, ...a]) => {
    switch (op) {
      case 'HINCRBY': { const h = mem.get(key) || new Map(); mem.set(key, h); h.set(a[0], (Number(h.get(a[0])) || 0) + Number(a[1])); return h.get(a[0]); }
      case 'HSET': { const h = mem.get(key) || new Map(); mem.set(key, h); h.set(a[0], a[1]); return 1; }
      case 'HGETALL': { const h = mem.get(key); return h ? [...h].flat().map(String) : []; }
      case 'PFADD': { const s = mem.get(key) || new Set(); mem.set(key, s); const had = s.has(a[0]); s.add(a[0]); return had ? 0 : 1; }
      case 'PFCOUNT': { const u = new Set(); [key, ...a].forEach((k) => (mem.get(k) || []).forEach((v) => u.add(v))); return u.size; }
      case 'ZADD': { const z = mem.get(key) || new Map(); mem.set(key, z); z.set(a[1], Number(a[0])); return 1; }
      case 'ZREMRANGEBYSCORE': { const z = mem.get(key); if (z) for (const [m, s] of z) if (s <= Number(a[1])) z.delete(m); return 1; }
      case 'ZCARD': return (mem.get(key) || new Map()).size;
      case 'DEL': [key, ...a].forEach((k) => mem.delete(k)); return 1;
      case 'RPUSH': { const l = mem.get(key) || []; mem.set(key, l); l.push(...a); return l.length; }
      case 'LRANGE': { const l = mem.get(key) || []; const e = Number(a[1]); return l.slice(Number(a[0]), e < 0 ? l.length + e + 1 : e + 1); }
      case 'LTRIM': { const l = mem.get(key) || []; mem.set(key, l.slice(Number(a[0]))); return 'OK'; }
      case 'HSETNX': { const h = mem.get(key) || new Map(); mem.set(key, h); if (h.has(a[0])) return 0; h.set(a[0], a[1]); return 1; }
      case 'ZREVRANGE': { const z = mem.get(key) || new Map(); return [...z].sort((x, y) => y[1] - x[1]).slice(Number(a[0]), Number(a[1]) + 1).map((x) => x[0]); }
      default: return null; // EXPIRE وغيرها
    }
  });
}
const exec = (cmds) => (hasPersistence ? kvPipeline(cmds) : Promise.resolve(memExec(cmds)));
const toObj = (flat) => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]) || flat[i + 1]; return o; };

/* ---------- تسجيل ---------- */
async function record(req, b) {
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || BOT_RE.test(ua)) return;
  const vid = clean(b.vid, 40);
  if (!/^[a-z0-9-]{8,40}$/i.test(vid)) return; // لازم معرّف جهاز صالح
  const { date, hour } = cairoParts();
  const dk = `an:d:${date}`, uk = `an:u:${date}`;
  const cmds = [];
  const inc = (f, n = 1) => cmds.push(['HINCRBY', dk, f, n]);

  if (b.t === 'event') {
    const ev = clean(b.ev, 30).replace(/[^a-z0-9_]/gi, '');
    if (!ev) return;
    inc('ev:' + ev);
    if (ev === 'search') {
      const q = clean(b.q, 50).toLowerCase();
      if (q.length >= 2) { inc('q:' + q); if (Number(b.n) === 0) inc('q0:' + q); }
    }
  } else if (b.t !== 'leave') {
    inc('views');
    inc('h:' + hour);
    const path = (clean(b.path, 80).split('?')[0] || '/').replace(/\/index\.html$/, '/');
    inc('pg:' + path);
    if (b.pid) {
      const pid = clean(b.pid, 40);
      inc('pr:' + pid);
      if (b.pname) cmds.push(['HSET', 'an:pn', pid, clean(b.pname, 120)]);
    }
    if (b.ns) { // بداية جلسة جديدة
      inc('sessions');
      inc('src:' + sourceOf(b.ref, b.utm, req.headers.host));
      inc('dev:' + deviceOf(ua));
      const cc = clean(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'], 2).toUpperCase();
      if (/^[A-Z]{2}$/.test(cc)) inc('cty:' + cc);
      inc('land:' + path);
    }
    if (b.nv) inc('new');
    cmds.push(['PFADD', uk, vid]);
  }
  // ⏱️ الوقت على الصفحة (بيتبعت لما الزائر يسيبها)
  if (b.t === 'leave') {
    const path = (clean(b.path, 80).split('?')[0] || '/').replace(/\/index\.html$/, '/');
    const dur = Math.min(3600, Math.max(0, Math.round(Number(b.dur) || 0)));
    if (dur > 0) { inc('dur:' + path, dur); inc('durn:' + path); }
  }

  // 🧭 رحلة الزائر (الجلسة) — كل خطوة بوقتها: صفحة/حدث/مغادرة
  const sid = clean(b.sid, 24);
  if (/^s[a-z0-9]{6,23}$/i.test(sid)) {
    const now = Date.now();
    const sk = `an:s:${sid}`, mk = `an:sm:${sid}`;
    const step = { t: b.t === 'event' ? 'e' : b.t === 'leave' ? 'l' : 'v', at: now };
    if (step.t === 'v') {
      step.p = (clean(b.path, 80).split('?')[0] || '/'); if (b.q) step.q = clean(b.q, 80);
      if (b.pid) { step.pid = clean(b.pid, 40); step.pn = clean(b.pname, 80); }
      if (Number(b.oos)) step.oos = 1; if (Number(b.noprice)) step.np = 1; if (Number(b.locked)) step.lk = 1;
    } else if (step.t === 'e') {
      step.ev = clean(b.ev, 30); if (b.q) step.q = clean(b.q, 50); if (b.n !== undefined) step.n = Number(b.n) || 0;
      if (b.ord) step.ord = clean(b.ord, 20); if (b.val) step.val = Number(b.val) || 0;
    } else { step.p = clean(b.path, 80); step.d = Math.min(3600, Math.round(Number(b.dur) || 0)); step.sc = Math.min(100, Number(b.scroll) || 0); }
    const SESS_TTL = 45 * 86400;
    cmds.push(['RPUSH', sk, JSON.stringify(step)], ['LTRIM', sk, -300, -1], ['EXPIRE', sk, SESS_TTL]);
    cmds.push(['HSETNX', mk, 'start', now], ['HSETNX', mk, 'vid', vid], ['HSET', mk, 'last', now]);
    if (b.br === 'ae' || b.br === 'eg') cmds.push(['HSET', mk, 'br', b.br]);
    if (step.t === 'v') {
      cmds.push(['HINCRBY', mk, 'pages', 1], ['HSET', mk, 'exit', step.p], ['HSET', mk, 'exitPn', step.pn || '']);
      cmds.push(['HSETNX', mk, 'land', step.p], ['HSETNX', mk, 'landPn', step.pn || ''], ['HSETNX', mk, 'dev', deviceOf(ua)]);
      if (b.ns) cmds.push(['HSETNX', mk, 'src', sourceOf(b.ref, b.utm, req.headers.host)]);
      const cc = clean(req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'], 2).toUpperCase();
      if (/^[A-Z]{2}$/.test(cc)) cmds.push(['HSETNX', mk, 'cty', cc]);
      if (step.pid) cmds.push(['HINCRBY', mk, 'prods', 1]);
      if (step.oos) cmds.push(['HSET', mk, 'oos', 1]);
      if (step.lk) cmds.push(['HSET', mk, 'locked', 1]);
      if (Number(b.nv)) cmds.push(['HSET', mk, 'new', 1]);
    } else if (step.t === 'e') {
      const flag = { add_cart: 'cart', checkout: 'checkout', order_placed: 'order', whatsapp: 'wa', search: 'search', ws_order: 'wsorder', rfq: 'rfq', container_request: 'ctreq', part_request: 'preq' }[step.ev];
      if (flag) cmds.push(['HINCRBY', mk, flag, 1]);
      if (step.ev === 'search' && step.n === 0) cmds.push(['HINCRBY', mk, 'search0', 1]);
      if (step.ord) cmds.push(['HSET', mk, 'ord', step.ord]);
    } else if (step.d) cmds.push(['HINCRBY', mk, 'dur', step.d]);
    cmds.push(['EXPIRE', mk, SESS_TTL], ['ZADD', `an:ss:${date}`, now, sid], ['EXPIRE', `an:ss:${date}`, SESS_TTL]);
  }

  // 🔥 نشاط تاجر الجملة المسجّل (بيتربط بحسابه عن طريق التوكن الموقّع)
  const tok = b.tk && verifyToken(String(b.tk));
  if (tok && tok.uid) {
    const tk = `an:tr:${clean(tok.uid, 30)}`, TR_TTL = 180 * 86400;
    cmds.push(['HSET', tk, 'last', Date.now()], ['HSET', tk, 'day:' + date, 1], ['EXPIRE', tk, TR_TTL]);
    if (b.t === 'view') {
      cmds.push(['HINCRBY', tk, 'pages', 1]);
      if (b.pid) {
        cmds.push(['HINCRBY', tk, 'prods', 1]);
        const pl = `an:trp:${clean(tok.uid, 30)}`;
        cmds.push(['RPUSH', pl, clean(b.pname || b.pid, 80)], ['LTRIM', pl, -15, -1], ['EXPIRE', pl, TR_TTL]);
      }
    } else if (b.t === 'event') {
      const f = { add_cart: 'cart', whatsapp: 'wa', ws_order: 'order', rfq: 'rfq', container_request: 'rfq', part_request: 'rfq', search: 'search' }[clean(b.ev, 30)];
      if (f) cmds.push(['HINCRBY', tk, f, 1]);
    } else if (b.t === 'leave') {
      const d = Math.min(3600, Math.max(0, Math.round(Number(b.dur) || 0)));
      if (d) cmds.push(['HINCRBY', tk, 'dur', d]);
    }
  }

  if (!cmds.length) return;
  cmds.push(['ZADD', 'an:live', Date.now(), vid]);
  cmds.push(['EXPIRE', dk, DAY_TTL], ['EXPIRE', uk, DAY_TTL]);
  await exec(cmds);
}

/* ---------- 🧭 رحلات الزوار ---------- */
// تصنيف نهاية الزيارة: اشترى؟ ولو لأ، وقف فين وليه (تخمين من سلوكه)
function outcomeOf(m) {
  const n = (k) => Number(m[k]) || 0;
  if (n('order') || n('wsorder')) return ['bought', '✅ اشترى'];
  if (n('ctreq') || n('rfq') || n('preq')) return ['lead', '📝 ساب طلب'];
  if (n('checkout')) return ['checkout_drop', '💳 بدأ الطلب ومكمّلش'];
  if (n('cart')) return ['cart_drop', '🛒 حط في السلة ومشتراش'];
  if (n('locked')) return ['locked', '🔒 وقف عند تسجيل الدخول (جملة)'];
  if (n('search0')) return ['no_result', '🔎 دوّر ومالقاش'];
  if (n('oos')) return ['oos', '📦 شاف قطعة خلصانة'];
  if (n('wa')) return ['whatsapp', '💬 راح واتساب'];
  if (n('prods')) return ['viewed', '👀 شاف منتجات ومحطش في السلة'];
  if (n('pages') <= 1 && n('dur') < 15) return ['bounce', '🚪 دخل وخرج على طول'];
  return ['browsed', '🧭 اتفرّج ومشي'];
}
async function sessionsReport(days) {
  const dates = lastDays(days);
  const ids = (await exec(dates.map((d) => ['ZREVRANGE', `an:ss:${d}`, 0, 299]))).flat().filter(Boolean);
  const uniq = [...new Set(ids)].slice(0, 400);
  if (!uniq.length) return { sessions: [], why: {}, exits: [], branches: {} };
  const metas = (await exec(uniq.map((sid) => ['HGETALL', `an:sm:${sid}`]))).map(toObj);
  // زيارة من غير ولا صفحة = حدث يتيم (زي بحث قبل تسجيل الصفحة) — مش زيارة حقيقية
  const sessions = uniq.map((sid, i) => ({ sid, ...metas[i] })).filter((m) => m.start && Number(m.pages) > 0)
    .map((m) => { const [k, label] = outcomeOf(m); return { ...m, outcome: k, outcomeLabel: label, span: Math.round(((Number(m.last) || 0) - (Number(m.start) || 0)) / 1000) }; })
    .sort((a, b) => b.last - a.last);
  const why = {}, exits = {}, branches = {};
  sessions.forEach((s) => {
    why[s.outcome] = why[s.outcome] || { label: s.outcomeLabel, n: 0 }; why[s.outcome].n++;
    if (s.outcome !== 'bought') { const k = (s.exit || '/') + (s.exitPn ? '|' + s.exitPn : ''); exits[k] = (exits[k] || 0) + 1; }
    const br = s.br || 'eg'; branches[br] = branches[br] || { sessions: 0, bought: 0, cart: 0, pages: 0, dur: 0 };
    const B = branches[br]; B.sessions++; B.pages += Number(s.pages) || 0; B.dur += Number(s.dur) || s.span || 0;
    if (s.outcome === 'bought') B.bought++; if (Number(s.cart)) B.cart++;
  });
  return { sessions, why, exits: Object.entries(exits).sort((a, b) => b[1] - a[1]).slice(0, 10), branches };
}

/* ---------- تقرير ---------- */
// "طقم فوانيس خ" و"طقم فوانيس خا" نص كلمة اتسجّلت وهو بيكتب — نشيلها لو فيه كلمة أطول بتبدأ بيها
function dropPrefixes(list) {
  return list.filter(([q]) => !list.some(([o]) => o !== q && o.startsWith(q)));
}
const sumField = (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
function group(rows, prefix, limit = 15) {
  const m = {};
  rows.forEach((r) => Object.entries(r).forEach(([k, v]) => { if (k.startsWith(prefix)) m[k.slice(prefix.length)] = (m[k.slice(prefix.length)] || 0) + Number(v); }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

// 🛒 قائمة الشراء: القطع اللي الناس دورت عليها ومالقيتهاش (آخر N يوم)
//    مع عدد المرات، آخر يوم، الموديل، ولو اتوفرت في المخزون بعدها.
async function missingReport(n) {
  const days = lastDays(n);
  const rows = (await exec(days.map((d) => ['HGETALL', `an:d:${d}`]))).map(toObj);
  const m = {};
  rows.forEach((r, i) => Object.entries(r).forEach(([k, v]) => {
    if (!k.startsWith('q0:')) return;
    const q = k.slice(3);
    const e = m[q] || (m[q] = { q, count: 0, days: 0, last: '' });
    e.count += Number(v) || 0; e.days++; e.last = days[i];
  }));
  const searches = {};
  rows.forEach((r) => Object.entries(r).forEach(([k, v]) => { if (k.startsWith('q:')) searches[k.slice(2)] = (searches[k.slice(2)] || 0) + (Number(v) || 0); }));
  let list = Object.values(m);
  const keep = new Set(dropPrefixes(list.map((e) => [e.q, e.count])).map(([q]) => q));
  list = list.filter((e) => keep.has(e.q));
  const stock = (await getProducts()).filter((p) => Number(p.stock) > 0);
  list.forEach((e) => {
    e.cars = carCodes({ name: e.q });
    e.nowAvailable = stock.filter((p) => searchScore(p, e.q) >= 100).length;
    e.searchedTotal = searches[e.q] || e.count;
  });
  list.sort((a, b) => b.count - a.count || (b.last > a.last ? 1 : -1));
  return { days: n, total: list.length, items: list.slice(0, 200) };
}

async function report(n) {
  const cur = lastDays(n), prev = lastDays(n, n);
  const all = [...prev, ...cur];
  const cmds = [
    ...all.map((d) => ['HGETALL', `an:d:${d}`]),
    ...cur.map((d) => ['PFCOUNT', `an:u:${d}`]),
    ['PFCOUNT', ...cur.map((d) => `an:u:${d}`)],
    ['PFCOUNT', ...prev.map((d) => `an:u:${d}`)],
    ['ZREMRANGEBYSCORE', 'an:live', 0, Date.now() - LIVE_WINDOW],
    ['ZCARD', 'an:live'],
    ['HGETALL', 'an:pn'],
  ];
  const r = await exec(cmds);
  const hashes = r.slice(0, all.length).map(toObj);
  const prevRows = hashes.slice(0, n), rows = hashes.slice(n);
  const dayUniq = r.slice(all.length, all.length + n).map(Number);
  let i = all.length + n;
  const visitors = Number(r[i++]) || 0, prevVisitors = Number(r[i++]) || 0;
  i++; const online = Number(r[i++]) || 0;
  const names = toObj(r[i++]);

  // الطلبات الحقيقية من قاعدة البيانات (مش من التتبّع)
  const orders = (await getOrders()).filter((o) => o.status !== 'cancelled');
  const ordersByDay = {};
  orders.forEach((o) => {
    if (!o.createdAt) return;
    const d = cairoDate(new Date(o.createdAt));
    (ordersByDay[d] = ordersByDay[d] || { orders: 0, revenue: 0 });
    ordersByDay[d].orders += 1; ordersByDay[d].revenue += Number(o.total) || 0;
  });
  const sumOrders = (days, f) => days.reduce((s, d) => s + ((ordersByDay[d] && ordersByDay[d][f]) || 0), 0);

  const daily = cur.map((d, k) => ({
    date: d, views: Number(rows[k].views) || 0, visitors: dayUniq[k] || 0, sessions: Number(rows[k].sessions) || 0,
    orders: (ordersByDay[d] && ordersByDay[d].orders) || 0, revenue: (ordersByDay[d] && ordersByDay[d].revenue) || 0,
  }));
  const hours = Array.from({ length: 24 }, (_, h) => sumField(rows, 'h:' + h));
  const events = Object.fromEntries(group(rows, 'ev:', 50));
  const productViews = group(rows, 'pr:', 1000).reduce((s, x) => s + x[1], 0);
  const totals = {
    views: sumField(rows, 'views'), visitors, sessions: sumField(rows, 'sessions'), newVisitors: sumField(rows, 'new'),
    orders: sumOrders(cur, 'orders'), revenue: sumOrders(cur, 'revenue'),
  };
  totals.conversion = totals.sessions ? +(totals.orders / totals.sessions * 100).toFixed(2) : 0;
  totals.pagesPerSession = totals.sessions ? +(totals.views / totals.sessions).toFixed(2) : 0;
  totals.aov = totals.orders ? Math.round(totals.revenue / totals.orders) : 0;
  const prevTotals = {
    views: sumField(prevRows, 'views'), visitors: prevVisitors, sessions: sumField(prevRows, 'sessions'),
    orders: sumOrders(prev, 'orders'), revenue: sumOrders(prev, 'revenue'),
  };
  prevTotals.conversion = prevTotals.sessions ? +(prevTotals.orders / prevTotals.sessions * 100).toFixed(2) : 0;

  let legacy = null;
  try { const a = await getAnalytics(); if (a && a.totalViews) legacy = { totalViews: a.totalViews, totalVisitors: a.totalVisitors }; } catch {}

  return {
    persistent: hasPersistence, tz: TZ, range: { from: cur[0], to: cur[cur.length - 1], days: n },
    online, totals, prev: prevTotals, daily, hours,
    pages: group(rows, 'pg:'), landing: group(rows, 'land:', 10),
    pageTime: group(rows, 'durn:', 15).map(([p, n]) => [p, Math.round(sumField(rows, 'dur:' + p) / Math.max(1, n)), n]),
    products: group(rows, 'pr:', 15).map(([id, c]) => [id, names[id] || id, c]),
    sources: group(rows, 'src:'), devices: group(rows, 'dev:'), countries: group(rows, 'cty:'),
    events, searches: dropPrefixes(group(rows, 'q:', 60)).slice(0, 20), searchesZero: dropPrefixes(group(rows, 'q0:', 60)).slice(0, 20),
    funnel: { sessions: totals.sessions, productViews, addCart: events.add_cart || 0, checkout: events.checkout || 0, orders: totals.orders },
    legacy,
  };
}

export default async function handler(req, res) {
  if (cors(req, res)) return;
  try {
    if (req.method === 'POST') {
      if (!rateLimit(req, res, 'track', 150)) return;
      await record(req, req.body || {});
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'GET') {
      if (!requireAdmin(req, res)) return;
      if (req.query && req.query.session) {
        const sid = clean(req.query.session, 24);
        const [steps, meta] = await exec([['LRANGE', `an:s:${sid}`, 0, -1], ['HGETALL', `an:sm:${sid}`]]);
        const names = toObj((await exec([['HGETALL', 'an:pn']]))[0]);
        return res.status(200).json({ meta: toObj(meta), steps: (steps || []).map((x) => { try { const o = JSON.parse(x); if (o.pid && !o.pn) o.pn = names[o.pid]; return o; } catch { return null; } }).filter(Boolean) });
      }
      if (req.query && req.query.traders) {
        // 🔥 نشاط تجار الجملة: ?traders=uid1,uid2
        const ids = String(req.query.traders).split(',').map((x) => clean(x, 30)).filter(Boolean).slice(0, 300);
        const out = {};
        if (ids.length) {
          const r = await exec(ids.flatMap((id) => [['HGETALL', `an:tr:${id}`], ['LRANGE', `an:trp:${id}`, 0, -1]]));
          ids.forEach((id, i) => {
            const m = toObj(r[i * 2]);
            const days = Object.keys(m).filter((k) => k.startsWith('day:')).length;
            Object.keys(m).forEach((k) => { if (k.startsWith('day:')) delete m[k]; });
            out[id] = { ...m, days, parts: [...new Set((r[i * 2 + 1] || []).reverse())].slice(0, 6) };
          });
        }
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(out);
      }
      if (req.query && req.query.missing) {
        const d = Math.min(90, Math.max(1, parseInt(req.query.days || '30', 10) || 30));
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(await missingReport(d));
      }
      if (req.query && req.query.sessions) {
        const d = Math.min(30, Math.max(1, parseInt(req.query.days || '1', 10) || 1));
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(await sessionsReport(d));
      }
      const n = Math.min(90, Math.max(1, parseInt((req.query && req.query.days) || '14', 10) || 14));
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json(await report(n));
    }
    if (req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const days = lastDays(400);
      const keys = days.flatMap((d) => [`an:d:${d}`, `an:u:${d}`]).concat(['an:live', 'an:pn']);
      for (let k = 0; k < keys.length; k += 200) await exec([['DEL', ...keys.slice(k, k + 200)]]);
      await saveAnalytics({ totalViews: 0, totalVisitors: 0, days: {}, pages: {}, products: {}, events: {} });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
