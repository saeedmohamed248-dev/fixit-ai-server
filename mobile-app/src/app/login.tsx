import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Button, Field, Icon, Txt } from '../components/ui';
import { api } from '../lib/api';
import { toLatinDigits, validPhone } from '../lib/format';
import { useApp } from '../lib/store';
import { C, S } from '../lib/theme';

export default function Login() {
  const { t, signIn } = useApp();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'register'>(params.mode === 'register' ? 'register' : 'login');
  const [f, setF] = useState({ name: '', phone: '', password: '', email: '' });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [serverErr, setServerErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF((s) => ({ ...s, [k]: v })); setErrs((e) => ({ ...e, [k]: '' })); setServerErr(''); };

  const submit = async () => {
    const phone = toLatinDigits(f.phone).replace(/[\s-]/g, '');
    const e: Record<string, string> = {};
    if (mode === 'register' && !f.name.trim()) e.name = t('err_name');
    if (!validPhone(phone)) e.phone = t('err_phone');
    if (f.password.length < 6) e.password = t('err_pass');
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = mode === 'login'
        ? await api.login(phone, f.password)
        : await api.register({ name: f.name.trim(), phone, password: f.password, email: f.email.trim() });
      signIn(r.token, r.user);
      router.back();
    } catch (err: any) {
      setServerErr(err?.message === 'NETWORK' ? t('net_error') : err?.message || '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.xl, gap: S.sm }} keyboardShouldPersistTaps="handled">
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: S.md }}>
          <Icon name="account-circle-outline" size={42} color={C.primary} />
        </View>
        <Txt w="black" size={24} center>{mode === 'login' ? t('welcome_back') : t('register')}</Txt>
        <Txt color={C.muted} center style={{ marginBottom: S.lg }}>{t('login_sub')}</Txt>
        {mode === 'register' ? <Field testID="l-name" label={t('full_name')} value={f.name} onChangeText={set('name')} icon="account-outline" error={errs.name} autoComplete="name" /> : null}
        <Field testID="l-phone" label={t('phone')} value={f.phone} onChangeText={set('phone')} icon="cellphone" placeholder={t('phone_ph')} keyboardType="phone-pad" error={errs.phone} autoComplete="tel" maxLength={14} />
        <View>
          <Field testID="l-pass" label={t('password')} value={f.password} onChangeText={set('password')} icon="lock-outline" secureTextEntry={!showPass} error={errs.password} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          <Pressable onPress={() => setShowPass((s) => !s)} hitSlop={10} style={{ position: 'absolute', end: 14, top: 42 }} accessibilityLabel="show password">
            <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.faint} />
          </Pressable>
        </View>
        {mode === 'register' ? <Field label={t('email_opt')} value={f.email} onChangeText={set('email')} icon="email-outline" keyboardType="email-address" autoCapitalize="none" /> : null}
        {serverErr ? <Txt testID="login-error" w="semibold" color={C.red} center>{serverErr}</Txt> : null}
        <Button testID="l-submit" title={mode === 'login' ? t('login') : t('register')} onPress={submit} loading={busy} style={{ marginTop: S.sm }} />
        <Pressable onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setServerErr(''); setErrs({}); }} style={{ padding: S.md }}>
          <Txt w="bold" color={C.primary} center>{mode === 'login' ? t('no_account') : t('have_account')}</Txt>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
