import { router } from 'expo-router';
import React from 'react';
import { FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';
import type { Product } from '../lib/types';
import { ProductCard } from './ProductCard';
import { Icon, SectionHeader, tap, Txt } from './ui';

export function ProductRail({ title, items, onAll }: { title: string; items: Product[]; onAll?: () => void }) {
  const { t } = useApp();
  if (!items.length) return null;
  return (
    <View>
      <SectionHeader title={title} action={onAll ? t('see_all') : undefined} onAction={onAll} />
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md, paddingBottom: S.sm }}
        renderItem={({ item }) => <ProductCard p={item} width={156} />}
      />
    </View>
  );
}

export function whatsappUrl(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

export function openWhatsApp(phone: string, text: string) {
  Linking.openURL(whatsappUrl(phone, text)).catch(() => {});
}

export function CarBar() {
  const { car, t } = useApp();
  return (
    <Pressable
      testID="car-bar"
      onPress={() => { tap(); router.push('/garage'); }}
      style={({ pressed }) => [styles.carBar, { opacity: pressed ? 0.85 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={t('my_car')}
    >
      <View style={styles.carIcon}>
        <Icon name="car-side" size={24} color={C.white} />
      </View>
      <View style={{ flex: 1 }}>
        {car ? (
          <>
            <Txt size={12} color="rgba(255,255,255,0.7)" style={{ lineHeight: 18 }}>{t('parts_for')}</Txt>
            <Txt w="bold" size={15} color={C.white} style={{ lineHeight: 22 }}>{(car.startsWith('R') || ['F54', 'F55', 'F56', 'F57', 'F60'].includes(car) ? 'MINI ' : 'BMW ') + car}</Txt>
          </>
        ) : (
          <>
            <Txt w="bold" size={14} color={C.white} style={{ lineHeight: 22 }}>{t('my_car')}</Txt>
            <Txt size={12} color="rgba(255,255,255,0.7)" numberOfLines={1} style={{ lineHeight: 18 }}>{t('pick_car')}</Txt>
          </>
        )}
      </View>
      <View style={styles.carChange}>
        <Txt w="bold" size={12} color={C.navy} style={{ lineHeight: 18 }}>{car ? t('change') : '+'}</Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  carBar: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: R.lg,
    padding: S.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  carIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  carChange: { backgroundColor: C.white, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 4 },
});
