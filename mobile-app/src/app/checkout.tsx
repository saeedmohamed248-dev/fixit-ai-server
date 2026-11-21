import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Divider, Empty, Field, Icon, type IconName, Row, tap, Txt } from '../components/ui';
import { api } from '../lib/api';
import { calcDeposit, depositEnabled, money, pName, toLatinDigits, validPhone } from '../lib/format';
import { getCoupon, setCoupon } from '../lib/session';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';
import type { Order } from '../lib/types';

type Pay = 'instapay' | 'wallet' | 'deposit';

export default function Checkout() {
  const { t, lang, cart, byId, user, settings, clearCart, checkoutDraft, saveCheckoutDraft, refreshCatalog, refreshUser } = useApp();
  const insets = useSafeAreaInsets();
  const [f, setF] = useState({
    name: checkoutDraft?.name || user?.name || '',
    phone: checkoutDraft?.phone || user?.phone || '',
    city: checkoutDraft?.city || '',
    address: checkoutDraft?.address || '',
    email: checkoutDraft?.email || user?.email || '',
    notes: '',
  });
  const [pay, setPay] = useState<Pay>('instapay');
  const [usePoints, setUsePoints] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const lines = cart.map((l) => ({ ...l, p: byId(l.id) })).filter((l) => l.p && l.p.price > 0);
  const coupon = getCoupon();
  const subtotal = lines.reduce((s, l) => s + l.p!.price * l.qty, 0);
  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const points = user?.points || 0;
  const pointsUsed = usePoints ? Math.min(points, subtotal - discount) : 0;
  const total = subtotal - discount - pointsUsed;
  const depOn = depositEnabled(settings);
  const deposit = calcDeposit(total, settings);

  if (!lines.length) return <Empty icon="cart-outline" title={t('cart_empty')} action={t('start_shopping')} onAction={() => router.replace('/shop')} />;

  const set = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setErrs((e) => ({ ...e, [k]: '' })); };

  const submit = async () => {
    const phone = toLatinDigits(f.phone).replace(/[\s-]/g, '');
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t('err_name');
    if (!validPhone(phone)) e.phone = t('err_phone');
    if (!f.city.trim()) e.city = t('err_city');
    if (!f.address.trim()) e.address = t('err_address');
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const order = await api.placeOrder({
        customer: { name: f.name.trim(), phone, city: f.city.trim(), address: f.address.trim(), email: f.email.trim() },
        items: lines.map((l) => ({ id: l.id, qty: l.qty, partNumber: l.partNumber || '' })),
        coupon: coupon?.code || '',
        payment: pay,
        notes: [f.notes.trim(), '📱 App'].filter(Boolean).join(' — '),
        usePoints: pointsUsed,
      }) as Order;
      saveCheckoutDraft({ name: f.name.trim(), phone, city: f.city.trim(), address: f.address.trim(), email: f.email.trim() });
      clearCart();
      setCoupon(null);
      refreshCatalog();
      if (user) refreshUser();
      router.dismissAll();
      router.replace({
        pathname: '/order-success',
        params: {
          number: order.number, total: String(order.total), payment: order.payment, phone,
          deposit: String(order.deposit || ''), points: String(order.pointsEarned || ''),
        },
      });
    } catch (err: any) {
      Alert.alert('', err?.message === 'NETWORK' ? t('net_error') : err?.message);
    } finally {
      setBusy(false);
    }
  };

  const options: [Pay, IconName, string, string][] = [
    ['instapay', 'bank-transfer', t('pay_instapay'), t('pay_instapay_sub')],
    ['wallet', 'wallet-outline', t('pay_wallet'), t('pay_instapay_sub')],
  ];
  if (depOn) options.push(['deposit', 'cash', t('pay_deposit'), t('pay_deposit_sub', { n: money(lang, deposit) })]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Txt w="bold" size={16} style={{ marginBottom: S.md }}>{t('delivery_info')}</Txt>
          <Field testID="f-name" label={t('full_name')} value={f.name} onChangeText={set('name')} icon="account-outline" error={errs.name} autoComplete="name" />
          <Field testID="f-phone" label={t('phone')} value={f.phone} onChangeText={set('phone')} icon="cellphone" placeholder={t('phone_ph')} keyboardType="phone-pad" maxLength={14} error={errs.phone} autoComplete="tel" />
          <Field testID="f-city" label={t('city')} value={f.city} onChangeText={set('city')} icon="city-variant-outline" error={errs.city} />
          <Field testID="f-address" label={t('address')} value={f.address} onChangeText={set('address')} icon="map-marker-outline" error={errs.address} autoComplete="street-address" />
          <Field label={t('email_opt')} value={f.email} onChangeText={set('email')} icon="email-outline" keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('notes')} value={f.notes} onChangeText={set('notes')} icon="note-text-outline" />
        </Card>

        <Card>
          <Txt w="bold" size={16} style={{ marginBottom: S.md }}>{t('payment_method')}</Txt>
          {options.map(([k, ic, title, sub]) => (
            <Pressable key={k} testID={`pay-${k}`} onPress={() => { tap(); setPay(k); }} style={[styles.pay, pay === k && styles.payOn]}>
              <Icon name={ic} size={24} color={pay === k ? C.primary : C.muted} />
              <View style={{ flex: 1 }}>
                <Txt w="bold" size={14}>{title}</Txt>
                <Txt size={12} color={C.muted}>{sub}</Txt>
              </View>
              <Icon name={pay === k ? 'radiobox-marked' : 'radiobox-blank'} color={pay === k ? C.primary : C.faint} />
            </Pressable>
          ))}
          {points > 0 ? (
            <View style={[styles.pay, { borderColor: C.amberSoft, backgroundColor: C.amberSoft }]}>
              <Icon name="star" size={22} color="#f5a524" />
              <Txt w="semibold" size={13} style={{ flex: 1 }}>{t('use_points', { n: points })}</Txt>
              <Switch value={usePoints} onValueChange={setUsePoints} trackColor={{ true: C.primary }} />
            </View>
          ) : null}
        </Card>

        <Card>
          <Txt w="bold" size={16} style={{ marginBottom: S.sm }}>{t('order_summary')}</Txt>
          {lines.map((l) => (
            <View key={l.id} style={{ flexDirection: 'row', gap: S.sm, paddingVertical: 4 }}>
              <Txt size={13} color={C.muted} numberOfLines={1} style={{ flex: 1 }}>{l.qty} × {pName(lang, l.p!)}</Txt>
              <Txt w="semibold" size={13}>{money(lang, l.p!.price * l.qty)}</Txt>
            </View>
          ))}
          <Divider />
          <Row k={t('subtotal')} v={money(lang, subtotal)} />
          {discount ? <Row k={`${t('discount')} (${coupon?.code})`} v={'- ' + money(lang, discount)} color={C.green} /> : null}
          {pointsUsed ? <Row k={t('points')} v={'- ' + money(lang, pointsUsed)} color={C.green} /> : null}
          <Row k={t('shipping')} v={t('shipping_note')} color={C.muted} />
          <Divider />
          <Row k={t('total')} v={money(lang, total)} bold />
        </Card>
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + S.md }]}>
        <Button testID="place-order" title={`${t('place_order')} · ${money(lang, total)}`} icon="check-circle" onPress={submit} loading={busy} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pay: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderWidth: 1.5, borderColor: C.line, borderRadius: R.md, padding: S.md, marginBottom: S.sm },
  payOn: { borderColor: C.primary, backgroundColor: C.primarySoft },
  bottom: { position: 'absolute', bottom: 0, start: 0, end: 0, backgroundColor: C.card, padding: S.lg, borderTopWidth: 1, borderTopColor: C.line },
});
