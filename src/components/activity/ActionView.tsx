// Action experience (the bridge-back): the de-escalation tips, then an editable
// message she can tweak, copy to the clipboard, or send straight into Messages
// (she picks who). Nothing leaves the phone unless she sends it.

import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from '@/components/Pill';

type Props = { activity: Activity; onComplete: () => void };

export function ActionView({ activity, onComplete }: Props) {
  const [text, setText] = useState(activity.template ?? '');
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();

  const onCopy = async () => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onSend = async () => {
    // Open the iOS share sheet so she picks the channel (Messages, WhatsApp,
    // AirDrop, Copy, ...). Only close once she's actually shared.
    try {
      const res = await Share.share({ message: text });
      if (res.action === Share.sharedAction) onComplete();
    } catch {
      // dismissed or unavailable -- stay on the screen
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={insets.top + 28}
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
    lineHeight: 27,
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
