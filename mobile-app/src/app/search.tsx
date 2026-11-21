import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PartImage, ProductCard } from '../components/ProductCard';
import { Button, Chip, Empty, F, Icon, IconButton, noOutline, tap, Txt, useStartAlign } from '../components/ui';
import { api } from '../lib/api';
import { inEgyptBranch, money, pName } from '../lib/format';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';
import type { Product } from '../lib/types';

const HIST = 'fx_search_hist';
const POPULAR_AR = ['طرمبة مياه', 'مساعدين', 'فلتر زيت', 'كويل', 'تيل فرامل', 'رديتر', 'F30', 'E90', 'R56'];
const POPULAR_EN = ['Water pump', 'Shock absorber', 'Oil filter', 'Ignition coil', 'Brake pads', 'Radiator', 'F30', 'E90', 'R56'];

export default function Search() {
  const { t, lang, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const align = useStartAlign();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Product[] | null>(null);
  const [oos, setOos] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const [hist, setHist] = useState<string[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(HIST).then((v) => v && setHist(JSON.parse(v))).catch(() => {});
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) { setRes(null); setOos([]); setErr(false); return; }
    const my = ++seq.current;
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const [list, out] = await Promise.all([api.search(query), api.outOfStock(query).catch(() => [])]);
        if (my !== seq.current) return;
        setRes(list.filter(inEgyptBranch));
        setOos(out.filter(inEgyptBranch).slice(0, 6));
        setErr(false);
      } catch {
        if (my === seq.current) setErr(true);
      } finally {
        if (my === seq.current) setBusy(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  const remember = (s: string) => {
    const v = s.trim();
    if (v.length < 2) return;
    const next = [v, ...hist.filter((h) => h !== v)].slice(0, 8);
    setHist(next);
    AsyncStorage.setItem(HIST, JSON.stringify(next)).catch(() => {});
  };

  const near = !!res?.length && !!res[0]._near;
  const cardW = (width - S.lg * 2 - S.md) / 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.head, { paddingTop: insets.top + S.sm }]}>
        <IconButton label={t('close')} name={isRTL ? 'arrow-right' : 'arrow-left'} bg={C.bg} onPress={() => router.back()} />
        <View style={styles.inputWrap}>
          <Icon name="magnify" size={20} color={C.muted} />
          <TextInput
            testID="search-input"
            autoFocus
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => remember(q)}
            placeholder={t('search_ph')}
            placeholderTextColor={C.faint}
            returnKeyType="search"
            style={{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.text, textAlign: align, paddingVertical: 0, ...noOutline }}
          />
          {busy ? <ActivityIndicator size="small" color={C.primary} /> : q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}><Icon name="close-circle" size={18} color={C.faint} /></Pressable>
          ) : null}
        </View>
      </View>

      {res === null ? (
        <View style={{ padding: S.lg }}>
          {hist.length ? (
            <>
              <Txt w="bold" color={C.muted} style={{ marginBottom: S.sm }}>{t('recent_searches')}</Txt>
              <View style={styles.wrap}>{hist.map((h) => <Chip key={h} label={h} icon="history" onPress={() => setQ(h)} />)}</View>
            </>
          ) : null}
          <Txt w="bold" color={C.muted} style={{ marginTop: S.lg, marginBottom: S.sm }}>{t('popular_searches')}</Txt>
          <View style={styles.wrap}>{(lang === 'ar' ? POPULAR_AR : POPULAR_EN).map((h) => <Chip key={h} label={h} onPress={() => setQ(h)} />)}</View>
        </View>
      ) : err ? (
        <Empty icon="wifi-off" title={t('net_error')} action={t('retry')} onAction={() => setQ((s) => s + ' ')} />
      ) : (
        <FlatList
          data={res}
          numColumns={2}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          columnWrapperStyle={{ gap: S.md }}
          contentContainerStyle={{ padding: S.lg, gap: S.md, paddingBottom: S.xl * 2 }}
          renderItem={({ item }) => (
            <View onTouchStart={() => remember(q)}>
              <ProductCard p={item} width={cardW} />
            </View>
          )}
          ListHeaderComponent={
            <View>
              {oos.length ? (
                <View style={styles.oos}>
                  <Txt w="bold" size={14} style={{ marginBottom: S.sm }}>📦 {t('oos_title')}</Txt>
                  {oos.map((p) => (
                    <View key={p.id} style={styles.oosRow}>
                      <PartImage p={p} size={120} style={{ width: 48, height: 48, borderRadius: 8 }} />
                      <View style={{ flex: 1 }}>
                        <Txt w="semibold" size={13} numberOfLines={1}>{pName(lang, p)}</Txt>
                        {p.price ? <Txt size={12} color={C.muted}>{t('last_price')}: {money(lang, p.price)}</Txt> : null}
                      </View>
                      <Button small variant="orange" title={t('request_it')} onPress={() => { tap(); router.push({ pathname: '/request', params: { part: p.name } }); }} />
                    </View>
                  ))}
                </View>
              ) : null}
              {near ? <Txt w="semibold" color={C.orange} style={{ marginBottom: S.sm }}>{t('near_results')}</Txt> : null}
            </View>
          }
          ListEmptyComponent={
            oos.length ? undefined : (
              <Empty icon="car-search" title={t('no_results')} sub={t('no_results_sub')} action={t('request_it')} onAction={() => router.push({ pathname: '/request', params: { part: q } })} />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.card, paddingHorizontal: S.lg, paddingBottom: S.md },
  inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.bg, borderRadius: R.md, height: 46, paddingHorizontal: S.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  oos: { backgroundColor: C.orangeSoft, borderRadius: R.lg, padding: S.md, marginBottom: S.md },
  oosRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, paddingVertical: 6 },
});
