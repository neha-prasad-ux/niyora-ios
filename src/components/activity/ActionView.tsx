// Action experience (the bridge-back): the de-escalation tips, then an editable
// message she can tweak, copy to the clipboard, or send straight into Messages
// (she picks who). Nothing leaves the phone unless she sends it.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from './ui';

type Props = { activity: Activity; onComplete: () => void };

export function ActionView({ activity, onComplete }: Props) {
  const [text, setText] = useState(activity.template ?? '');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onSend = async () => {
    const url = `sms:&body=${encodeURIComponent(text)}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) await Linking.openURL(url).catch(() => {});
    onComplete();
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{activity.title}</Text>
        {activity.body ? <Text style={styles.tips}>{activity.body}</Text> : null}
        <Text style={styles.label}>your message</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          selectionColor="rgba(196, 178, 255, 0.9)"
        />
      </ScrollView>

      <View style={styles.actions}>
        <Pill label={copied ? 'Copied' : 'Copy'} variant="ghost" onPress={onCopy} />
        <Pill label="Send" onPress={onSend} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 8 },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 18,
  },
  tips: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 24,
    color: 'rgba(255,255,255,0.74)',
    textAlign: 'left',
    marginBottom: 24,
  },
  label: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },
  input: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 25,
    color: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    minHeight: 130,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
  },
});
