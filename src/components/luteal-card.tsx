// The luteal home card. Shows only in the predicted premenstrual window, above
// Begin, as the quiet secondary thing (Begin stays the primary). A compact card
// with a cosmic gradient (warm rose core) + a faint starfield and a floating
// tag. No buttons: the whole card opens the readiness page (where "Got my
// period" lives). Turns calm green once she's done for the day, or has done all
// six.

import { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { getReadiness, isReadyDone } from '@/store/pms-readiness';
import { getLastSession } from '@/store/session-history';

const STARFIELD = require('../../assets/images/starfield.png');

// Distributed cosmic gradient, warm rose core (active) and calm green (done).
// Four soft stops, eased across the whole card so the blend is smooth.
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

export function LutealCard() {
  const [doneToday, setDoneToday] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.all([getReadiness(), getLastSession()])
        .then(([r, last]) => {
          if (!alive) return;
          const calmDone = !!last && last.completedAt.slice(0, 10) === toYmd(new Date());
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
        </View>
      </Pressable>
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
});
