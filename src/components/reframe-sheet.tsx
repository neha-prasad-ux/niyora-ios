// "Why this happens" half-page sheet. Tapping the reframe card in the result
// deck slides this up (not a new screen) with the plain reason behind the
// feeling she came in with, and an optional link to the real research. Mirrors
// WhySheet's look so the reframe and the readiness "know why" feel like one
// family. Height flexes to the passage -- a short reframe gets a short sheet.

import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/theme/colors';
import type { UnderstandCard } from '@/models/understand';

// The first URL in a card's citation line, for the optional "the science" tap.
function firstUrl(source?: string): string | null {
  if (!source) return null;
  const match = source.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

export function ReframeSheet({
  card,
  onClose,
}: {
  card: UnderstandCard | null;
  onClose: () => void;
}) {
  const scienceUrl = firstUrl(card?.source);

  const openScience = () => {
    if (!scienceUrl) return;
    Haptics.selectionAsync().catch(() => {});
    Linking.openURL(scienceUrl).catch(() => {});
  };

  return (
    <Modal
      visible={!!card}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['#2b2142', '#181226', '#0e0b14']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {card ? (
              <>
                <Text style={styles.title}>{card.title}</Text>
                <Text style={styles.body}>{card.body}</Text>
                {scienceUrl ? (
                  <Pressable
                    onPress={openScience}
                    hitSlop={8}
                    style={styles.scienceLink}
                    accessibilityRole="link"
                    accessibilityLabel="The science"
                  >
                    <Text style={styles.scienceText}>The science</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </ScrollView>
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
  // Flexes to content, capped so a long reframe still leaves the backdrop
  // tappable at the top. A short passage makes a short sheet.
  sheet: {
    maxHeight: '82%',
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: 'continuous',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  scroll: { flexGrow: 0 },
  scrollContent: { paddingTop: 26, paddingHorizontal: 26, paddingBottom: 40 },
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
