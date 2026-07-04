// طبقة البيانات: لو متغيرات Upstash Redis موجودة يتم الحفظ الدائم فيها،
// غير كده يشتغل الموقع ببيانات تجريبية في الذاكرة (تترجع لأصلها مع كل نشر جديد).
import { SEED_PRODUCTS } from './seed.js';

const KV_URL = process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
export const hasPersistence = Boolean(KV_URL && KV_TOKEN);

const memory = { products: null, orders: null };

async function kvGet(key) {
  const r = await fetch(`${KV_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  if (!r.ok) throw new Error(`KV get failed: ${r.status}`);
  const data = await r.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function kvSet(key, value) {
  const r = await fetch(`${KV_URL}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
    body: JSON.stringify(value),
  });
  if (!r.ok) throw new Error(`KV set failed: ${r.status}`);
}

export async function getProducts() {
  if (hasPersistence) {
    const stored = await kvGet('products');
    if (stored) return stored;
    await kvSet('products', SEED_PRODUCTS);
    return structuredClone(SEED_PRODUCTS);
  }
  if (!memory.products) memory.products = structuredClone(SEED_PRODUCTS);
  return memory.products;
}

export async function saveProducts(products) {
  if (hasPersistence) await kvSet('products', products);
  else memory.products = products;
}

export async function getOrders() {
  if (hasPersistence) return (await kvGet('orders')) || [];
  if (!memory.orders) memory.orders = [];
  return memory.orders;
}

export async function saveOrders(orders) {
  if (hasPersistence) await kvSet('orders', orders);
  else memory.orders = orders;
}
