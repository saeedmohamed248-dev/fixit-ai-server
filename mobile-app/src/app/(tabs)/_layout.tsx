import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, type IconName } from '../../components/ui';
import { useApp } from '../../lib/store';
import { C } from '../../lib/theme';

export default function TabsLayout() {
  const { t, cartCount } = useApp();
  const insets = useSafeAreaInsets();
  const icon = (on: IconName, off: IconName) => ({ focused, color }: { focused: boolean; color: unknown }) => (
    <Icon name={focused ? on : off} size={25} color={String(color ?? C.faint)} />
  );
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.primary,
        tabBarInactiveTintColor: C.faint,
        tabBarLabelStyle: { fontFamily: F.semibold, fontSize: 11, lineHeight: 19, paddingHorizontal: 4, paddingBottom: 2 },
        tabBarIconStyle: { marginBottom: 0 },
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.line,
          height: 70 + (Platform.OS === 'web' ? 0 : insets.bottom),
          paddingTop: 6,
          paddingBottom: Platform.OS === 'web' ? 8 : Math.max(insets.bottom, 8),
        },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: icon('home-variant', 'home-outline') }} />
      <Tabs.Screen name="shop" options={{ title: t('tab_shop'), tabBarIcon: icon('storefront', 'storefront-outline') }} />
      <Tabs.Screen
        name="cart"
        options={{
          title: t('tab_cart'),
          tabBarIcon: icon('cart', 'cart-outline'),
          tabBarBadge: cartCount ? cartCount : undefined,
          tabBarBadgeStyle: { backgroundColor: C.orange, fontFamily: F.bold, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="account" options={{ title: t('tab_account'), tabBarIcon: icon('account-circle', 'account-circle-outline') }} />
    </Tabs>
  );
}
