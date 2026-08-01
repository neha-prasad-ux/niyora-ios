// The colouring activity as its own screen — level one of the hold, an in-app
// calm task for when moving out is too much to ask. A white page, like real
// paper. She colours a diagram and writes a message on it to send to someone;
// real illustrations feed in as SVGs. No countdown here (Neha, 2026-07-29): a
// ticking clock over a make-something-nice task reads as pressure, not calm.

import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';

import { ColorFill, type ColorFillHandle } from '@/components/moment/color-fill';
import { DRAWINGS } from '@/components/moment/art';
import { markActivityDone } from '@/lib/hold-activities';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

const INK = colors.paper.ink;

export default function PaintScreen() {
  const card = useRef<ColorFillHandle>(null);
  // Which outline she is colouring. Switching remounts ColorFill (via key), so a
  // fresh drawing starts clean with its own caption.
  const [drawingIdx, setDrawingIdx] = useState(0);
  const choice = DRAWINGS[drawingIdx];
  const leave = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };
  // M15: Share is its own button now (an icon), opening the iOS share sheet and
  // staying on the card. Done just finishes and leaves.
  const onShare = async () => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await card.current?.share();
    } catch {
      // Snapshot/share can fail or be cancelled; staying on the card is correct.
    }
  };
  const onDone = () => {
    Haptics.selectionAsync().catch(() => {});
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
            <View style={styles.actions}>
              <Pressable onPress={onShare} hitSlop={12} style={styles.shareBtn} accessibilityRole="button" accessibilityLabel="Share">
                <SymbolView name="square.and.arrow.up" tintColor={INK} size={17} weight="semibold" />
              </Pressable>
              <Pressable onPress={onDone} hitSlop={12} style={styles.done} accessibilityRole="button" accessibilityLabel="Done">
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </View>
          {/* Pick which outline to colour. Switching remounts the card, so it
              starts fresh — the drawings Neha asked for beyond the penguin. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pickerScroll}
            contentContainerStyle={styles.picker}
          >
            {DRAWINGS.map((d, i) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDrawingIdx(i);
                }}
                style={[styles.pick, i === drawingIdx && styles.pickOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: i === drawingIdx }}
              >
                <Text style={[styles.pickText, i === drawingIdx && styles.pickTextOn]}>{d.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.center}>
            <ColorFill key={choice.id} ref={card} drawing={choice.art} />
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
  // M15: Share icon + Done sit together on the right.
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shareBtn: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  done: { paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  doneText: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.bodyLg,
    color: '#7C5CBF',
  },
  // Top-aligned so the drawing starts right under the title, not floating in the
  // middle of the screen.
  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: spacing.sm },
  // The drawing picker: a compact scrollable row of small chips under the header.
  // flexGrow:0 keeps the row content-height; alignItems:center stops the chips
  // stretching to fill the scroll view (which made them tall columns).
  pickerScroll: { flexGrow: 0 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  pick: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.paper.control,
  },
  pickOn: { backgroundColor: '#7C5CBF' },
  pickText: { fontFamily: fonts.semibold, fontSize: fontScale.body, color: INK },
  pickTextOn: { color: '#FFFFFF' },
});
