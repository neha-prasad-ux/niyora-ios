// The "know why" half-page sheet. Tapping a factor card on the readiness page
// slides this up (not a new screen) with the plain reason behind that factor and
// a link to the real research. Ported from v2-pms.

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';
import { READINESS_WHY, type ReadinessCheckId } from '@/store/pms-readiness';

export function WhySheet({
  factor,
  onClose,
}: {
  factor: ReadinessCheckId | null;
  onClose: () => void;
}) {
  const w = factor ? READINESS_WHY[factor] : null;

  const openScience = () => {
    if (!w) return;
    Haptics.selectionAsync();
    Linking.openURL(w.sourceUrl).catch(() => {});
  };

  return (
    <Modal visible={!!w} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['#2b2142', '#181226', '#0e0b14']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.handle} />
          {w ? (
            <>
              <Text style={styles.title}>{w.name}</Text>
              <Text style={styles.body}>{w.why}</Text>
              <Pressable
                onPress={openScience}
                hitSlop={8}
                style={styles.scienceLink}
                accessibilityRole="link"
                accessibilityLabel={`The science: ${w.sourceLabel}`}
              >
                <Text style={styles.scienceText}>The science</Text>
              </Pressable>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: spacing.xl,
    alignSelf: 'center',
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 24,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: spacing.md,
  },
  scienceLink: { alignSelf: 'flex-start', marginTop: spacing.xl },
  scienceText: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
});
