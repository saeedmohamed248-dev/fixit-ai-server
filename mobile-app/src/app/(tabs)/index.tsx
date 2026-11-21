import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CarBar, openWhatsApp, ProductRail } from '../../components/blocks';
import { ProductCard } from '../../components/ProductCard';
import { Button, ChevronNext, Empty, Icon, type IconName, IconButton, Loader, SectionHeader, tap, Txt } from '../../components/ui';
import { discountPct, isNewArrival } from '../../lib/format';
import { CATEGORIES, catName } from '../../lib/i18n';
import { useApp } from '../../lib/store';
import { C, R, S, shadow } from '../../lib/theme';

export default function Home() {
  const { t, lang, products, catalogState, refreshCatalog, settings, car, user, cartCount, recent, byId } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const W = Math.min(width, 700);

  const data = useMemo(() => {
    const forCar = car ? products.filter((p) => p.fits?.includes(car)) : [];
    const heroIds = settings.heroProducts || [];
    const hero = heroIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products;
    const withImg = (l: typeof products) => [...l].sort((a, b) => Number(!!(b.image || b.images?.length)) - Number(!!(a.image || a.images?.length)));
    const best = withImg(products.filter((p) => (p.sold || 0) > 0)).sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, 12);
    const fresh = products.filter(isNewArrival).sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)).slice(0, 12);
    const newest = fresh.length ? fresh : [...products].sort((a, b) => +new Date(b.createdAt || 0) - +new Date(a.createdAt || 0)).slice(0, 12);
    const used = withImg(products.filter((p) => p.condition === 'used')).slice(0, 12);
    const deals = products.filter((p) => discountPct(p) > 0).slice(0, 12);
    const catCount: Record<string, number> = {};
    for (const p of products) catCount[p.category] = (catCount[p.category] || 0) + 1;
    return { forCar: withImg(forCar).slice(0, 12), hero, best, newest, used, deals, catCount };
  }, [products, settings, car]);

  const recentItems = recent.map(byId).filter(Boolean).slice(0, 10) as typeof products;
  const onRefresh = async () => { setRefreshing(true); await refreshCatalog(); setRefreshing(false); };
  const wa = settings.whatsapp || '201125157767';
  const shop = (params: Record<string, string>) => router.push({ pathname: '/shop', params });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: S.xl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.white} />}
    >
      {/* 🔝 الهيدر */}
      <LinearGradient colors={[C.navy, C.navy2]} style={[styles.header, { paddingTop: insets.top + S.md }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Txt w="black" size={26} color={C.white} style={{ lineHeight: 34, letterSpacing: 0.5 }}>
              Fix<Txt w="black" size={26} color="#8f93ff">It</Txt>
            </Txt>
            <Txt size={12} color="rgba(255,255,255,0.7)" style={{ lineHeight: 18 }}>
              {user ? `${t('hello')} ${user.name.split(' ')[0]} 👋` : t('app_tagline')}
            </Txt>
          </View>
          <IconButton label={t('expert')} name="robot-outline" color={C.white} bg="rgba(255,255,255,0.12)" onPress={() => router.push('/expert')} />
          <IconButton label={t('cart')} name="cart-outline" color={C.white} bg="rgba(255,255,255,0.12)" badge={cartCount} onPress={() => router.push('/cart')} />
        </View>
        <Pressable testID="home-search" onPress={() => { tap(); router.push('/search'); }} style={styles.search} accessibilityRole="search">
          <Icon name="magnify" size={22} color={C.muted} />
          <Txt color={C.faint} numberOfLines={1} style={{ flex: 1 }}>{t('search_ph')}</Txt>
        </Pressable>
        <View style={{ marginTop: S.md }}>
          <CarBar />
        </View>
      </LinearGradient>

      {/* ✅ شريط الثقة */}
      <View style={styles.trust}>
        {([
          ['shield-check', t('trust_original')],
          ['certificate-outline', t('trust_warranty')],
          ['truck-fast', t('trust_delivery')],
          ['whatsapp', t('trust_support')],
        ] as [IconName, string][]).map(([ic, label]) => (
          <View key={label} style={styles.trustItem}>
            <Icon name={ic} size={22} color={C.primary} />
            <Txt w="semibold" size={10.5} center color={C.text} style={{ lineHeight: 15 }}>{label}</Txt>
          </View>
        ))}
      </View>

      {catalogState === 'loading' && !products.length ? (
        <View style={{ height: 300 }}><Loader label={t('loading')} /></View>
      ) : catalogState === 'error' && !products.length ? (
        <Empty icon="wifi-off" title={t('net_error')} action={t('retry')} onAction={refreshCatalog} />
      ) : (
        <>
          {/* 🗂️ الأقسام */}
          <SectionHeader title={t('categories')} action={t('see_all')} onAction={() => shop({})} />
          <View style={styles.cats}>
            {CATEGORIES.filter((c) => data.catCount[c.key]).map((c) => (
              <Pressable
                key={c.key}
                testID={`cat-${c.en}`}
                onPress={() => { tap(); shop({ category: c.key }); }}
                style={({ pressed }) => [styles.cat, { width: (W - S.lg * 2 - S.sm * 3) / 4, opacity: pressed ? 0.8 : 1 }]}
              >
                <View style={styles.catIcon}><Icon name={c.icon as IconName} size={26} color={C.primary} /></View>
                <Txt w="semibold" size={11} center numberOfLines={2} style={{ lineHeight: 15 }}>{catName(lang, c.key)}</Txt>
              </Pressable>
            ))}
          </View>

          {car && data.forCar.length ? (
            <ProductRail title={`${t('parts_for')} ${car}`} items={data.forCar} onAll={() => shop({ model: car })} />
          ) : null}

          {/* ⭐ مختارات */}
          {data.hero.length ? (
            <View>
              <SectionHeader title={t('featured')} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: S.lg, gap: S.md }}>
                {data.hero.map((p) => <ProductCard key={p.id} p={p} width={Math.min(W * 0.62, 260)} />)}
              </ScrollView>
            </View>
          ) : null}

          <ProductRail title={t('deals')} items={data.deals} />
          <ProductRail title={t('best_sellers')} items={data.best} onAll={() => shop({ sort: 'best' })} />

          {/* 🤖 الخبير */}
          <Pressable onPress={() => router.push('/expert')} style={{ marginHorizontal: S.lg, marginTop: S.xl }}>
            <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.expert}>
              <View style={styles.expertIcon}><Icon name="robot-outline" size={30} color={C.primary} /></View>
              <View style={{ flex: 1 }}>
                <Txt w="bold" size={16} color={C.white}>{t('expert_title')}</Txt>
                <Txt size={12.5} color="rgba(255,255,255,0.85)" style={{ lineHeight: 19 }}>{t('expert_sub')}</Txt>
              </View>
              <ChevronNext color={C.white} />
            </LinearGradient>
          </Pressable>

          <ProductRail title={t('new_arrivals')} items={data.newest} onAll={() => shop({ sort: 'newest' })} />
          <ProductRail title={t('used_import')} items={data.used} onAll={() => shop({ condition: 'used' })} />
          <ProductRail title={t('recently_viewed')} items={recentItems} />

          {/* 💬 واتساب */}
          <View style={[styles.waCard, shadow]}>
            <Icon name="whatsapp" size={34} color={C.whatsapp} />
            <View style={{ flex: 1 }}>
              <Txt w="bold" size={15}>{t('no_results_sub')}</Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: S.sm, marginHorizontal: S.lg, marginTop: S.sm }}>
            <Button title={t('whatsapp')} icon="whatsapp" variant="whatsapp" style={{ flex: 1 }} onPress={() => openWhatsApp(wa, lang === 'ar' ? 'أهلاً FixIt، محتاج قطعة:' : 'Hi FixIt, I need a part:')} />
            <Button title={t('request_it')} icon="clipboard-text-search-outline" variant="dark" style={{ flex: 1 }} onPress={() => router.push('/request')} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: S.lg, paddingBottom: S.xl + S.md, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm, backgroundColor: C.white, borderRadius: R.md, height: 50, paddingHorizontal: S.md,
  },
  trust: {
    flexDirection: 'row', marginHorizontal: S.lg, marginTop: -S.lg, backgroundColor: C.card, borderRadius: R.lg, paddingVertical: S.md, ...shadow,
  },
  trustItem: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, paddingHorizontal: S.lg },
  cat: { backgroundColor: C.card, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: 4, alignItems: 'center', gap: 6, ...shadow },
  catIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  expert: { flexDirection: 'row', alignItems: 'center', gap: S.md, borderRadius: R.lg, padding: S.lg },
  expertIcon: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  waCard: {
    flexDirection: 'row', alignItems: 'center', gap: S.md, backgroundColor: C.card, borderRadius: R.lg, padding: S.lg,
    marginHorizontal: S.lg, marginTop: S.xl,
  },
});
