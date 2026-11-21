import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Icon, tap, Txt } from '../components/ui';
import { CHASSIS_LABEL, isMiniChassis } from '../lib/format';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';

export default function Garage() {
  const { t, products, car, setCar } = useApp();
  const [make, setMake] = useState<'BMW' | 'MINI'>(car && isMiniChassis(car) ? 'MINI' : 'BMW');

  const chassis = useMemo(() => {
    const count: Record<string, number> = {};
    for (const p of products) for (const f of p.fits || []) count[f] = (count[f] || 0) + 1;
    return Object.entries(count)
      .filter(([c]) => (make === 'MINI') === isMiniChassis(c))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [products, make]);

  const pick = (c: string) => { tap(); setCar(c); router.back(); };

  return (
    <ScrollView contentContainerStyle={{ padding: S.lg }}>
      <Txt color={C.muted} style={{ marginBottom: S.lg }}>{t('garage_sub')}</Txt>
      <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.lg }}>
        <Chip label="BMW" active={make === 'BMW'} onPress={() => setMake('BMW')} />
        <Chip label="MINI" active={make === 'MINI'} onPress={() => setMake('MINI')} />
      </View>
      <View style={styles.grid}>
        {chassis.map(([c, n]) => (
          <Pressable key={c} testID={`car-${c}`} onPress={() => pick(c)} style={[styles.car, car === c && styles.on]}>
            <Icon name="car-side" size={26} color={car === c ? C.white : C.primary} />
            <Txt w="black" size={17} color={car === c ? C.white : C.text}>{c}</Txt>
            <Txt size={11} color={car === c ? 'rgba(255,255,255,0.8)' : C.muted} numberOfLines={1}>{CHASSIS_LABEL[c] && CHASSIS_LABEL[c] !== c ? CHASSIS_LABEL[c] : make}</Txt>
            <Txt w="semibold" size={11} color={car === c ? C.white : C.primary}>{n}</Txt>
          </Pressable>
        ))}
      </View>
      {car ? <Button variant="ghost" title={t('clear_car')} icon="close" onPress={() => { setCar(null); router.back(); }} style={{ marginTop: S.lg }} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  car: { width: '31.5%', backgroundColor: C.card, borderRadius: R.md, padding: S.md, alignItems: 'center', borderWidth: 1.5, borderColor: C.line },
  on: { backgroundColor: C.primary, borderColor: C.primary },
});
