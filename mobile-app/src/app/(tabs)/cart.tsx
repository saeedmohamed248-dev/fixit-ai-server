import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PartImage } from '../../components/ProductCard';
import { Button, Card, Divider, Empty, Field, Icon, Row, tap, Txt } from '../../components/ui';
import { api } from '../../lib/api';
import { freeShippingOver, money, pName } from '../../lib/format';
import { type AppliedCoupon, getCoupon, setCoupon as saveCoupon } from '../../lib/session';
import { useApp } from '../../lib/store';
import { C, R, S } from '../../lib/theme';


export default function Cart() {
  const { t, lang, cart, byId, setQty, removeFromCart, settings } = useApp();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(getCoupon()?.code || '');
  const [coupon, setCoupon] = useState<AppliedCoupon>(getCoupon());
  const [cErr, setCErr] = useState('');
  const [busy, setBusy] = useState(false);

  const lines = cart.map((l) => ({ ...l, p: byId(l.id) })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + (l.p!.price || 0) * l.qty, 0);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = subtotal - discount;
  const freeOver = freeShippingOver(settings);
  const left = freeOver ? freeOver - total : 0;

  const applyCoupon = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setCErr('');
    try {
      const r = await api.validateCoupon(code.trim(), subtotal, lines.map((l) => ({ id: l.id, qty: l.qty })));
      setCoupon(r);
      saveCoupon(r);
    } catch (e: any) {
      setCoupon(null);
      saveCoupon(null);
      setCErr(e?.message === 'NETWORK' ? t('net_error') : e?.message || '');
    } finally {
      setBusy(false);
    }
  };

  if (!lines.length) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: C.bg }}>
        <Empty icon="cart-outline" title={t('cart_empty')} sub={t('cart_empty_sub')} action={t('start_shopping')} onAction={() => router.navigate('/shop')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.md }]}>
        <Txt w="bold" size={22}>{t('cart')} <Txt w="semibold" size={15} color={C.muted}>({lines.length})</Txt></Txt>
      </View>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 160 }}>
        {freeOver ? (
          <View style={styles.ship}>
            <Icon name="truck-fast" size={20} color={left > 0 ? C.primary : C.green} />
            <View style={{ flex: 1 }}>
              <Txt w="semibold" size={13}>{left > 0 ? t('free_ship_left', { n: money(lang, left) }) : t('free_ship_ok')}</Txt>
              <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (total / freeOver) * 100)}%`, backgroundColor: left > 0 ? C.primary : C.green }]} /></View>
            </View>
          </View>
        ) : null}

        {lines.map(({ id, qty, p, partNumber }) => (
          <Card key={id} style={styles.line} pad={false}>
            <Pressable onPress={() => router.push(`/product/${id}`)}>
              <PartImage p={p!} size={200} style={{ width: 86, height: 86, borderRadius: R.md }} />
            </Pressable>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt w="semibold" size={13} numberOfLines={2} style={{ lineHeight: 20 }}>{pName(lang, p!)}</Txt>
              {partNumber ? <Txt size={11} color={C.faint}>{partNumber}</Txt> : null}
              <Txt w="black" size={15} color={C.navy}>{money(lang, p!.price * qty)}</Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
                <View style={styles.stepper}>
                  <Pressable accessibilityLabel="-" onPress={() => { tap(); qty > 1 ? setQty(id, qty - 1) : removeFromCart(id); }} style={styles.stepBtn}>
                    <Icon name={qty > 1 ? 'minus' : 'trash-can-outline'} size={17} color={qty > 1 ? C.text : C.red} />
                  </Pressable>
                  <Txt w="bold" center style={{ minWidth: 22 }}>{qty}</Txt>
                  <Pressable accessibilityLabel="+" disabled={qty >= p!.stock} onPress={() => { tap(); setQty(id, qty + 1); }} style={[styles.stepBtn, qty >= p!.stock && { opacity: 0.3 }]}>
                    <Icon name="plus" size={17} />
                  </Pressable>
                </View>
                {qty >= p!.stock ? <Txt size={11} color={C.orange}>{t('stock_limited', { n: p!.stock })}</Txt> : null}
              </View>
            </View>
            <Pressable accessibilityLabel={t('remove')} hitSlop={8} onPress={() => { tap(); removeFromCart(id); }} style={{ padding: 4 }}>
              <Icon name="close" size={18} color={C.faint} />
            </Pressable>
          </Card>
        ))}

        <Card>
          <Txt w="bold" size={15} style={{ marginBottom: S.sm }}>{t('coupon')}</Txt>
          <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Field testID="coupon-input" value={code} onChangeText={(v) => { setCode(v); setCErr(''); }} placeholder="FIXIT10" autoCapitalize="characters" icon="ticket-percent-outline" error={cErr} />
            </View>
            <Button title={t('apply')} variant="dark" onPress={applyCoupon} loading={busy} style={{ width: 90 }} />
          </View>
          {coupon ? <Txt w="semibold" color={C.green}>✓ {coupon.code} — {money(lang, discount)}</Txt> : null}
        </Card>

        <Card>
          <Row k={t('subtotal')} v={money(lang, subtotal)} />
          {discount ? <Row k={t('discount')} v={'- ' + money(lang, discount)} color={C.green} /> : null}
          <Row k={t('shipping')} v={freeOver && left <= 0 ? t('free') : t('shipping_note')} color={freeOver && left <= 0 ? C.green : C.muted} />
          <Divider />
          <Row k={t('total')} v={money(lang, total)} bold />
        </Card>
      </ScrollView>

      <View style={styles.bottom}>
        <View style={{ flex: 1 }}>
          <Txt size={12} color={C.muted}>{t('total')}</Txt>
          <Txt w="black" size={20} color={C.navy} style={{ lineHeight: 28 }}>{money(lang, total)}</Txt>
        </View>
        <Button testID="go-checkout" title={t('checkout')} icon="lock-outline" style={{ flex: 1.4 }} onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  head: { backgroundColor: C.card, paddingHorizontal: S.lg, paddingBottom: S.md, borderBottomWidth: 1, borderBottomColor: C.line },
  ship: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.primarySoft, borderRadius: R.lg, padding: S.md },
  track: { height: 6, backgroundColor: C.white, borderRadius: 3, marginTop: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  line: { flexDirection: 'row', gap: S.md, padding: S.md, alignItems: 'flex-start' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: R.sm, marginTop: 4 },
  stepBtn: { width: 34, height: 32, alignItems: 'center', justifyContent: 'center' },
  bottom: {
    position: 'absolute', bottom: 0, start: 0, end: 0, flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card,
    padding: S.lg, borderTopWidth: 1, borderTopColor: C.line,
  },
});
