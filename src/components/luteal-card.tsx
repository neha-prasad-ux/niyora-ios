// The luteal home card. Shows only in the predicted premenstrual window, above
// Begin, and is the secondary action (Begin stays the loud primary). A compact
// card with a cosmic gradient (warm rose core) + a faint starfield, a floating
// tag, and two quiet buttons. Tapping the card (or "Let's go") opens the
// readiness page; "Got my period" opens the calendar to roll the window forward.
// Once she is done for today it turns calm green.

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PeriodSheet } from '@/components/period-sheet';
import { getReadiness } from '@/store/pms-readiness';
import { getPmsPrefs, setPmsPrefs } from '@/store/pms-prefs';

const STARFIELD = require('../../assets/images/starfield.png');

// Distributed cosmic gradient, warm rose core (active) and calm green (done).
// Four soft stops, eased across the whole card so the cosmic blend is smooth,
// not banded. Warm rose sits in the middle.
const ACTIVE_GRADIENT: readonly [string, string, string, string] = [
  'rgba(100,60,138,0.6)',
  'rgba(150,74,128,0.62)',
  'rgba(176,82,120,0.62)',
  'rgba(78,88,150,0.56)',
];
const DONE_GRADIENT: readonly [string, string, string, string] = [
  'rgba(64,134,108,0.5)',
  'rgba(86,162,126,0.5)',
  'rgba(92,170,132,0.5)',
  'rgba(58,112,120,0.5)',
];
const GRADIENT_LOCATIONS = [0, 0.42, 0.62, 1] as const;

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function LutealCard({ onPeriodStarted }: { onPeriodStarted?: () => void }) {
  const [doneToday, setDoneToday] = useState(false);
  const [sheet, setSheet] = useState(false);

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

  const confirmPeriod = async (date: Date) => {
    setSheet(false);
    try {
      const p = await getPmsPrefs();
      await setPmsPrefs({ ...p, lastPeriodStart: toYmd(date) });
    } catch {
      // Storage can throw; never trap the user.
    }
    onPeriodStarted?.();
  };

  const gradient = doneToday ? DONE_GRADIENT : ACTIVE_GRADIENT;

  return (
    <View style={styles.wrap}>
      <View style={[styles.tag, doneToday ? styles.tagDone : styles.tagActive]}>
        <Text style={styles.tagText}>{doneToday ? 'Well done' : 'Hello!'}</Text>
      </View>

      <Pressable
        style={styles.card}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="PMS day prep. Open."
      >
        <LinearGradient
          colors={gradient}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={STARFIELD} style={styles.stars} resizeMode="cover" accessible={false} />

        <View style={styles.body}>
          <Text style={styles.title}>PMS day prep</Text>
          <Text style={styles.sub}>{doneToday ? 'You took care of today' : "Let's get you ready"}</Text>
          {!doneToday && (
            <View style={styles.btnRow}>
              <Pressable
                onPress={open}
                style={styles.primaryPill}
                accessibilityRole="button"
                accessibilityLabel="Let's go"
              >
                <Text style={styles.primaryPillText}>Let&apos;s go</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setSheet(true);
                }}
                hitSlop={8}
                style={styles.tertiary}
                accessibilityRole="button"
                accessibilityLabel="My period is here"
              >
                <Text style={styles.tertiaryText}>Got my period</Text>
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>

      <PeriodSheet visible={sheet} onClose={() => setSheet(false)} onConfirm={confirmPeriod} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
  },
  tagActive: {
    backgroundColor: 'rgba(190, 95, 135, 0.95)',
  },
  tagDone: {
    backgroundColor: 'rgba(95, 185, 142, 0.95)',
  },
  tagText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  card: {
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  stars: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  body: {
    padding: 16,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.2,
    marginTop: 3,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 14,
  },
  primaryPill: {
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#ffffff',
  },
  primaryPillText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: '#9E4666',
    letterSpacing: 0.2,
  },
  tertiary: {
    paddingVertical: 4,
  },
  tertiaryText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.2,
  },
});
