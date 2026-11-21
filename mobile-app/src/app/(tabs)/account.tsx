import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openWhatsApp } from '../../components/blocks';
import { Button, ChevronNext, Icon, type IconName, tap, Txt } from '../../components/ui';
import { ORIGIN } from '../../lib/api';
import { money, num } from '../../lib/format';
import { useApp } from '../../lib/store';
import { C, R, S, shadow } from '../../lib/theme';

function MenuItem({ icon, label, onPress, value, color, testID }: { icon: IconName; label: string; onPress: () => void; value?: string; color?: string; testID?: string }): React.ReactElement {
  return (
    <Pressable testID={testID} onPress={() => { tap(); onPress(); }} style={({ pressed }) => [styles.item, pressed && { backgroundColor: C.bg }]} accessibilityRole="button">
      <View style={[styles.itemIcon, color ? { backgroundColor: color + '1a' } : null]}><Icon name={icon} size={20} color={color || C.primary} /></View>
      <Txt w="semibold" size={14} style={{ flex: 1 }} color={color === C.red ? C.red : C.text}>{label}</Txt>
      {value ? <Txt size={13} color={C.muted} numberOfLines={1} style={{ flexShrink: 1, maxWidth: '45%' }}>{value}</Txt> : null}
      <ChevronNext />
    </Pressable>
  );
}

export default function Account() {
  const { t, lang, user, signOut, setLang, wishlist, car, settings } = useApp();
  const insets = useSafeAreaInsets();
  const wa = settings.whatsapp || '201125157767';
  const phone = settings.phoneDisplay || '01125157767';


  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingBottom: S.xl * 2 }}>
      <LinearGradient colors={[C.navy, C.navy2]} style={[styles.head, { paddingTop: insets.top + S.lg }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
          <View style={styles.avatar}>
            <Txt w="black" size={24} color={C.white}>{user ? user.name.trim().charAt(0).toUpperCase() : '?'}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt testID="account-name" w="bold" size={18} color={C.white}>{user ? user.name : t('guest')}</Txt>
            <Txt size={13} color="rgba(255,255,255,0.7)">{user ? user.phone : t('login_sub')}</Txt>
          </View>
        </View>
        {user ? (
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Txt w="black" size={20} color={C.white}>{num(lang, user.points || 0)}</Txt>
              <Txt size={12} color="rgba(255,255,255,0.7)">⭐ {t('points')}</Txt>
            </View>
            <View style={styles.stat}>
              <Txt w="black" size={20} color={C.white}>{money(lang, user.credit || 0)}</Txt>
              <Txt size={12} color="rgba(255,255,255,0.7)">{t('credit')}</Txt>
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.lg }}>
            <Button testID="go-login" title={t('login')} style={{ flex: 1 }} onPress={() => router.push('/login')} />
            <Button title={t('register')} variant="outline" style={{ flex: 1, borderColor: C.white }} onPress={() => router.push({ pathname: '/login', params: { mode: 'register' } })} />
          </View>
        )}
      </LinearGradient>

      <View style={styles.group}>
        {user ? <MenuItem testID="menu-orders" icon="package-variant-closed" label={t('my_orders')} onPress={() => router.push('/orders')} /> : null}
        <MenuItem icon="truck-delivery-outline" label={t('track_order')} onPress={() => router.push('/track')} />
        <MenuItem icon="heart-outline" label={t('wishlist')} value={wishlist.length ? String(wishlist.length) : undefined} onPress={() => router.push('/wishlist')} />
        <MenuItem icon="car-side" label={t('my_car')} value={car || undefined} onPress={() => router.push('/garage')} />
        <MenuItem icon="robot-outline" label={t('expert')} onPress={() => router.push('/expert')} />
        <MenuItem icon="clipboard-text-search-outline" label={t('req_title')} onPress={() => router.push('/request')} />
      </View>

      <View style={styles.group}>
        <MenuItem testID="lang-toggle" icon="translate" label={t('language')} value={t('lang_name')} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} />
        {user ? <MenuItem icon="account-edit-outline" label={t('edit_profile')} onPress={() => router.push('/profile')} /> : null}
      </View>

      <View style={styles.group}>
        <MenuItem icon="whatsapp" color={C.whatsapp} label={t('whatsapp')} value={phone} onPress={() => openWhatsApp(wa, lang === 'ar' ? 'أهلاً FixIt' : 'Hi FixIt')} />
        <MenuItem icon="phone-outline" label={t('call_us')} onPress={() => Linking.openURL('tel:' + phone).catch(() => {})} />
        <MenuItem icon="map-marker-outline" label={t('our_location')} value={t('address_store')} onPress={() => Linking.openURL('https://share.google/InODxiIyOGIAOBHaM').catch(() => {})} />
        <MenuItem icon="earth" label={t('trade')} onPress={() => Linking.openURL(ORIGIN + '/trade.html').catch(() => {})} />
        <MenuItem icon="file-document-outline" label={t('policies')} onPress={() => Linking.openURL(ORIGIN + '/policies.html').catch(() => {})} />
        <MenuItem icon="shield-lock-outline" label={t('privacy')} onPress={() => Linking.openURL(ORIGIN + '/privacy.html').catch(() => {})} />
        <MenuItem icon="account-remove-outline" label={t('delete_account')} onPress={() => (user ? router.push('/profile') : Linking.openURL(ORIGIN + '/delete-account.html').catch(() => {}))} />
      </View>

      {user ? (
        <View style={styles.group}>
          <MenuItem icon="logout" color={C.red} label={t('logout')} onPress={() => Alert.alert(t('logout'), '', [{ text: t('cancel'), style: 'cancel' }, { text: t('logout'), style: 'destructive', onPress: signOut }])} />
        </View>
      ) : null}

      <Txt size={12} color={C.faint} center style={{ marginTop: S.lg }}>
        FixIt · {t('version')} {Constants.expoConfig?.version || '1.0.0'}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: S.lg, paddingBottom: S.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.25)' },
  stats: { flexDirection: 'row', gap: S.sm, marginTop: S.lg },
  stat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.md, padding: S.md },
  group: { backgroundColor: C.card, borderRadius: R.lg, marginHorizontal: S.lg, marginTop: S.lg, overflow: 'hidden', ...shadow },
  item: { flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.bg },
  itemIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
