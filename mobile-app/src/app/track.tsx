import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { OrderCard } from '../components/OrderView';
import { Button, Card, Field, Txt } from '../components/ui';
import { api } from '../lib/api';
import { toLatinDigits } from '../lib/format';
import { useApp } from '../lib/store';
import { C, S } from '../lib/theme';
import type { Order } from '../lib/types';

function normNumber(n: string) {
  const q = toLatinDigits(n).trim().toUpperCase();
  return /^\d+$/.test(q) ? 'ORD-' + q : q;
}
const normPhone = (ph: string) => toLatinDigits(ph).replace(/[\s-]/g, '');

export default function Track() {
  const { t, user } = useApp();
  const p = useLocalSearchParams<{ number?: string; phone?: string }>();
  const [num, setNum] = useState(p.number || '');
  const [phone, setPhone] = useState(p.phone || user?.phone || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ret, setRet] = useState({ open: false, reason: '', busy: false, done: false });

  const go = async (n = num, ph = phone) => {
    if (!n.trim() || !ph.trim()) return;
    setBusy(true);
    setErr('');
    try {
      setOrder(await api.track(normNumber(n), normPhone(ph)));
    } catch (e: any) {
      setOrder(null);
      setErr(e?.message === 'NETWORK' ? t('net_error') : e?.message || '');
    } finally {
      setBusy(false);
    }
  };
  // 🔗 جاي من صفحة نجاح الطلب أو طلباتي — نتتبع على طول
  useEffect(() => {
    if (!p.number || !p.phone) return;
    let alive = true;
    api.track(normNumber(p.number), normPhone(p.phone))
      .then((o) => { if (alive) setOrder(o); })
      .catch((e) => { if (alive) setErr(e?.message === 'NETWORK' ? t('net_error') : e?.message || ''); });
    return () => { alive = false; };
  }, [p.number, p.phone, t]);

  const sendReturn = async () => {
    if (!order) return;
    setRet((s) => ({ ...s, busy: true }));
    try {
      await api.returnRequest(order.number, toLatinDigits(phone).replace(/[\s-]/g, ''), ret.reason);
      setRet({ open: false, reason: '', busy: false, done: true });
      Alert.alert(t('return_ok'));
    } catch (e: any) {
      setRet((s) => ({ ...s, busy: false }));
      Alert.alert('', e?.message === 'NETWORK' ? t('net_error') : e?.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }} keyboardShouldPersistTaps="handled">
        <Card>
          <Txt w="bold" size={17}>{t('track_title')}</Txt>
          <Txt color={C.muted} style={{ marginBottom: S.md }}>{t('track_sub')}</Txt>
          <Field testID="t-number" label={t('order_no')} value={num} onChangeText={setNum} placeholder={t('order_number_ph')} autoCapitalize="characters" icon="package-variant-closed" />
          <Field testID="t-phone" label={t('phone')} value={phone} onChangeText={setPhone} placeholder={t('phone_ph')} keyboardType="phone-pad" icon="cellphone" />
          {err ? <Txt testID="track-error" color={C.red} w="semibold" style={{ marginBottom: S.sm }}>{err}</Txt> : null}
          <Button testID="t-submit" title={t('track_btn')} icon="magnify" onPress={() => go()} loading={busy} />
        </Card>
        {order ? (
          <>
            <OrderCard o={order} expanded />
            {order.status === 'delivered' && !ret.done ? (
              ret.open ? (
                <Card>
                  <Field label={t('return_reason')} value={ret.reason} onChangeText={(v) => setRet((s) => ({ ...s, reason: v }))} multiline />
                  <Button title={t('send')} onPress={sendReturn} loading={ret.busy} />
                </Card>
              ) : (
                <Button variant="outline" icon="keyboard-return" title={t('return_req')} onPress={() => setRet((s) => ({ ...s, open: true }))} />
              )
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
