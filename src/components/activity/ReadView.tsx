// Read experience: a quiet reading layout. The passage holds on screen in a
// soft serif, scrolls if it runs long, and a gentle Done closes it.

import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import type { Activity } from '@/models/activities';
import { Pill } from '@/components/Pill';

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
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  scroll: { flex: 1 },
  scrollContent: { justifyContent: 'center', flexGrow: 1, paddingVertical: spacing.md },
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    lineHeight: 30,
    color: colors.textOnDark.primary,
    textAlign: 'left',
  },
  actions: { alignItems: 'center', paddingVertical: spacing.lg },
});
