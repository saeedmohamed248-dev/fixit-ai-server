import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProductCard } from '../../components/ProductCard';
import { Button, Chip, Empty, Icon, IconButton, Loader, tap, Txt } from '../../components/ui';
import { CHASSIS_LABEL, isMiniChassis } from '../../lib/format';
import { CATEGORIES, catName } from '../../lib/i18n';
import { useApp } from '../../lib/store';
import { C, R, S } from '../../lib/theme';

type SortKey = '' | 'newest' | 'price_asc' | 'price_desc' | 'best';
const SORTS: SortKey[] = ['', 'newest', 'price_asc', 'price_desc', 'best'];

export default function Shop() {
  const { t, lang, products, catalogState, refreshCatalog, car } = useApp();
  const params = useLocalSearchParams<{ category?: string; brand?: string; condition?: string; model?: string; sort?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [condition, setCondition] = useState('');
  const [model, setModel] = useState('');
  const [sort, setSort] = useState<SortKey>('');
  const [sheet, setSheet] = useState<null | 'filter' | 'sort'>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [limit, setLimit] = useState(30);

  // 🔗 الفلاتر اللي جاية من الرئيسية
  useEffect(() => {
    setCategory(params.category || '');
    setBrand(params.brand || '');
    setCondition(params.condition || '');
    setModel(params.model || '');
    setSort((params.sort as SortKey) || '');
    setLimit(30);
  }, [params.category, params.brand, params.condition, params.model, params.sort]);

  const models = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) for (const f of p.fits || []) if (!brand || (brand === 'MINI') === isMiniChassis(f)) set.add(f);
    return [...set].sort();
  }, [products, brand]);

  const list = useMemo(() => {
    let l = products;
    if (category) l = l.filter((p) => p.category === category);
    if (brand) l = l.filter((p) => p.brand === brand);
    if (condition) l = l.filter((p) => p.condition === condition);
    if (model) l = l.filter((p) => p.fits?.includes(model));
    const img = (p: (typeof l)[0]) => Number(!!(p.image || p.images?.length));
    // القطع اللي سعرها «عند الطلب» (صفر) بتروح آخر القايمة في ترتيب السعر
    const pv = (p: (typeof l)[0], dir: 1 | -1) => (p.price > 0 ? p.price * dir : Number.MAX_SAFE_INTEGER);
    if (sort === 'price_asc') l = [...l].sort((a, b) => pv(a, 1) - pv(b, 1));
    else if (sort === 'price_desc') l = [...l].sort((a, b) => pv(a, -1) - pv(b, -1));
    else if (sort === 'best') l = [...l].sort((a, b) => (b.sold || 0) - (a.sold || 0));
    else if (sort === 'newest') l = [...l].sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0));
    else l = [...l].sort((a, b) => img(b) - img(a) || (b.sold || 0) - (a.sold || 0));
    return l;
  }, [products, category, brand, condition, model, sort]);

  const activeCount = [brand, condition, model].filter(Boolean).length;
  const cols = width >= 700 ? 3 : 2;
  const cardW = (Math.min(width, 1000) - S.lg * 2 - S.md * (cols - 1)) / cols;
  const sortLabel = (s: SortKey) => t(s === '' ? 'sort_default' : (`sort_${s}` as any));
  const clearAll = () => { setBrand(''); setCondition(''); setModel(''); setCategory(''); };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.sm }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
          <Pressable testID="shop-search" onPress={() => router.push('/search')} style={styles.search}>
            <Icon name="magnify" size={20} color={C.muted} />
            <Txt color={C.faint} numberOfLines={1} style={{ flex: 1 }}>{t('search_ph')}</Txt>
          </Pressable>
          <IconButton label={t('filters')} name="tune-variant" bg={activeCount ? C.navy : C.bg} color={activeCount ? C.white : C.text} badge={activeCount} onPress={() => setSheet('filter')} testID="open-filters" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: S.sm, paddingTop: S.md }}>
          <Chip label={t('all')} active={!category} onPress={() => setCategory('')} />
          {CATEGORIES.map((c) => (
            <Chip key={c.key} label={catName(lang, c.key)} active={category === c.key} onPress={() => setCategory(category === c.key ? '' : c.key)} />
          ))}
        </ScrollView>
        <View style={styles.bar}>
          <Txt w="semibold" size={13} color={C.muted} style={{ flex: 1 }}>
            {list.length.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US')} {t('results')}
            {model ? ` · ${model}` : ''}
          </Txt>
          {car && model !== car ? (
            <Pressable onPress={() => setModel(car)} style={styles.carPill}>
              <Icon name="car-side" size={15} color={C.primary} />
              <Txt w="bold" size={12} color={C.primary} style={{ lineHeight: 18 }}>{car}</Txt>
            </Pressable>
          ) : null}
          <Pressable testID="open-sort" onPress={() => setSheet('sort')} style={styles.sortBtn} hitSlop={6}>
            <Icon name="sort" size={18} color={C.text} />
            <Txt w="semibold" size={13} style={{ lineHeight: 20 }}>{sortLabel(sort)}</Txt>
          </Pressable>
        </View>
      </View>

      {catalogState === 'loading' && !products.length ? (
        <Loader label={t('loading')} />
      ) : catalogState === 'error' && !products.length ? (
        <Empty icon="wifi-off" title={t('net_error')} action={t('retry')} onAction={refreshCatalog} />
      ) : (
        <FlatList
          key={cols}
          testID="shop-list"
          data={list.slice(0, limit)}
          numColumns={cols}
          keyExtractor={(p) => p.id}
          columnWrapperStyle={{ gap: S.md }}
          contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: S.xl * 2 }}
          renderItem={({ item }) => <ProductCard p={item} width={cardW} />}
          onEndReached={() => setLimit((l) => (l < list.length ? l + 30 : l))}
          onEndReachedThreshold={0.6}
          initialNumToRender={8}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshCatalog(); setRefreshing(false); }} />}
          ListEmptyComponent={
            <Empty icon="car-search" title={t('no_results')} sub={t('no_results_sub')} action={t('request_it')} onAction={() => router.push('/request')} />
          }
        />
      )}

      {/* 🎛️ الفلاتر والترتيب */}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + S.lg }]}>
          <View style={styles.grabber} />
          {sheet === 'sort' ? (
            <>
              <Txt w="bold" size={18} style={{ marginBottom: S.md }}>{t('sort')}</Txt>
              {SORTS.map((s) => (
                <Pressable key={s || 'def'} onPress={() => { tap(); setSort(s); setSheet(null); }} style={styles.sortRow}>
                  <Txt w={sort === s ? 'bold' : 'regular'} size={15} style={{ flex: 1 }}>{sortLabel(s)}</Txt>
                  <Icon name={sort === s ? 'radiobox-marked' : 'radiobox-blank'} color={sort === s ? C.primary : C.faint} />
                </Pressable>
              ))}
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: S.sm }}>
                <Txt w="bold" size={18} style={{ flex: 1 }}>{t('filters')}</Txt>
                <Pressable onPress={clearAll} hitSlop={8}><Txt w="semibold" color={C.red}>{t('clear_filters')}</Txt></Pressable>
              </View>
              <ScrollView style={{ maxHeight: 440 }}>
                <Txt w="bold" color={C.muted} style={styles.fTitle}>{t('brand')}</Txt>
                <View style={styles.wrap}>
                  {['', 'BMW', 'MINI'].map((b) => <Chip key={b || 'all'} label={b || t('all')} active={brand === b} onPress={() => { setBrand(b); setModel(''); }} />)}
                </View>
                <Txt w="bold" color={C.muted} style={styles.fTitle}>{t('condition')}</Txt>
                <View style={styles.wrap}>
                  {[['', t('all')], ['new', t('new')], ['used', t('used')]].map(([k, l]) => <Chip key={k || 'all'} label={l} active={condition === k} onPress={() => setCondition(k)} />)}
                </View>
                <Txt w="bold" color={C.muted} style={styles.fTitle}>{t('model')}</Txt>
                <View style={styles.wrap}>
                  <Chip label={t('all')} active={!model} onPress={() => setModel('')} />
                  {models.map((m) => <Chip key={m} label={CHASSIS_LABEL[m] && CHASSIS_LABEL[m] !== m ? `${m} · ${CHASSIS_LABEL[m]}` : m} active={model === m} onPress={() => setModel(m)} />)}
                </View>
              </ScrollView>
              <Button testID="apply-filters" title={`${t('show_results')} (${list.length})`} onPress={() => setSheet(null)} style={{ marginTop: S.lg }} />
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: C.card, paddingHorizontal: S.lg, paddingBottom: S.sm, borderBottomWidth: 1, borderBottomColor: C.line },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, height: 44, paddingHorizontal: S.md },
  bar: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingTop: S.md },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  carPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(13,18,48,0.45)' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: S.lg },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: S.md },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  fTitle: { marginTop: S.md, marginBottom: S.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
});
