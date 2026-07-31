// The colouring activity as its own screen — level one of the hold, an in-app
// calm task for when moving out is too much to ask. A white page, like real
// paper. She colours a diagram and writes a message on it to send to someone;
// real illustrations feed in as SVGs. No countdown here (Neha, 2026-07-29): a
// ticking clock over a make-something-nice task reads as pressure, not calm.

import { useRef } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { ColorFill, type ColorFillHandle } from '@/components/moment/color-fill';
import { markActivityDone } from '@/lib/hold-activities';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const INK = colors.paper.ink;

export default function PaintScreen() {
  const card = useRef<ColorFillHandle>(null);
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  // Done finishes the card: open the iOS share sheet (she shares or closes it),
  // then leave. X above leaves without sharing.
  const onDone = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await card.current?.share();
    } catch {
      // Snapshot/share can fail (e.g. she cancels): leaving anyway is correct.
    }
    markActivityDone('colour');
    leave();
  };
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView style={styles.safe} behavior="padding">
          {/* X to leave, the screen's name, and Done — both up here and light, so
              the drawing is the only heavy thing on the page (Neha, 2026-07-29). */}
          <View style={styles.header}>
            <Pressable onPress={leave} hitSlop={12} style={styles.close} accessibilityRole="button" accessibilityLabel="Close">
              <SymbolView name="xmark" tintColor={INK} size={15} weight="semibold" />
            </Pressable>
            <Text style={styles.title}>Colour &amp; Share</Text>
            <Pressable onPress={onDone} hitSlop={12} style={styles.done} accessibilityRole="button" accessibilityLabel="Done and share">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.center}>
            <ColorFill ref={card} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper.bg },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper.control,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    color: INK,
  },
  done: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  doneText: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.bodyLg,
    color: '#7C5CBF',
  },
  // Top-aligned so the drawing starts right under the title, not floating in the
  // middle of the screen.
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.sm },
});
