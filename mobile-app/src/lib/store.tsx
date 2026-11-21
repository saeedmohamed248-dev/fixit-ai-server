// 🧠 حالة التطبيق: اللغة، المنتجات، السلة، المفضلة، الحساب، العربية
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { DevSettings, I18nManager, Platform } from 'react-native';
import { api, setAuthToken } from './api';
import { inEgyptBranch } from './format';
import { type Key, type Lang, translate } from './i18n';
import type { CartLine, Product, Settings, User } from './types';

const K = {
  lang: 'fx_lang',
  cart: 'fx_cart',
  wish: 'fx_wish',
  recent: 'fx_recent',
  car: 'fx_car',
  user: 'fx_user',
  token: 'fx_token',
  catalog: 'fx_catalog_v1',
  settings: 'fx_settings',
  checkout: 'fx_checkout',
};

const secure = {
  async get(k: string) {
    if (Platform.OS === 'web') return AsyncStorage.getItem(k);
    try {
      return await SecureStore.getItemAsync(k);
    } catch {
      return null;
    }
  },
  async set(k: string, v: string | null) {
    if (Platform.OS === 'web') return v === null ? AsyncStorage.removeItem(k) : AsyncStorage.setItem(k, v);
    try {
      if (v === null) await SecureStore.deleteItemAsync(k);
      else await SecureStore.setItemAsync(k, v);
    } catch {}
  },
};

