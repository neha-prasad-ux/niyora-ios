// The "know why" half-page sheet. Tapping a factor card on the readiness page
// slides this up (not a new screen) with the plain reason behind that factor
// and a link to the real research. Mirrors PeriodSheet's look so the two sheets
// on this screen feel like one family.

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/colors';
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 26,
    paddingBottom: 40,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 20,
    alignSelf: 'center',
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  body: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 24,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 14,
  },
  scienceLink: { alignSelf: 'flex-start', marginTop: 22 },
  scienceText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textTagline,
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
});
