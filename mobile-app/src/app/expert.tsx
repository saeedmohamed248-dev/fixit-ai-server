import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F, Icon, noOutline, tap, Txt, useStartAlign } from '../components/ui';
import { api } from '../lib/api';
import { useApp } from '../lib/store';
import { C, R, S } from '../lib/theme';

type Msg = { role: 'user' | 'assistant'; content: string };

// ✍️ ردود الخبير بتيجي Markdown — نعرض العريض عريض ونشيل الرموز
function renderMd(text: string) {
  const clean = text.replace(/`/g, '').replace(/^#{1,6}\s*/gm, '').replace(/^\s*[-*]\s+/gm, '• ');
  return clean.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <Txt key={i} w="bold" color={C.text}>{part.slice(2, -2)}</Txt>
    ) : (
      part.replace(/\*/g, '')
    ),
  );
}

export default function Expert() {
  const { t, car, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const align = useStartAlign();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState(car ? `${car} ` : '');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<Msg>>(null);

  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    tap();
    const next: Msg[] = [...msgs, { role: 'user', content: v }];
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      const r = await api.diagnose(next);
      setMsgs((m) => [...m, { role: 'assistant', content: r.choices?.[0]?.message?.content || '…' }]);
    } catch (e: any) {
      setMsgs((m) => [...m, { role: 'assistant', content: '⚠️ ' + (e?.message === 'NETWORK' ? t('net_error') : e?.message) }]);
    } finally {
      setBusy(false);
    }
  };

  const data: Msg[] = [{ role: 'assistant', content: t('expert_hi') }, ...msgs];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={list}
        data={data}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: S.lg, gap: S.md }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) => {
          const me = item.role === 'user';
          return (
            <View style={{ alignItems: me ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.bubble, me ? styles.me : styles.bot]}>
                <Txt testID={me ? undefined : `bot-${index}`} color={me ? C.white : C.text} selectable>
                  {me ? item.content : renderMd(item.content)}
                </Txt>
              </View>
              {!me && index > 0 && !item.content.startsWith('⚠️') ? (
                <Pressable onPress={() => router.push('/search')} style={styles.findBtn}>
                  <Icon name="magnify" size={16} color={C.primary} />
                  <Txt w="bold" size={12} color={C.primary}>{t('expert_search')}</Txt>
                </Pressable>
              ) : null}
            </View>
          );
        }}
        ListFooterComponent={busy ? <Txt testID="expert-typing" color={C.muted} style={{ marginTop: S.sm }}>{t('expert_typing')}</Txt> : undefined}
      />
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + S.sm }]}>
        {msgs.length ? (
          <Pressable onPress={() => setMsgs([])} hitSlop={6} accessibilityLabel={t('expert_new')} style={{ padding: 6 }}>
            <Icon name="refresh" size={22} color={C.muted} />
          </Pressable>
        ) : null}
        <TextInput
          testID="expert-input"
          value={text}
          onChangeText={setText}
          placeholder={t('expert_ph')}
          placeholderTextColor={C.faint}
          multiline
          style={[styles.input, { textAlign: align }, noOutline]}
        />
        <Pressable testID="expert-send" onPress={send} disabled={busy || !text.trim()} style={[styles.send, (busy || !text.trim()) && { opacity: 0.4 }]} accessibilityLabel={t('send')}>
          <Icon name="send" size={20} color={C.white} flip={isRTL} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '86%', borderRadius: R.lg, paddingHorizontal: S.md, paddingVertical: S.sm + 2 },
  me: { backgroundColor: C.primary, borderBottomEndRadius: 4 },
  bot: { backgroundColor: C.card, borderBottomStartRadius: 4 },
  findBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 4 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: S.sm, backgroundColor: C.card, paddingHorizontal: S.md, paddingTop: S.sm, borderTopWidth: 1, borderTopColor: C.line },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: C.bg, borderRadius: 22, paddingHorizontal: S.lg, paddingTop: 11, paddingBottom: 11, fontFamily: F.regular, fontSize: 15, color: C.text },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
