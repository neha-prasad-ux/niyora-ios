// Write experience: a calm, on-device text field. What she types is ephemeral
// -- nothing is stored or sent. She writes anything, hits "Disappear", and it
// dissolves away, like it never happened.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from './ui';

type Props = { activity: Activity; onComplete: () => void };

export function WriteView({ activity, onComplete }: Props) {
  const [text, setText] = useState('');
  const fade = useSharedValue(1);

  const onDisappear = () => {
    fade.value = withTiming(0, { duration: 700, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(onComplete)();
    });
  };
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
      <View style={styles.actions}>
        <Pill label="Disappear" onPress={onDisappear} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
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
