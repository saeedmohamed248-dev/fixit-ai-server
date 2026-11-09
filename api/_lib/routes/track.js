// 📈 تحليلات حقيقية — عدّادات Redis ذرّية (مفيش فقد زيارات مع الضغط) + زوار فريدين فعلياً
// بدون أي بيانات شخصية: معرّف عشوائي مجهول لكل جهاز، ومفيش IP بيتخزّن.
//
// POST   /api/track  { t:'view'|'event', vid, ns, path?, pid?, pname?, ev?, ref?, utm?, q?, n? }  (عام)
// GET    /api/track?days=14  → تقرير كامل للفترة + مقارنة بالفترة اللي قبلها (إدارة)
// DELETE /api/track  → تصفير (إدارة)
import { kvPipeline, hasPersistence, getOrders, getAnalytics, saveAnalytics } from '../db.js';
import { cors, requireAdmin, rateLimit } from '../util.js';

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
  } else {
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
  cmds.push(['ZADD', 'an:live', Date.now(), vid]);
  cmds.push(['EXPIRE', dk, DAY_TTL], ['EXPIRE', uk, DAY_TTL]);
  await exec(cmds);
}

/* ---------- تقرير ---------- */
const sumField = (rows, f) => rows.reduce((s, r) => s + (Number(r[f]) || 0), 0);
function group(rows, prefix, limit = 15) {
  const m = {};
  rows.forEach((r) => Object.entries(r).forEach(([k, v]) => { if (k.startsWith(prefix)) m[k.slice(prefix.length)] = (m[k.slice(prefix.length)] || 0) + Number(v); }));
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, limit);
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
    products: group(rows, 'pr:', 15).map(([id, c]) => [id, names[id] || id, c]),
    sources: group(rows, 'src:'), devices: group(rows, 'dev:'), countries: group(rows, 'cty:'),
    events, searches: group(rows, 'q:', 20), searchesZero: group(rows, 'q0:', 20),
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
