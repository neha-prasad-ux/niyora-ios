// "Texts you can share": ready-to-send messages in different tones, so the user
// picks what sounds like them (a mismatched tone reads as insincere). Grouped by
// moment: a heads-up, in the moment, after a rough patch, and about desire.
//
// These are casual messages the user sends their partner, so they keep emoji and
// a light register (unlike the app's own voice). Tap a card to copy it.

import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { COUPLES_TEXTS } from '@/models/couples-content';

const HEART = 'hsl(345, 78%, 70%)'; // rose, matching the hub's texts heart

export default function CouplesTextsScreen() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, text: string) => {
    Haptics.selectionAsync().catch(() => {});
    await Clipboard.setStringAsync(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1600);
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.head}>
          <SymbolView name="heart.fill" tintColor={HEART} size={24} weight="semibold" />
          <Text style={styles.title}>Texts you can share</Text>
          <Text style={styles.subhead}>Tap one to copy, then send it in your own app.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {COUPLES_TEXTS.map((group) => (
            <View key={group.id} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              {group.items.map((it) => {
                const copied = copiedId === it.id;
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => copy(it.id, it.text)}
                    style={styles.card}
                    accessibilityRole="button"
                    accessibilityLabel={`${it.tone}. ${it.text}. Tap to copy.`}
                  >
                    <View style={styles.cardHead}>
                      <View style={styles.tone}>
                        <Text style={styles.toneText}>{it.tone}</Text>
                      </View>
                      <SymbolView
                        name={copied ? 'checkmark' : 'doc.on.doc'}
                        tintColor={copied ? HEART : 'rgba(255, 255, 255, 0.5)'}
                        size={14}
                        weight="semibold"
                      />
                    </View>
                    <Text style={styles.cardText}>{it.text}</Text>
                    {copied ? <Text style={styles.copied}>Copied</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 18, gap: 10 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  scroll: { paddingBottom: 28 },
  group: { marginBottom: 22 },
  groupTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textSubtitle,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  tone: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  toneText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11.5,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  cardText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  copied: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    color: HEART,
    letterSpacing: 0.3,
    marginTop: 8,
  },
});
