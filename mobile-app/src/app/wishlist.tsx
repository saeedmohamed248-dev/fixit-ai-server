import { router } from 'expo-router';
import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { Empty } from '../components/ui';
import { useApp } from '../lib/store';
import { S } from '../lib/theme';
import type { Product } from '../lib/types';

export default function Wishlist() {
  const { t, wishlist, byId } = useApp();
  const { width } = useWindowDimensions();
  const items = wishlist.map(byId).filter(Boolean) as Product[];
  const w = (width - S.lg * 2 - S.md) / 2;
  return (
    <FlatList
      data={items}
      numColumns={2}
      keyExtractor={(p) => p.id}
      columnWrapperStyle={{ gap: S.md }}
      contentContainerStyle={{ padding: S.lg, gap: S.md }}
      renderItem={({ item }) => <ProductCard p={item} width={w} />}
      ListEmptyComponent={<Empty icon="heart-outline" title={t('wishlist_empty')} sub={t('wishlist_sub')} action={t('start_shopping')} onAction={() => router.navigate('/shop')} />}
    />
  );
}
