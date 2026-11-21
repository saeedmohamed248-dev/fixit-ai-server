import React from 'react';
import { View } from 'react-native';
import { dateStr, money } from '../lib/format';
import { useApp } from '../lib/store';
import { C, S } from '../lib/theme';
import type { Order } from '../lib/types';
import { Badge, Card, Divider, Icon, Txt } from './ui';

const STEPS = ['new', 'confirmed', 'shipped', 'delivered'] as const;

export function StatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useApp();
  const map = {
    new: [C.primary, C.primarySoft], confirmed: [C.amber, C.amberSoft], shipped: [C.orange, C.orangeSoft],
    delivered: [C.green, C.greenSoft], cancelled: [C.red, C.redSoft],
  } as const;
  const [c, bg] = map[status] || map.new;
  return <Badge label={t(`st_${status}` as any)} color={c} bg={bg} />;
}

export function Timeline({ status }: { status: Order['status'] }) {
  const { t } = useApp();
  if (status === 'cancelled') return <StatusBadge status="cancelled" />;
  const idx = STEPS.indexOf(status as any);
  return (
    <View style={{ marginTop: S.sm }}>
      {STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <View key={s} style={{ flexDirection: 'row', gap: S.md, minHeight: 40 }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: done ? C.green : C.line, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <Icon name="check" size={15} color={C.white} /> : null}
              </View>
              {i < STEPS.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: i < idx ? C.green : C.line }} /> : null}
            </View>
            <Txt w={i === idx ? 'bold' : 'regular'} color={done ? C.text : C.faint}>{t(`st_${s}` as any)}</Txt>
          </View>
        );
      })}
    </View>
  );
}

export function OrderCard({ o, expanded }: { o: Order; expanded?: boolean }) {
  const { t, lang } = useApp();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}>
        <View style={{ flex: 1 }}>
          <Txt w="black" size={16} selectable>{o.number}</Txt>
          <Txt size={12} color={C.muted}>{dateStr(lang, o.createdAt)}</Txt>
        </View>
        <StatusBadge status={o.status} />
      </View>
      {expanded ? <Timeline status={o.status} /> : null}
      <Divider />
      {o.items.map((i, k) => (
        <View key={k} style={{ flexDirection: 'row', gap: S.sm, paddingVertical: 2 }}>
          <Txt size={13} color={C.muted} numberOfLines={1} style={{ flex: 1 }}>{i.qty} × {i.name}</Txt>
          {i.price ? <Txt size={13}>{money(lang, i.price * i.qty)}</Txt> : null}
        </View>
      ))}
      <Divider />
      <View style={{ flexDirection: 'row' }}>
        <Txt w="bold" style={{ flex: 1 }}>{t('total')}</Txt>
        <Txt w="black" color={C.navy}>{money(lang, o.total)}</Txt>
      </View>
      {o.deposit ? (
        <Txt size={12} color={C.muted}>{t('pay_deposit')}: {money(lang, o.deposit)} + {money(lang, o.balanceDue || 0)}</Txt>
      ) : null}
    </Card>
  );
}
