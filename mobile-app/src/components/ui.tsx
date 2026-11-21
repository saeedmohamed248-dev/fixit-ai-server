import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { useApp } from '../lib/store';
import { C, R, S, shadow } from '../lib/theme';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// على الويب: نشيل إطار التركيز الأسود حوالين خانات الكتابة
export const noOutline: any = Platform.OS === 'web' ? { outlineStyle: 'none' } : {};

export const F = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
  black: 'Cairo_800ExtraBold',
};

/** محاذاة بداية السطر — على الموبايل RN بيقلب left تلقائياً في RTL، على الويب لا */
export function useStartAlign(): TextStyle['textAlign'] {
  const { isRTL } = useApp();
  if (Platform.OS === 'web') return isRTL ? 'right' : 'left';
  return 'left';
}

type TxtProps = TextProps & {
  w?: keyof typeof F;
  size?: number;
  color?: string;
  center?: boolean;
};
export function Txt({ w = 'regular', size = 14, color = C.text, center, style, ...rest }: TxtProps) {
  const align = useStartAlign();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: F[w], fontSize: size, color, textAlign: center ? 'center' : align, lineHeight: Math.round(size * 1.55) },
        style,
      ]}
    />
  );
}

export function Icon({ name, size = 22, color = C.text, flip }: { name: IconName; size?: number; color?: string; flip?: boolean }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={flip ? { transform: [{ scaleX: -1 }] } : undefined} />;
}

/** سهم "للأمام" حسب اتجاه اللغة */
export function ChevronNext({ size = 20, color = C.faint }: { size?: number; color?: string }) {
  const { isRTL } = useApp();
  return <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={size} color={color} />;
}

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

type BtnProps = {
  title: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: 'primary' | 'dark' | 'outline' | 'ghost' | 'whatsapp' | 'orange' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  small?: boolean;
  testID?: string;
};
export function Button({ title, onPress, icon, variant = 'primary', loading, disabled, style, small, testID }: BtnProps) {
  const bg = {
    primary: C.primary, dark: C.navy, outline: 'transparent', ghost: 'transparent', whatsapp: C.whatsapp, orange: C.orange, danger: C.red,
  }[variant];
  const fg = variant === 'outline' || variant === 'ghost' ? C.primary : C.white;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        if (disabled || loading) return;
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && { height: 40, paddingHorizontal: S.md },
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        variant === 'outline' && { borderWidth: 1.5, borderColor: C.primary },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={small ? 18 : 20} color={fg} /> : null}
          <Txt w="bold" size={small ? 13 : 15} color={fg} style={{ lineHeight: small ? 20 : 24 }}>
            {title}
          </Txt>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, color = C.text, bg = C.card, size = 22, badge, label, testID }: {
  name: IconName; onPress?: () => void; color?: string; bg?: string; size?: number; badge?: number; label: string; testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => { tap(); onPress?.(); }}
      style={({ pressed }) => [styles.iconBtn, { backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}
    >
      <Icon name={name} size={size} color={color} />
      {badge ? (
        <View style={styles.badge}>
          <Txt w="bold" size={10} color={C.white} center style={{ lineHeight: 14 }}>{badge > 99 ? '99+' : badge}</Txt>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[]; pad?: boolean }) {
  return <View style={[styles.card, pad && { padding: S.lg }, style as ViewStyle]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.secHead}>
      <Txt w="bold" size={18} style={{ flex: 1 }}>{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10} style={styles.row}>
          <Txt w="semibold" size={13} color={C.primary}>{action}</Txt>
          <ChevronNext size={18} color={C.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => { tap(); onPress?.(); }}
      style={[styles.chip, active && { backgroundColor: C.navy, borderColor: C.navy }]}
    >
      {icon ? <Icon name={icon} size={16} color={active ? C.white : C.muted} /> : null}
      <Txt w="semibold" size={13} color={active ? C.white : C.text} style={{ lineHeight: 20 }}>{label}</Txt>
    </Pressable>
  );
}

export function Field({ label, icon, error, style, ...rest }: TextInputProps & { label?: string; icon?: IconName; error?: string }) {
  const align = useStartAlign();
  return (
    <View style={{ marginBottom: S.md }}>
      {label ? <Txt w="semibold" size={13} color={C.muted} style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <View style={[styles.field, !!error && { borderColor: C.red }, rest.multiline && { height: undefined, minHeight: 90, alignItems: 'flex-start', paddingVertical: 10 }]}>
        {icon ? <Icon name={icon} size={20} color={C.faint} /> : null}
        <TextInput
          placeholderTextColor={C.faint}
          {...rest}
          style={[{ flex: 1, fontFamily: F.regular, fontSize: 15, color: C.text, textAlign: align, paddingVertical: 0, ...noOutline }, rest.multiline && { textAlignVertical: 'top', minHeight: 70 }, style]}
        />
      </View>
      {error ? <Txt size={12} color={C.red} style={{ marginTop: 4 }}>{error}</Txt> : null}
    </View>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half-full' : 'star-outline'} size={size} color="#f5a524" />
      ))}
    </View>
  );
}

export function Loader({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={C.primary} />
      {label ? <Txt color={C.muted} style={{ marginTop: S.md }}>{label}</Txt> : null}
    </View>
  );
}

export function Empty({ icon, title, sub, action, onAction }: { icon: IconName; title: string; sub?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={[styles.center, { paddingVertical: 48, paddingHorizontal: S.xl }]}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={44} color={C.primary} />
      </View>
      <Txt w="bold" size={18} center>{title}</Txt>
      {sub ? <Txt color={C.muted} center style={{ marginTop: 6 }}>{sub}</Txt> : null}
      {action ? <Button title={action} onPress={onAction} style={{ marginTop: S.xl, minWidth: 200 }} /> : null}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: C.line, marginVertical: S.md }, style]} />;
}

export function Badge({ label, color = C.primary, bg = C.primarySoft }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: R.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' }}>
      <Txt w="bold" size={11} color={color} style={{ lineHeight: 17 }}>{label}</Txt>
    </View>
  );
}

export function Row({ k, v, bold, color }: { k: string; v: string; bold?: boolean; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
      <Txt w={bold ? 'bold' : 'regular'} size={bold ? 16 : 14} color={bold ? C.text : C.muted} style={{ flex: 1 }}>{k}</Txt>
      <Txt w={bold ? 'black' : 'semibold'} size={bold ? 17 : 14} color={color || C.text}>{v}</Txt>
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: S.xl },
  btn: {
    height: 52, borderRadius: R.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: S.lg,
  },
  iconBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -2, end: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.orange,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.white,
  },
  card: { backgroundColor: C.card, borderRadius: R.lg, ...shadow },
  secHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, marginTop: S.xl, marginBottom: S.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: R.pill,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.line,
  },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: 10, height: 52, borderRadius: R.md, borderWidth: 1.5,
    borderColor: C.line, backgroundColor: C.card, paddingHorizontal: S.md,
  },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: S.lg,
  },
});
