import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Field, Txt } from '../components/ui';
import { api } from '../lib/api';
import { toLatinDigits, validPhone } from '../lib/format';
import { useApp } from '../lib/store';
import { C, S } from '../lib/theme';

export default function RequestPart() {
  const { t, user, car, checkoutDraft } = useApp();
  const p = useLocalSearchParams<{ part?: string }>();
  const [f, setF] = useState({
    name: user?.name || checkoutDraft?.name || '',
    phone: user?.phone || checkoutDraft?.phone || '',
    partName: p.part || '',
    car: car || '',
    notes: '',
  });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setErrs((e) => ({ ...e, [k]: '' })); };

  const submit = async () => {
    const phone = toLatinDigits(f.phone).replace(/[\s-]/g, '');
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = t('err_name');
    if (!validPhone(phone)) e.phone = t('err_phone');
    if (!f.partName.trim()) e.partName = t('req_part');
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.partRequest({ name: f.name.trim(), phone, partName: f.partName.trim(), car: f.car.trim(), notes: f.notes.trim() });
      Alert.alert(t('req_ok'));
      router.back();
    } catch (err: any) {
      Alert.alert('', err?.message === 'NETWORK' ? t('net_error') : err?.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg }} keyboardShouldPersistTaps="handled">
        <Txt color={C.muted} style={{ marginBottom: S.lg }}>{t('req_sub')}</Txt>
        <Field testID="r-part" label={t('req_part')} value={f.partName} onChangeText={set('partName')} icon="cog-outline" error={errs.partName} />
        <Field label={t('req_car')} value={f.car} onChangeText={set('car')} icon="car-side" placeholder="BMW F30 2015" />
        <Field testID="r-name" label={t('full_name')} value={f.name} onChangeText={set('name')} icon="account-outline" error={errs.name} />
        <Field testID="r-phone" label={t('phone')} value={f.phone} onChangeText={set('phone')} icon="cellphone" keyboardType="phone-pad" placeholder={t('phone_ph')} error={errs.phone} />
        <Field label={t('notes')} value={f.notes} onChangeText={set('notes')} multiline />
        <Button testID="r-submit" title={t('send')} icon="send" onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
