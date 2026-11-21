import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Button, Card, Field, Txt } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { C, S } from '../lib/theme';

export default function Profile() {
  const { t, user, setUser, signOut } = useApp();
  const [f, setF] = useState({ name: user?.name || '', email: user?.email || '', currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState({ open: false, password: '', busy: false });
  if (!user) return null;
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return Alert.alert(t('err_name'));
    setBusy(true);
    try {
      const body: any = { name: f.name.trim(), email: f.email.trim() };
      if (f.newPassword) { body.currentPassword = f.currentPassword; body.newPassword = f.newPassword; }
      setUser(await api.updateMe(body));
      Alert.alert('✓', t('done'));
      router.back();
    } catch (e: any) {
      Alert.alert('', e?.message === 'NETWORK' ? t('net_error') : e?.message);
    } finally {
      setBusy(false);
    }
  };

  // 🗑️ حذف الحساب من جوه التطبيق (شرط من أبل وجوجل)
  const deleteAccount = async () => {
    setDel((s) => ({ ...s, busy: true }));
    try {
      await api.deleteAccount(del.password);
      signOut();
      router.dismissAll();
      Alert.alert('✓', t('account_deleted'));
    } catch (e: any) {
      setDel((s) => ({ ...s, busy: false }));
      Alert.alert('', e?.message === 'NETWORK' ? t('net_error') : e?.message);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: S.lg, gap: S.md }} keyboardShouldPersistTaps="handled">
        <Card>
          <Field label={t('full_name')} value={f.name} onChangeText={set('name')} icon="account-outline" />
          <Field label={t('email_opt')} value={f.email} onChangeText={set('email')} icon="email-outline" keyboardType="email-address" autoCapitalize="none" />
          <Field label={t('phone')} value={user.phone} editable={false} icon="cellphone" />
        </Card>
        <Card>
          <Txt w="bold" style={{ marginBottom: S.sm }}>{t('change_password')}</Txt>
          <Field placeholder={t('current_password')} value={f.currentPassword} onChangeText={set('currentPassword')} secureTextEntry icon="lock-outline" />
          <Field placeholder={t('new_password')} value={f.newPassword} onChangeText={set('newPassword')} secureTextEntry icon="lock-reset" />
        </Card>
        <Button title={t('save')} onPress={save} loading={busy} />

        <Card style={{ marginTop: S.xl, borderWidth: 1, borderColor: C.redSoft }}>
          <Txt w="bold" color={C.red}>{t('delete_account')}</Txt>
          <Txt size={13} color={C.muted} style={{ marginBottom: S.md }}>{t('delete_account_sub')}</Txt>
          {del.open ? (
            <>
              <Field testID="del-pass" placeholder={t('password')} value={del.password} onChangeText={(v) => setDel((s) => ({ ...s, password: v }))} secureTextEntry icon="lock-outline" />
              <Button testID="del-confirm" variant="danger" title={t('delete_account_confirm')} loading={del.busy} disabled={del.password.length < 6} onPress={deleteAccount} />
            </>
          ) : (
            <Button variant="outline" title={t('delete_account')} icon="delete-outline" onPress={() => setDel((s) => ({ ...s, open: true }))} style={{ borderColor: C.red }} />
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
