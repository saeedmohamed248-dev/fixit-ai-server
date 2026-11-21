// 🌐 الاتصال بسيرفر fixitauto.parts — نفس الـ API اللي الموقع بيستخدمه
import type { Order, Product, Review, Settings, User } from './types';

export const ORIGIN = 'https://www.fixitauto.parts';
const API = ORIGIN + '/api';

let authToken: string | null = null;
export function setAuthToken(t: string | null) {
  authToken = t;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, opts: { method?: string; body?: unknown; timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (authToken) headers.Authorization = 'Bearer ' + authToken;
    const res = await fetch(API + path, {
      method: opts.method || 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: ctrl.signal,
    });
    let data: any = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) throw new ApiError((data && data.error) || 'NETWORK', res.status);
    return data as T;
  } catch (e: any) {
    if (e instanceof ApiError) throw e;
    throw new ApiError('NETWORK', 0);
  } finally {
    clearTimeout(timer);
  }
}

const qs = (o: Record<string, string | number | undefined>) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');

export const api = {
  settings: () => request<Settings>('/settings'),
  products: () => request<Product[]>('/products'),
  search: (q: string) => request<Product[]>('/products?' + qs({ q })),
  outOfStock: (q: string) => request<Product[]>('/products?' + qs({ oos: 1, q })),
  product: (id: string) => request<Product>('/products?' + qs({ id })),
  reviews: (productId: string) => request<Review[]>('/reviews?' + qs({ productId })),
  addReview: (b: { productId: string; rating: number; name: string; comment: string }) =>
    request<Review>('/reviews', { method: 'POST', body: b }),
  login: (phone: string, password: string) =>
    request<{ token: string; user: User }>('/auth', { method: 'POST', body: { action: 'login', phone, password } }),
  register: (b: { name: string; phone: string; password: string; email?: string; account?: string; company?: string }) =>
    request<{ token: string; user: User }>('/auth', { method: 'POST', body: { action: 'register', ...b } }),
  me: () => request<User>('/auth?action=me'),
  updateMe: (b: Partial<User> & { currentPassword?: string; newPassword?: string }) =>
    request<User>('/auth', { method: 'PUT', body: b }),
  deleteAccount: (password: string) => request<{ ok: true }>('/auth', { method: 'POST', body: { action: 'delete_account', password } }),
  myOrders: () => request<Order[]>('/orders?mine=1'),
  track: (number: string, phone: string) => request<Order>('/orders?' + qs({ track: number, phone })),
  validateCoupon: (code: string, subtotal: number, items: { id: string; qty: number }[]) =>
    request<{ code: string; discount: number }>('/coupons', { method: 'POST', body: { action: 'validate', code, subtotal, items } }),
  placeOrder: (b: unknown) => request<Order>('/orders', { method: 'POST', body: b, timeoutMs: 30000 }),
  returnRequest: (number: string, phone: string, reason: string) =>
    request<{ ok: true }>('/orders', { method: 'POST', body: { action: 'return_request', number, phone, reason } }),
  // الذكاء الاصطناعي ممكن يتأخر — مهلة أطول ومحاولة تانية لو النت قطع
  diagnose: async (messages: { role: 'user' | 'assistant'; content: string }[]) => {
    const call = () => request<{ choices: { message: { content: string } }[] }>('/diagnose', { method: 'POST', body: { messages }, timeoutMs: 90000 });
    try {
      return await call();
    } catch (e: any) {
      if (e?.status === 0 || e?.status === 502) return call();
      throw e;
    }
  },
  partRequest: (b: { name: string; phone: string; partName: string; car?: string; notes?: string }) =>
    request<any>('/requests', { method: 'POST', body: { ...b, source: 'app' } }),
};
