import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openWhatsApp, ProductRail } from '../../components/blocks';
import { PartImage } from '../../components/ProductCard';
import { Badge, Button, Card, Divider, Empty, Field, Icon, IconButton, Loader, Stars, tap, Txt } from '../../components/ui';
import { api, ORIGIN } from '../../lib/api';
import { dateStr, discountPct, money, pDesc, pImages, pName, thumb } from '../../lib/format';
import { catName } from '../../lib/i18n';
import { useApp } from '../../lib/store';
import { C, R, S, shadow } from '../../lib/theme';
import type { Product, Review } from '../../lib/types';
import { Image } from 'expo-image';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, isRTL, byId, products, addToCart, wishlist, toggleWish, pushRecent, car, settings, user, cart } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [p, setP] = useState<Product | undefined>(byId(id));
  const [state, setState] = useState<'loading' | 'ok' | 'error' | 'missing'>(byId(id) ? 'ok' : 'loading');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [slide, setSlide] = useState(0);
  const [qty, setQty] = useState(1);
  const [pn, setPn] = useState<string | undefined>();
  const [added, setAdded] = useState(false);
  const [rv, setRv] = useState({ open: false, rating: 5, name: user?.name || '', comment: '', busy: false });

  useEffect(() => {
    let alive = true;
    pushRecent(id);
    api.product(id)
      .then((fresh) => { if (alive) { setP(fresh); setState('ok'); } })
      .catch((e) => { if (alive) setState((s) => (s === 'ok' ? 'ok' : e?.status === 404 ? 'missing' : 'error')); });
    api.reviews(id).then((r) => alive && setReviews(r)).catch(() => {});
    return () => { alive = false; };
  }, [id, pushRecent]);

  const similar = useMemo(() => {
    if (!p) return [];
    return products
      .filter((x) => x.id !== p.id && x.category === p.category && x.fits?.some((f) => p.fits?.includes(f)))
      .slice(0, 12);
  }, [p, products]);

  if (state === 'loading') return <Loader />;
  if (!p || state === 'missing') {
    return (
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <Empty icon="package-variant-closed" title={t('out_of_stock')} action={t('continue_shopping')} onAction={() => router.replace('/shop')} />
      </View>
    );
  }

  const imgs = pImages(p);
  const off = discountPct(p);
  const wished = wishlist.includes(p.id);
  const inCart = cart.find((l) => l.id === p.id)?.qty || 0;
  const canBuy = p.stock > 0 && p.price > 0;
  const wa = settings.whatsapp || '201125157767';
  const url = `${ORIGIN}/p/${encodeURIComponent(p.id)}`;
  const partNumbers = (p.partNumbers || []).filter(Boolean);
  const H = Math.min(width, 600) * 0.82;

  const add = (go?: boolean) => {
    addToCart(p.id, qty, pn || partNumbers[0]);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    if (go) router.push('/cart');
  };
  const askWa = () =>
    openWhatsApp(wa, lang === 'ar'
      ? `أهلاً FixIt، عاوز أسأل عن: ${p.name}${p.sku ? ` (كود ${p.sku})` : ''}\n${url}`
      : `Hi FixIt, I'd like to ask about: ${pName(lang, p)}${p.sku ? ` (SKU ${p.sku})` : ''}\n${url}`);
  const share = () => Share.share({ message: `${pName(lang, p)} — ${money(lang, p.price)}\n${url}` }).catch(() => {});
  const sendReview = async () => {
    if (!rv.name.trim()) return Alert.alert(t('err_name'));
    setRv((s) => ({ ...s, busy: true }));
    try {
      const r = await api.addReview({ productId: p.id, rating: rv.rating, name: rv.name, comment: rv.comment });
      setReviews((l) => [r, ...l]);
      setRv({ open: false, rating: 5, name: rv.name, comment: '', busy: false });
      Alert.alert(t('review_thanks'));
    } catch (e: any) {
      setRv((s) => ({ ...s, busy: false }));
      Alert.alert(e?.message === 'NETWORK' ? t('net_error') : e?.message);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        {/* 🖼️ الصور */}
        <View style={{ backgroundColor: C.white }}>
          {imgs.length > 1 ? (
            <FlatList
              data={imgs}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(u, i) => u + i}
              onMomentumScrollEnd={(e) => setSlide(Math.round(Math.abs(e.nativeEvent.contentOffset.x) / width))}
              renderItem={({ item }) => (
                <Image source={{ uri: thumb(item, 1000) }} style={{ width, height: H, marginTop: insets.top }} contentFit="contain" transition={200} />
              )}
            />
          ) : (
            <PartImage p={p} size={1000} style={{ width: '100%', height: H, marginTop: insets.top }} />
          )}
          {imgs.length > 1 ? (
            <View style={styles.dots}>
              {imgs.map((_, i) => <View key={i} style={[styles.dot, i === slide && { backgroundColor: C.primary, width: 18 }]} />)}
            </View>
          ) : null}
        </View>
        <View style={[styles.topBtns, { top: insets.top + S.sm }]}>
          <IconButton testID="back" label="back" name={isRTL ? 'arrow-right' : 'arrow-left'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <View style={{ flex: 1 }} />
          <IconButton label={t('share')} name="share-variant" onPress={share} />
          <IconButton testID="wish-toggle" label={t('wishlist')} name={wished ? 'heart' : 'heart-outline'} color={wished ? C.red : C.text} onPress={() => toggleWish(p.id)} />
        </View>

        {/* ℹ️ البيانات */}
        <View style={styles.body}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: S.sm }}>
            <Badge label={p.brand} color={C.navy} bg={C.primarySoft} />
            <Badge label={p.condition === 'used' ? t('used') : t('new')} color={p.condition === 'used' ? C.amber : C.green} bg={p.condition === 'used' ? C.amberSoft : C.greenSoft} />
            <Badge label={catName(lang, p.category)} color={C.muted} bg={C.bg} />
          </View>
          <Txt testID="product-name" w="bold" size={20} style={{ lineHeight: 32 }}>{pName(lang, p)}</Txt>
          {p.ratingCount ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Stars value={p.ratingAvg || 0} />
              <Txt size={12} color={C.muted}>{p.ratingAvg} · {p.ratingCount} {t('reviews')}</Txt>
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginTop: S.md, flexWrap: 'wrap' }}>
            <Txt testID="product-price" w="black" size={26} color={C.navy} style={{ lineHeight: 36 }}>{p.price > 0 ? money(lang, p.price) : t('price_on_request')}</Txt>
            {off ? (
              <>
                <Txt size={15} color={C.faint} style={{ textDecorationLine: 'line-through' }}>{money(lang, p.oldPrice || 0)}</Txt>
                <Badge label={t('save_pct', { n: off })} color={C.white} bg={C.red} />
              </>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Icon name={p.stock > 0 ? 'check-circle' : 'close-circle'} size={16} color={p.stock > 0 ? C.green : C.red} />
            <Txt w="semibold" size={13} color={p.stock > 0 ? (p.stock <= 2 ? C.orange : C.green) : C.red}>
              {p.stock <= 0 ? t('out_of_stock') : p.stock <= 2 ? t('only_left', { n: p.stock }) : t('in_stock')}
            </Txt>
          </View>
        </View>

        {/* 🚗 بتركب على */}
        {p.fits?.length ? (
          <Card style={styles.block}>
            <Txt w="bold" size={15} style={{ marginBottom: S.sm }}>{t('fits')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {p.fits.map((f) => (
                <Pressable key={f} onPress={() => router.push({ pathname: '/shop', params: { model: f } })}
                  style={[styles.fit, f === car && { backgroundColor: C.greenSoft, borderColor: C.green }]}>
                  {f === car ? <Icon name="check-circle" size={14} color={C.green} /> : null}
                  <Txt w="bold" size={13} color={f === car ? C.green : C.text} style={{ lineHeight: 20 }}>{p.brand} {f}</Txt>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        {/* 🔢 أرقام القطعة */}
        {partNumbers.length || p.oem || p.sku || p.warranty ? (
          <Card style={styles.block}>
            <Txt w="bold" size={15} style={{ marginBottom: S.xs }}>{t('details')}</Txt>
            {partNumbers.length > 1 ? (
              <View style={{ marginBottom: S.sm }}>
                <Txt size={13} color={C.muted} style={{ marginBottom: 6 }}>{t('part_number')}</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {partNumbers.map((n) => {
                    const on = (pn || partNumbers[0]) === n;
                    return (
                      <Pressable key={n} onPress={() => { tap(); setPn(n); }} style={[styles.fit, on && { borderColor: C.primary, backgroundColor: C.primarySoft }]}>
                        <Txt w="bold" size={13} color={on ? C.primary : C.text} style={{ lineHeight: 20 }}>{n}</Txt>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}
            {([
              [t('oem'), p.oem],
              [t('part_number'), partNumbers.length === 1 && partNumbers[0] !== p.sku ? partNumbers[0] : ''],
              [t('sku'), p.sku],
              [t('warranty'), (lang === 'en' && p.warrantyEn) || p.warranty],
            ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
              <Pressable key={k} onLongPress={() => Clipboard.setStringAsync(String(v)).then(() => Alert.alert(t('copied')))} style={styles.kv}>
                <Txt size={13} color={C.muted} style={{ flex: 1 }}>{k}</Txt>
                <Txt w="bold" size={13} selectable>{v}</Txt>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {pDesc(lang, p) && pDesc(lang, p) !== p.name ? (
          <Card style={styles.block}>
            <Txt w="bold" size={15} style={{ marginBottom: S.xs }}>{t('description')}</Txt>
            <Txt color={C.muted} selectable>{pDesc(lang, p)}</Txt>
          </Card>
        ) : null}

        {/* ⭐ التقييمات */}
        <Card style={styles.block}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Txt w="bold" size={15} style={{ flex: 1 }}>{t('reviews')} {reviews.length ? `(${reviews.length})` : ''}</Txt>
            {!rv.open ? <Pressable onPress={() => setRv((s) => ({ ...s, open: true }))} hitSlop={8}><Txt w="bold" color={C.primary}>{t('write_review')}</Txt></Pressable> : null}
          </View>
          {rv.open ? (
            <View style={{ marginTop: S.md }}>
              <View style={{ flexDirection: 'row', gap: 6, marginBottom: S.md, justifyContent: 'center' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Pressable key={i} onPress={() => { tap(); setRv((s) => ({ ...s, rating: i })); }} hitSlop={4} accessibilityLabel={`${i}`}>
                    <Icon name={rv.rating >= i ? 'star' : 'star-outline'} size={34} color="#f5a524" />
                  </Pressable>
                ))}
              </View>
              <Field placeholder={t('your_name')} value={rv.name} onChangeText={(v) => setRv((s) => ({ ...s, name: v }))} icon="account-outline" />
              <Field placeholder={t('your_comment')} value={rv.comment} onChangeText={(v) => setRv((s) => ({ ...s, comment: v }))} multiline />
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <Button title={t('cancel')} variant="outline" style={{ flex: 1 }} onPress={() => setRv((s) => ({ ...s, open: false }))} />
                <Button title={t('send')} style={{ flex: 1 }} loading={rv.busy} onPress={sendReview} />
              </View>
            </View>
          ) : null}
          {reviews.length ? (
            reviews.slice(0, 10).map((r) => (
              <View key={r.id}>
                <Divider />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Txt w="bold" size={13}>{r.name}</Txt>
                  {r.verified ? <Badge label={t('verified_buyer')} color={C.green} bg={C.greenSoft} /> : null}
                  <View style={{ flex: 1 }} />
                  <Txt size={11} color={C.faint}>{dateStr(lang, r.createdAt)}</Txt>
                </View>
                <Stars value={r.rating} size={13} />
                {r.comment ? <Txt size={13} color={C.muted} style={{ marginTop: 2 }}>{r.comment}</Txt> : null}
              </View>
            ))
          ) : !rv.open ? (
            <Txt size={13} color={C.muted} style={{ marginTop: S.sm }}>{t('no_reviews')}</Txt>
          ) : null}
        </Card>

        <ProductRail title={t('similar')} items={similar} />
      </ScrollView>

      {/* 🛒 شريط الشراء */}
      <View style={[styles.buyBar, { paddingBottom: insets.bottom + S.sm }]}>
        {canBuy ? (
          <>
            <View style={styles.stepper}>
              <Pressable testID="qty-minus" accessibilityLabel="-" onPress={() => { tap(); setQty((q) => Math.max(1, q - 1)); }} style={styles.stepBtn}><Icon name="minus" size={18} /></Pressable>
              <Txt w="bold" size={16} center style={{ minWidth: 24 }}>{qty}</Txt>
              <Pressable testID="qty-plus" accessibilityLabel="+" onPress={() => { tap(); setQty((q) => Math.min(p.stock - inCart > 0 ? p.stock - inCart : 1, q + 1)); }} style={styles.stepBtn}><Icon name="plus" size={18} /></Pressable>
            </View>
            <Button testID="add-to-cart" title={added ? t('added') : t('add_to_cart')} icon={added ? 'check' : 'cart-plus'} variant={added ? 'dark' : 'primary'} style={{ flex: 1 }}
              disabled={inCart >= p.stock} onPress={() => add(false)} />
            <IconButton label={t('ask_whatsapp')} name="whatsapp" color={C.white} bg={C.whatsapp} onPress={askWa} size={24} />
          </>
        ) : (
          <>
            <Button title={t('request_it')} icon="clipboard-text-search-outline" variant="orange" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/request', params: { part: p.name } })} />
            <Button title={t('ask_whatsapp')} icon="whatsapp" variant="whatsapp" style={{ flex: 1 }} onPress={askWa} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBtns: { position: 'absolute', start: S.lg, end: S.lg, flexDirection: 'row', gap: S.sm },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: S.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.line },
  body: { backgroundColor: C.card, padding: S.lg, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl, ...shadow },
  block: { marginHorizontal: S.lg, marginTop: S.md },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: C.line, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 4 },
  kv: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  buyBar: {
    position: 'absolute', bottom: 0, start: 0, end: 0, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card,
    paddingHorizontal: S.lg, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.line,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.bg, borderRadius: R.md, height: 52, paddingHorizontal: 4 },
  stepBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});
