// Write experience: a calm, on-device text field. What she types is ephemeral
// -- nothing is stored or sent, it clears when the screen closes. The release
// is the point.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from './ui';

type Props = { activity: Activity; onComplete: () => void };

export function WriteView({ activity, onComplete }: Props) {
  const [text, setText] = useState('');

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{activity.title}</Text>
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
      <View style={styles.actions}>
        <Pill label="Done" onPress={onComplete} />
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
    marginBottom: 20,
  },
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
