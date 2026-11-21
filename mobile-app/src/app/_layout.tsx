import { Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold, useFonts } from '@expo-google-fonts/cairo';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { F } from '../components/ui';
import { AppProvider, useApp } from '../lib/store';
import { C } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Root() {
  const { ready, t } = useApp();
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold });
  const show = ready && fontsLoaded;
  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => {});
  }, [show]);
  if (!show) return <View style={{ flex: 1, backgroundColor: C.navy }} />;
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.card },
          headerTitleStyle: { fontFamily: F.bold, fontSize: 17, color: C.text },
          headerTintColor: C.text,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: C.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="checkout" options={{ title: t('checkout') }} />
        <Stack.Screen name="order-success" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="orders" options={{ title: t('my_orders') }} />
        <Stack.Screen name="track" options={{ title: t('track_order') }} />
        <Stack.Screen name="wishlist" options={{ title: t('wishlist') }} />
        <Stack.Screen name="expert" options={{ title: t('expert') }} />
        <Stack.Screen name="login" options={{ title: '', presentation: 'modal' }} />
        <Stack.Screen name="garage" options={{ title: t('garage'), presentation: 'modal' }} />
        <Stack.Screen name="request" options={{ title: t('req_title'), presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ title: t('edit_profile') }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
