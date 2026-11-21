import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openWhatsApp } from '../components/blocks';
import { Button, Card, Icon, Txt } from '../components/ui';
import { money } from '../lib/format';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';

export default function OrderSuccess() {
  const { t, lang, settings } = useApp();
  const insets = useSafeAreaInsets();
  const p = useLocalSearchParams<{ number: string; total: string; payment: string; phone: string; deposit?: string; points?: string }>();
  const [copied, setCopied] = useState('');
  const total = Number(p.total) || 0;
  const deposit = Number(p.deposit) || 0;
  const payNow = p.payment === 'deposit' && deposit ? deposit : total;
  const payTo = p.payment === 'wallet' ? settings.wallet || '01125157767' : settings.instapay || '01125157767';
  const wa = settings.whatsapp || '201125157767';
  const copy = async (v: string) => { await Clipboard.setStringAsync(v); setCopied(v); setTimeout(() => setCopied(''), 1500); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: S.lg, paddingTop: insets.top + S.xl * 1.5, gap: S.md, paddingBottom: insets.bottom + S.xl }}>
      <View style={styles.check}><Icon name="check-bold" size={56} color={C.white} /></View>
      <Txt testID="order-ok" w="black" size={24} center>{t('order_ok')}</Txt>
      <Txt color={C.muted} center>{t('order_next')}</Txt>

      <Card style={{ alignItems: 'center' }}>
        <Txt size={13} color={C.muted}>{t('order_no')}</Txt>
        <Txt testID="order-number" w="black" size={28} color={C.primary} selectable onPress={() => copy(p.number)}>{p.number}</Txt>
        <Txt size={12} color={copied === p.number ? C.green : C.faint}>{copied === p.number ? t('copied') : t('copy')}</Txt>
        <View style={{ flexDirection: 'row', marginTop: S.md }}>
          <Txt w="semibold" color={C.muted} style={{ flex: 1 }}>{t('total')}</Txt>
          <Txt w="black" size={16}>{money(lang, total)}</Txt>
        </View>
        {p.points && Number(p.points) > 0 ? <Txt w="semibold" color={C.amber} style={{ marginTop: S.sm }}>{t('points_earned', { n: p.points })}</Txt> : null}
      </Card>

      {p.payment === 'instapay' || p.payment === 'wallet' || p.payment === 'deposit' ? (
        <Card style={{ backgroundColor: C.primarySoft }}>
          <Txt w="semibold" style={{ marginBottom: S.sm }}>{t('transfer_to', { n: money(lang, payNow) })}</Txt>
          <View style={styles.payBox}>
            <Icon name={p.payment === 'wallet' ? 'wallet-outline' : 'bank-transfer'} size={24} color={C.primary} />
            <View style={{ flex: 1 }}>
              <Txt size={12} color={C.muted}>{p.payment === 'wallet' ? t('pay_wallet') : t('pay_instapay')}</Txt>
              <Txt w="black" size={20} selectable>{payTo}</Txt>
            </View>
            <Button small variant="outline" title={copied === payTo ? t('copied') : t('copy')} onPress={() => copy(payTo)} />
          </View>
          <Button style={{ marginTop: S.md }} variant="whatsapp" icon="whatsapp" title={t('send_receipt')}
            onPress={() => openWhatsApp(wa, lang === 'ar' ? `أهلاً FixIt، دي صورة تحويل طلب رقم ${p.number} بمبلغ ${payNow} ج.م` : `Hi FixIt, here is the transfer receipt for order ${p.number} (EGP ${payNow})`)} />
        </Card>
      ) : null}

      <Button variant="dark" icon="truck-delivery-outline" title={t('track_order')} onPress={() => router.replace({ pathname: '/track', params: { number: p.number, phone: p.phone } })} />
      <Button variant="outline" title={t('continue_shopping')} onPress={() => router.replace('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  check: { width: 104, height: 104, borderRadius: 52, backgroundColor: C.green, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: S.md },
  payBox: { flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.white, borderRadius: R.md, padding: S.md },
});
