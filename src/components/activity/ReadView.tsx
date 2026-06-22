// Read experience: a quiet reading layout. The passage holds on screen in a
// soft serif, scrolls if it runs long, and a gentle Done closes it.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import type { Activity } from '@/models/activities';
import { Pill } from './ui';

type Props = { activity: Activity; onComplete: () => void };

export function ReadView({ activity, onComplete }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{activity.title}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.body}>{activity.body}</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Pill label="Done" onPress={onComplete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  title: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 18,
  },
  scroll: { flex: 1 },
  scrollContent: { justifyContent: 'center', flexGrow: 1, paddingVertical: 12 },
  body: {
    fontFamily: 'Georgia',
    fontSize: 20,
    lineHeight: 32,
    color: 'rgba(255,255,255,0.90)',
    textAlign: 'left',
  },
  actions: { alignItems: 'center', paddingVertical: 16 },
});
