// The luteal home card, ported from v2-pms and adapted for the V3 home. A
// compact card with a cosmic gradient + a faint starfield and a floating tag.
// No buttons: the whole card opens the readiness checklist.
//
// Unlike production (in-window only), this shows ALL MONTH: out of the window it
// counts down to the next PMS window (a gentle heads-up); in the window it is
// the day's prep, turning calm green once she is done for the day.

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getReadiness, isReadyDone } from '@/store/pms-readiness';
import { getLastSession } from '@/store/session-history';
import { getPmsPrefs } from '@/store/pms-prefs';
import { daysUntilPmsWindow, isInPmsWindow } from '@/lib/pms-window';

const STARFIELD = require('../../assets/images/starfield.png');

// Cosmic gradients: warm rose in the window, calm green when done, cool violet
// for the out-of-window heads-up.
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
const SOON_GRADIENT: readonly [string, string, string, string] = [
  'rgba(78,72,150,0.52)',
  'rgba(96,84,158,0.52)',
  'rgba(110,96,166,0.5)',
  'rgba(70,88,150,0.5)',
];
const GRADIENT_LOCATIONS = [0, 0.42, 0.62, 1] as const;

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type CardState = {
  tag: string;
  tagStyle: object;
  gradient: readonly [string, string, string, string];
  title: string;
  sub: string;
};

export function LutealCard() {
  const [inWindow, setInWindow] = useState(false);
  const [daysUntil, setDaysUntil] = useState<number | null>(null);
  const [hasCycle, setHasCycle] = useState(false);
  const [doneToday, setDoneToday] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getPmsPrefs(), getReadiness(), getLastSession()])
        .then(([p, r, last]) => {
          if (!alive) return;
          const now = new Date();
          setInWindow(p.pmsMode && isInPmsWindow(p.lastPeriodStart, p.cycleLength, now));
          setHasCycle(p.pmsMode && !!p.lastPeriodStart);
          setDaysUntil(
            p.pmsMode ? daysUntilPmsWindow(p.lastPeriodStart, p.cycleLength, now) : null,
          );
          const calmDone = !!last && last.completedAt.slice(0, 10) === toYmd(now);
          setDoneToday(isReadyDone(r.checks, calmDone, r.doneForToday));
        })
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

  const s = resolveState(inWindow, doneToday, daysUntil, hasCycle);

  return (
    <View style={styles.wrap}>
      <View style={[styles.tag, s.tagStyle]}>
        <Text style={styles.tagText}>{s.tag}</Text>
      </View>

      <Pressable
        style={styles.card}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${s.title}. ${s.sub}. Open.`}
      >
        <LinearGradient
          colors={s.gradient}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image source={STARFIELD} style={styles.stars} resizeMode="cover" accessible={false} />

        <View style={styles.body}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.sub}>{s.sub}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function resolveState(
  inWindow: boolean,
  doneToday: boolean,
  daysUntil: number | null,
  hasCycle: boolean,
): CardState {
  if (inWindow) {
    return doneToday
      ? { tag: 'Well done', tagStyle: styles.tagDone, gradient: DONE_GRADIENT, title: 'PMS day prep', sub: 'You took care of today' }
      : { tag: 'Your window', tagStyle: styles.tagActive, gradient: ACTIVE_GRADIENT, title: 'PMS day prep', sub: "Let's get you ready" };
  }
  // Out of window: a gentle heads-up toward the next one.
  const sub =
    daysUntil != null && daysUntil > 0
      ? `About ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'} away. Tap to prep early.`
      : hasCycle
        ? 'Coming up soon. Tap to prep early.'
        : 'A little prep for your rough week.';
  return {
    tag: 'Coming up',
    tagStyle: styles.tagSoon,
    gradient: SOON_GRADIENT,
    title: hasCycle ? 'Your next PMS window' : 'PMS day prep',
    sub,
  };
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
  },
  tagActive: { backgroundColor: 'rgba(190, 95, 135, 0.95)' },
  tagDone: { backgroundColor: 'rgba(95, 185, 142, 0.95)' },
  tagSoon: { backgroundColor: 'rgba(120, 108, 190, 0.95)' },
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
  body: { padding: 16 },
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
});
