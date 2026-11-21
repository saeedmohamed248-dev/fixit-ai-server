import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { OrderCard } from '../components/OrderView';
import { Empty, Loader } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { S } from '../lib/theme';
import type { Order } from '../lib/types';

export default function Orders() {
  const { t, user } = useApp();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => api.myOrders().then((o) => { setOrders(o); setErr(false); }).catch(() => setErr(true)),
    [],
  );
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api.myOrders().then((o) => { if (alive) { setOrders(o); setErr(false); } }).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [user]);

  if (!user) return <Empty icon="account-circle-outline" title={t('login_sub')} action={t('login')} onAction={() => router.push('/login')} />;
  if (err && !orders) return <Empty icon="wifi-off" title={t('net_error')} action={t('retry')} onAction={load} />;
  if (!orders) return <Loader />;
  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.number}
      contentContainerStyle={{ padding: S.lg, gap: S.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/track', params: { number: item.number, phone: item.customer?.phone || user.phone } })}>
          <OrderCard o={item} />
        </Pressable>
      )}
      ListEmptyComponent={<Empty icon="package-variant-closed" title={t('no_orders')} action={t('start_shopping')} onAction={() => router.navigate('/shop')} />}
    />
  );
}