async function readJSON<T>(k: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
const writeJSON = (k: string, v: unknown) => AsyncStorage.setItem(k, JSON.stringify(v)).catch(() => {});

export type CheckoutDraft = { name: string; phone: string; city: string; address: string; email: string };

type Ctx = {
  ready: boolean;
  lang: Lang;
  isRTL: boolean;
  t: (k: Key, v?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  // الكتالوج
  products: Product[];
  catalogState: 'loading' | 'ok' | 'error';
  refreshCatalog: () => Promise<void>;
  byId: (id: string) => Product | undefined;
  settings: Settings;
  // العربية
  car: string | null;
  setCar: (c: string | null) => void;
  // السلة
  cart: CartLine[];
  cartCount: number;
  addToCart: (id: string, qty?: number, partNumber?: string) => void;
  setQty: (id: string, qty: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  // المفضلة + شاهدتها
  wishlist: string[];
  toggleWish: (id: string) => void;
  recent: string[];
  pushRecent: (id: string) => void;
  // الحساب
  user: User | null;
  token: string | null;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  setUser: (u: User) => void;
  checkoutDraft: CheckoutDraft | null;
  saveCheckoutDraft: (d: CheckoutDraft) => void;
};

const AppCtx = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>('ar');
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogState, setCatalogState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [settings, setSettings] = useState<Settings>({});
  const [car, setCarState] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [user, setUserState] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checkoutDraft, setCheckoutDraft] = useState<CheckoutDraft | null>(null);
  const hydrated = useRef(false);

  const refreshCatalog = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([api.products(), api.settings().catch(() => null)]);
      const retail = list.filter(inEgyptBranch);
      setProducts(retail);
      setCatalogState('ok');
      writeJSON(K.catalog, retail);
      if (st) {
        setSettings(st);
        writeJSON(K.settings, st);
      }
    } catch {
      setCatalogState((s) => (s === 'ok' ? 'ok' : 'error'));
    }
  }, []);

  // ⏬ تحميل الحالة المحفوظة
  useEffect(() => {
    (async () => {
      const [l, c, w, r, cr, u, tok, cat, st, ck] = await Promise.all([
        AsyncStorage.getItem(K.lang),
        readJSON<CartLine[]>(K.cart, []),
        readJSON<string[]>(K.wish, []),
        readJSON<string[]>(K.recent, []),
        AsyncStorage.getItem(K.car),
        readJSON<User | null>(K.user, null),
        secure.get(K.token),
        readJSON<Product[]>(K.catalog, []),
        readJSON<Settings>(K.settings, {}),
        readJSON<CheckoutDraft | null>(K.checkout, null),
      ]);
      const wantLang: Lang = l === 'en' ? 'en' : 'ar';
      // 🔁 اتجاه الواجهة (يمين/شمال) لازم يتظبط قبل الرسم — لو مختلف نعيد تشغيل التطبيق مرة
      if (Platform.OS !== 'web' && I18nManager.isRTL !== (wantLang === 'ar')) {
        I18nManager.allowRTL(true);
        I18nManager.forceRTL(wantLang === 'ar');
        try {
          await Updates.reloadAsync();
          return;
        } catch {
          if (__DEV__) DevSettings.reload();
        }
      }
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.documentElement.dir = wantLang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = wantLang;
      }
      setLangState(wantLang);
      setCart(c);
      setWishlist(w);
      setRecent(r);
      setCarState(cr);
      setUserState(u);
      setToken(tok);
      setAuthToken(tok);
      setSettings(st);
      setCheckoutDraft(ck);
      if (cat.length) {
        setProducts(cat);
        setCatalogState('ok');
      }
      hydrated.current = true;
      setReady(true);
      refreshCatalog();
      if (tok) api.me().then((me) => { setUserState(me); writeJSON(K.user, me); }).catch((e) => {
        if (e?.status === 401) { setToken(null); setAuthToken(null); setUserState(null); secure.set(K.token, null); AsyncStorage.removeItem(K.user); }
      });
    })();
  }, [refreshCatalog]);

  useEffect(() => { if (hydrated.current) writeJSON(K.cart, cart); }, [cart]);
  useEffect(() => { if (hydrated.current) writeJSON(K.wish, wishlist); }, [wishlist]);
  useEffect(() => { if (hydrated.current) writeJSON(K.recent, recent); }, [recent]);

  const setLang = useCallback(async (l: Lang) => {
    await AsyncStorage.setItem(K.lang, l);
    if (Platform.OS === 'web') {
      if (typeof document !== 'undefined') document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
      setLangState(l);
      return;
    }
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(l === 'ar');
    try {
      await Updates.reloadAsync();
    } catch {
      if (__DEV__) DevSettings.reload();
      else setLangState(l);
    }
  }, []);

  const map = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);
  const byId = useCallback((id: string) => map.get(id), [map]);

  const addToCart = useCallback((id: string, qty = 1, partNumber?: string) => {
    setCart((c) => {
      const max = map.get(id)?.stock ?? 999;
      const ex = c.find((l) => l.id === id);
      if (ex) return c.map((l) => (l.id === id ? { ...l, qty: Math.min(max, l.qty + qty), partNumber: partNumber || l.partNumber } : l));
      return [...c, { id, qty: Math.min(max, qty), partNumber }];
    });
  }, [map]);
  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: Math.max(1, Math.min(map.get(id)?.stock ?? 999, qty)) } : l)));
  }, [map]);
  const removeFromCart = useCallback((id: string) => setCart((c) => c.filter((l) => l.id !== id)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const toggleWish = useCallback((id: string) => setWishlist((w) => (w.includes(id) ? w.filter((x) => x !== id) : [id, ...w])), []);
  const pushRecent = useCallback((id: string) => setRecent((r) => [id, ...r.filter((x) => x !== id)].slice(0, 20)), []);

  const setCar = useCallback((c: string | null) => {
    setCarState(c);
    if (c) AsyncStorage.setItem(K.car, c);
    else AsyncStorage.removeItem(K.car);
  }, []);

  const signIn = useCallback((tok: string, u: User) => {
    setToken(tok);
    setAuthToken(tok);
    setUserState(u);
    secure.set(K.token, tok);
    writeJSON(K.user, u);
  }, []);
  const signOut = useCallback(() => {
    setToken(null);
    setAuthToken(null);
    setUserState(null);
    secure.set(K.token, null);
    AsyncStorage.removeItem(K.user);
  }, []);
  const setUser = useCallback((u: User) => { setUserState(u); writeJSON(K.user, u); }, []);
  const refreshUser = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {}
  }, [setUser]);
  const saveCheckoutDraft = useCallback((d: CheckoutDraft) => { setCheckoutDraft(d); writeJSON(K.checkout, d); }, []);

  const t = useCallback((k: Key, v?: Record<string, string | number>) => translate(lang, k, v), [lang]);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const value: Ctx = {
    ready, lang, isRTL: lang === 'ar', t, setLang,
    products, catalogState, refreshCatalog, byId, settings,
    car, setCar,
    cart, cartCount, addToCart, setQty, removeFromCart, clearCart,
    wishlist, toggleWish, recent, pushRecent,
    user, token, signIn, signOut, refreshUser, setUser,
    checkoutDraft, saveCheckoutDraft,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
