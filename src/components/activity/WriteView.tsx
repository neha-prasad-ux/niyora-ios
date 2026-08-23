// Write experience: a calm, on-device text field. What she types is ephemeral
// -- nothing is stored or sent. She writes anything, hits "Disappear", and it
// dissolves away, like it never happened.

import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';
import { scanForCrisis, CRISIS_COPY } from '@/lib/crisis-scan';
import { runAiCrisisGuard } from '@/lib/crisis-guard';
import { CrisisSheet } from '@/components/CrisisSheet';
import type { CrisisType } from '@/lib/moment-gemini';
import type { Activity } from '@/models/activities';
import { Pill } from '@/components/Pill';

type Props = { activity: Activity; onComplete: () => void };

export function WriteView({ activity, onComplete }: Props) {
  const [text, setText] = useState('');
  const [crisis, setCrisis] = useState(false);
  const fade = useSharedValue(1);
  const insets = useSafeAreaInsets();
  // Which resources the sheet shows: null (default) is the suicide screen; the
  // AI/abuse guard sets a DV type for a violence disclosure.
  const crisisType = useRef<CrisisType | null>(null);
  // The AI recall resolves a beat after "Disappear"; guard a setState landing
  // after the field has dissolved and unmounted, and let it cancel the dissolve.
  const mounted = useRef(true);
  const handedOff = useRef(false);
  useEffect(() => () => { mounted.current = false; }, []);

  const onDisappear = () => {
    // Drop the keyboard so it slides away with the words, instead of sitting
    // there after everything has dissolved.
    Keyboard.dismiss();

    // CRISIS SCAN. This field is the one place in the app where she writes
    // whatever she wants, unprompted, knowing it disappears, which is exactly
    // where someone puts the thing they would never tap a button about. Wysa's
    // data: 82% of crisis instances were surfaced by DETECTION, only 18% by the
    // user saying so.
    //
    // The text still never leaves the device and is still never stored; we read
    // it in memory and drop it.
    //
    // Deliberately does NOT dissolve first when a hand-off fires: the words stay
    // on screen under the message, because making them vanish at the moment she
    // is shown a helpline reads as the app recoiling from what she said.
    const handOff = (type: CrisisType | null) => {
      if (!mounted.current) return;
      handedOff.current = true;
      crisisType.current = type;
      fade.value = 1; // cancel any in-flight dissolve; the words sit under the sheet
      setCrisis(true);
    };

    // 1. Keyword floor: deterministic, synchronous, the guaranteed offline net.
    if (scanForCrisis(text)) {
      handOff(null);
      return;
    }

    // 2. The shared AI-recall guard (audit H-3). Fired BEFORE the fade so a
    //    subtler self-harm read the keyword list missed can still cancel the
    //    dissolve and show the resources (escalate-only). NO onAbuse here
    //    (Neha 2026-08-12): a plain physical-abuse mention must NOT pop the DV
    //    sheet on this ephemeral field, that is loud on a shared/monitored phone,
    //    against the disclosure-minimising design. Genuine ACUTE violence still
    //    escalates via the AI crisis net (onEscalate). If it resolves after the
    //    words dissolved and the field unmounted, `mounted` makes it a safe no-op.
    runAiCrisisGuard(text, {
      onEscalate: (type) => handOff(type),
    });

    // 3. The dissolve runs concurrently with the AI recall. It only dismisses if
    //    nothing handed off in the meantime (and we are still mounted).
    fade.value = withTiming(0, { duration: 850, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(dismissIfClear)();
    });
  };

  // ponytail: on this ephemeral field the model call usually loses the race
  // against the 850ms fade, so the AI net here is best-effort; the strengthened
  // keyword floor (crisis-scan.ts) is the real guarantee. Upgrade path: hold the
  // dismiss behind the guard with a short cap if the AI net needs to be reliable.
  const dismissIfClear = () => {
    if (!handedOff.current && mounted.current) onComplete();
  };
  // Magic dissolve: the words lift, swell a touch, and fade into the air.
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform: [
      { translateY: (1 - fade.value) * -30 },
      { scale: 1 + (1 - fade.value) * 0.06 },
    ],
  }));

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 28}
    >
      <Text style={styles.title}>{activity.title}</Text>
      <Text style={styles.subtitle}>
        Write anything. Hit disappear and it&apos;s gone, like it never happened.
      </Text>
      <Animated.View style={[styles.inputWrap, fadeStyle]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={activity.placeholder}
          placeholderTextColor="rgba(255,255,255,0.30)"
          multiline
          autoFocus
          textAlignVertical="top"
          selectionColor="rgba(196, 178, 255, 0.9)"
        />
      </Animated.View>
      {crisis ? (
        // Shared, type-aware sheet: keyword floor + AI suicide read → 988 screen;
        // an acute violence / abuse disclosure → the DV/safety resources.
        <View style={styles.crisis}>
          <CrisisSheet crisisType={crisisType.current} />
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pill label={crisis ? CRISIS_COPY.back : 'Disappear'} onPress={crisis ? () => setCrisis(false) : onDisappear} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  // Container for the shared CrisisSheet (its inner rows carry their own styles).
  crisis: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.fill.faint,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  inputWrap: { flex: 1 },
  input: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    lineHeight: 28,
    color: colors.textOnDark.primary,
    paddingHorizontal: spacing.xs,
  },
  actions: { alignItems: 'center', paddingVertical: spacing.lg },
});
