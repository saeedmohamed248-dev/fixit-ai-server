import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { discountPct, isNewArrival, money, pImages, pName, thumb } from '../lib/format';
import { CATEGORIES } from '../lib/i18n';
import { useApp } from '../lib/store';
import { C, R, S, shadow } from '../lib/theme';
import type { Product } from '../lib/types';
import { Badge, Icon, type IconName, Stars, tap, Txt } from './ui';

export function PartImage({ p, size = 400, style, contentFit = 'contain' }: { p: Product; size?: number; style?: any; contentFit?: 'contain' | 'cover' }) {
  const img = pImages(p)[0];
  if (img) {
    return (
      <Image
        source={{ uri: thumb(img, size) }}
        style={[{ backgroundColor: '#f6f7fb' }, style]}
        contentFit={contentFit}
        transition={200}
        cachePolicy="memory-disk"
        recyclingKey={p.id}
        accessibilityLabel={p.name}
      />
    );
  }
  // 🖼️ قطعة من غير صورة: كارت أنيق بأيقونة القسم بدل مساحة فاضية
  const icon = (CATEGORIES.find((c) => c.key === p.category)?.icon || 'cog') as IconName;
  return (
    <View style={[{ backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Icon name={icon} size={44} color={C.primary} />
      <Txt w="black" size={12} color={C.primary} center style={{ marginTop: 4, letterSpacing: 1 }}>
        {p.brand} {p.fits?.[0] || ''}
      </Txt>
    </View>
  );
}

function ProductCardBase({ p, width }: { p: Product; width: number }) {
  const { lang, t, wishlist, toggleWish, car } = useApp();
  const off = discountPct(p);
  const fitsCar = car && p.fits?.includes(car);
  const wished = wishlist.includes(p.id);
  return (
    <Pressable
      testID={`product-${p.id}`}
      accessibilityRole="button"
      accessibilityLabel={pName(lang, p)}
      onPress={() => router.push(`/product/${p.id}`)}
      style={({ pressed }) => [styles.card, { width, opacity: pressed ? 0.9 : 1 }]}
    >
      <View>
        <PartImage p={p} style={{ width: '100%', height: width * 0.85, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg }} />
        <View style={styles.badges}>
          {off ? <Badge label={`-${off}%`} color={C.white} bg={C.red} /> : null}
          {p.condition === 'used' ? <Badge label={t('used')} color={C.amber} bg={C.amberSoft} /> : isNewArrival(p) ? <Badge label={t('new_arrivals')} color={C.green} bg={C.greenSoft} /> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wishlist')}
          hitSlop={8}
          onPress={() => { tap(); toggleWish(p.id); }}
          style={styles.heart}
        >
          <Icon name={wished ? 'heart' : 'heart-outline'} size={20} color={wished ? C.red : C.muted} />
        </Pressable>
      </View>
      <View style={{ padding: S.sm + 2, gap: 2 }}>
        {fitsCar ? (
          <View style={styles.fits}>
            <Icon name="check-circle" size={13} color={C.green} />
            <Txt w="bold" size={11} color={C.green} style={{ lineHeight: 16 }}>{t('fits_your_car')}</Txt>
          </View>
        ) : (
          <Txt w="semibold" size={11} color={C.faint} numberOfLines={1} style={{ lineHeight: 16 }}>
            {p.brand} · {(p.fits || []).slice(0, 3).join(' · ')}
          </Txt>
        )}
        <Txt w="semibold" size={13} numberOfLines={2} style={{ minHeight: 40, lineHeight: 20 }}>{pName(lang, p)}</Txt>
        {p.ratingCount ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Stars value={p.ratingAvg || 0} size={11} />
            <Txt size={11} color={C.muted} style={{ lineHeight: 16 }}>({p.ratingCount})</Txt>
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
          <Txt w="black" size={15} color={C.navy}>{p.price > 0 ? money(lang, p.price) : t('price_on_request')}</Txt>
          {off ? <Txt size={11} color={C.faint} style={{ textDecorationLine: 'line-through' }}>{money(lang, p.oldPrice || 0)}</Txt> : null}
        </View>
        {p.stock > 0 && p.stock <= 2 ? (
          <Txt w="semibold" size={11} color={C.orange} style={{ lineHeight: 16 }}>{t('only_left', { n: p.stock })}</Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: R.lg, ...shadow, overflow: 'hidden' },
  badges: { position: 'absolute', top: 8, start: 8, gap: 4 },
  heart: {
    position: 'absolute', top: 6, end: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
  },
  fits: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
