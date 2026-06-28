// The luteal home card. Appears only during the predicted premenstrual window,
// above Begin. A solid rose card (textured like the onboarding cards) that opens
// the readiness page. Once she taps "Done for today" it flips to a calm lilac
// "you took care of today". A quiet "Period's here?" link is a fast off-switch:
// it sets today as her period start, which rolls the window forward so the card
// (and the warm palette) ease off until next cycle.

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { MoonCard } from '@/components/moon-card';
import { getReadiness, todayYmd } from '@/store/pms-readiness';
import { getPmsPrefs, setPmsPrefs } from '@/store/pms-prefs';

const ROSE = '#C8455C';
const LILAC = 'rgba(142, 122, 192, 0.5)';

export function LutealCard({ onPeriodStarted }: { onPeriodStarted?: () => void }) {
  const [doneToday, setDoneToday] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getReadiness()
        .then((r) => alive && setDoneToday(r.doneForToday))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, []),
  );

  const open = () => {
    Haptics.selectionAsync();
    router.push('/pms-readiness');
  };

  const periodHere = () => {
    Haptics.selectionAsync();
    Alert.alert('Has your period started?', "We'll ease off until your next window.", [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Yes, it has',
        onPress: async () => {
          try {
            const p = await getPmsPrefs();
            await setPmsPrefs({ ...p, lastPeriodStart: todayYmd() });
          } catch {
            // Storage can throw; never trap the user.
          }
          onPeriodStarted?.();
        },
      },
    ]);
  };

  if (doneToday) {
    return (
      <MoonCard color={LILAC} style={styles.card} textureOpacity={0.12}>
        <Text style={styles.doneTitle}>You took care of today</Text>
        <Text style={styles.doneSub}>Come back tomorrow.</Text>
      </MoonCard>
    );
  }

  return (
    <MoonCard color={ROSE} style={styles.card}>
      <Text style={styles.eyebrow}>YOUR LUTEAL WEEK</Text>
      <Text style={styles.title}>PMS will be here.</Text>
      <Text style={styles.title}>Let&apos;s get you ready.</Text>
      <Pressable
        onPress={open}
        style={styles.cta}
        accessibilityRole="button"
        accessibilityLabel="I'm in"
      >
        <Text style={styles.ctaText}>I&apos;m in</Text>
      </Pressable>
      <Pressable
        onPress={periodHere}
        hitSlop={10}
        style={styles.periodLink}
        accessibilityRole="button"
        accessibilityLabel="My period is here"
      >
        <Text style={styles.periodText}>Period&apos;s here?</Text>
      </Pressable>
    </MoonCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 22,
    paddingHorizontal: 22,
    marginBottom: 16,
  },
  eyebrow: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    color: 'rgba(255, 255, 255, 0.72)',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 29,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 24,
    backgroundColor: '#ffffff',
  },
  ctaText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: '#B83A52',
    letterSpacing: 0.2,
  },
  periodLink: {
    alignSelf: 'flex-start',
    marginTop: 14,
  },
  periodText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.2,
    textDecorationLine: 'underline',
  },
  doneTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 19,
    lineHeight: 25,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  doneSub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.2,
    marginTop: 5,
  },
});
