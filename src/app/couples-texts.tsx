// "Texts you can share": ready-to-send messages in different tones, grouped by
// moment. Tap a card to open the iOS share sheet and send it straight away
// (Messages, WhatsApp, wherever). Done leads into the shared "Go fall in love
// again" finale. These are casual messages the user sends her partner, so they
// keep emoji and a light register (unlike the app's own voice).

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CouplesFinale } from '@/components/couples-finale';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { COUPLES_TEXTS } from '@/models/couples-content';
import { recordLight } from '@/store/light-ledger';

// Ledger ref: reaching out to your partner is applying a skill in real life
// (moon-reward-spec: apply). Also lets the PMS checklist read "done today".
const COUPLES_MESSAGE_REF = 'couples-message';

const HEART = colors.accentRose; // rose, used only as the group-label accent

export default function CouplesTextsScreen() {
  const [stage, setStage] = useState<'list' | 'finale'>('list');

  const share = (text: string) => {
    Haptics.selectionAsync().catch(() => {});
    Share.share({ message: text })
      .then((res) => {
        // Only when a message actually goes out, not a dismissed sheet.
        if (res.action === Share.sharedAction) {
          recordLight('apply', { refId: COUPLES_MESSAGE_REF }).catch(() => {});
        }
      })
      .catch(() => {});
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        {stage === 'list' && (
          <View style={styles.topBar}>
            <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
              <Text style={styles.back}>‹</Text>
            </Pressable>
          </View>
        )}

        {stage === 'finale' ? (
          <CouplesFinale line="Go fall in love again" onDone={goBack} />
        ) : (
          <>
            <View style={styles.head}>
              <Text style={styles.title}>Texts you can share</Text>
              <Text style={styles.subhead}>Tap one to send it right away.</Text>
            </View>

            <ScrollView style={styles.list} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {COUPLES_TEXTS.map((group) => (
                <View key={group.id} style={styles.group}>
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  {group.items.map((it) => (
                    <Pressable
                      key={it.id}
                      onPress={() => share(it.text)}
                      style={styles.card}
                      accessibilityRole="button"
                      accessibilityLabel={`${it.tone}. ${it.text}. Tap to send.`}
                    >
                      <View style={styles.cardHead}>
                        <Text style={styles.tone}>{it.tone}</Text>
                        <SymbolView name="square.and.arrow.up" tintColor={colors.textOnDark.tertiary} size={15} weight="semibold" />
                      </View>
                      <Text style={styles.cardText}>{it.text}</Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </ScrollView>

            <BeginButton fullWidth label="Done" onPress={() => { Haptics.selectionAsync().catch(() => {}); setStage('finale'); }} />
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: pageGutter },
  back: { fontFamily: fonts.light, fontSize: fontScale.pageTitle, lineHeight: 34, color: colors.textSubtitle },
  topBar: { minHeight: 34, justifyContent: 'center', marginTop: spacing.xs },
  head: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.lg },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.technique,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subhead: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  list: { flex: 1 },
  scroll: { paddingBottom: spacing.xl },
  group: { marginBottom: spacing.xl },
  groupTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: HEART,
    marginBottom: spacing.sm,
  },
  card: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
    marginBottom: spacing.sm,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  tone: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textSubtitle,
    letterSpacing: 0.4,
  },
  cardText: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
});
