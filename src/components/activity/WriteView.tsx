// Write experience: a calm, on-device text field. What she types is ephemeral
// -- nothing is stored or sent. She writes anything, hits "Disappear", and it
// dissolves away, like it never happened.

import { useState } from 'react';
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
import { scanForCrisis, CRISIS_COPY } from '@/lib/crisis-scan';
import type { Activity } from '@/models/activities';
import { Pill } from '@/components/Pill';

type Props = { activity: Activity; onComplete: () => void };

export function WriteView({ activity, onComplete }: Props) {
  const [text, setText] = useState('');
  const [crisis, setCrisis] = useState(false);
  const fade = useSharedValue(1);
  const insets = useSafeAreaInsets();

  const onDisappear = () => {
    // Drop the keyboard so it slides away with the words, instead of sitting
    // there after everything has dissolved.
    Keyboard.dismiss();

    // CRISIS SCAN. This field is the one place in the app where she writes
    // whatever she wants, unprompted, knowing it disappears — which is exactly
    // where someone puts the thing they would never tap a button about. Wysa's
    // data: 82% of crisis instances were surfaced by DETECTION, only 18% by the
    // user saying so.
    //
    // The scan is a list operation over static phrases (crisis-scan.ts), never
    // a model call, and the copy it shows is human-written and never generated.
    // The text still never leaves the device and is still never stored; we read
    // it in memory and drop it.
    //
    // Deliberately does NOT dissolve first: the words stay on screen under the
    // message, because making them vanish at the moment she is shown a helpline
    // reads as the app recoiling from what she said.
    if (scanForCrisis(text)) {
      setCrisis(true);
      return;
    }
    fade.value = withTiming(0, { duration: 850, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(onComplete)();
    });
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
        <View style={styles.crisis}>
          <Text style={styles.crisisTitle}>{CRISIS_COPY.title}</Text>
          <Text style={styles.crisisBody}>{CRISIS_COPY.body}</Text>
          {CRISIS_COPY.lines.map((l) => (
            <View key={l.label} style={styles.crisisRow}>
              <Text style={styles.crisisLine}>{l.label}</Text>
              <Text style={styles.crisisDetail}>{l.detail}</Text>
            </View>
          ))}
          <Text style={styles.crisisDetail}>{CRISIS_COPY.emergency}</Text>
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
  crisis: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  crisisTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  crisisBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginBottom: 10,
  },
  crisisRow: { marginBottom: 8 },
  crisisLine: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  crisisDetail: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSubtitle,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  inputWrap: { flex: 1 },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    lineHeight: 28,
    color: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 4,
  },
  actions: { alignItems: 'center', paddingVertical: 16 },
});
