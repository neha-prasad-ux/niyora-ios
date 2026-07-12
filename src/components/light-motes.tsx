// Earned light, seen landing: when the ledger records an act (light-bus), a
// small mote drifts from the content area down into the Now tab's moon, which
// pulses as it absorbs (tab-moon.tsx listens for `moteArrived`). Light is
// mostly earned inside full-screen flows that cover the tab bar, so motes
// queue while the tabs are hidden and play on return — the moment she can
// actually see the moon receive them. Purely decorative: pointer-transparent,
// capped, skipped entirely under reduce-motion (the moon still pulses its
// state change, and nothing downstream waits on a mote).

import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { lightEarned, moteArrived } from '@/lib/light-bus';
import type { LightEvent } from '@/lib/moon-light';
import {
  BAR_CONTENT_HEIGHT,
  BAR_MIN_BOTTOM_PAD,
  MOON_CENTER_FROM_BAR_TOP,
} from '@/components/night-tab-bar';

const QUEUE_MAX = 3; // a burst plays as at most this many motes on return
const QUEUE_FRESH_MS = 60_000; // stale earns stop announcing themselves
const ACTIVE_MAX = 4;
const FLIGHT_MS = 950;

type QueuedEarn = { event: LightEvent; at: number };
type ActiveMote = { id: number; event: LightEvent; jx: number; jy: number };

export function LightMotes() {
  const reduceMotion = useReducedMotion();
  const [motes, setMotes] = useState<ActiveMote[]>([]);
  const nextId = useRef(1);
  const queue = useRef<QueuedEarn[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const focusedNow = useRef(false);

  const spawn = useCallback((event: LightEvent) => {
    setMotes((current) => [
      ...current.slice(-(ACTIVE_MAX - 1)),
      {
        id: nextId.current++,
        event,
        // A little scatter so back-to-back motes read as separate sparks.
        jx: (Math.random() - 0.5) * 72,
        jy: (Math.random() - 0.5) * 44,
      },
    ]);
  }, []);

  // Live earns fly immediately when the tabs are on screen; otherwise they
  // wait for the return. This component sits in the (tabs) layout, so focus
  // here means "no full-screen flow is covering the tab bar".
  useEffect(
    () =>
      lightEarned.subscribe((event) => {
        if (reduceMotion) return;
        if (focusedNow.current) {
          spawn(event);
        } else {
          queue.current = [...queue.current, { event, at: Date.now() }].slice(-QUEUE_MAX);
        }
      }),
    [spawn, reduceMotion],
  );

  useFocusEffect(
    useCallback(() => {
      focusedNow.current = true;
      const now = Date.now();
      const pending = reduceMotion ? [] : queue.current.filter((q) => now - q.at < QUEUE_FRESH_MS);
      queue.current = [];
      timers.current = pending.map((q, i) =>
        setTimeout(() => spawn(q.event), 400 + i * 260),
      );
      return () => {
        focusedNow.current = false;
        // Unplayed motes go back in line rather than flying behind a screen.
        for (const t of timers.current) clearTimeout(t);
        timers.current = [];
      };
    }, [spawn, reduceMotion]),
  );

  const onDone = useCallback((id: number) => {
    setMotes((current) => current.filter((m) => m.id !== id));
  }, []);

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {motes.map((mote) => (
        <Mote key={mote.id} mote={mote} onDone={onDone} />
      ))}
    </View>
  );
}

function Mote({ mote, onDone }: { mote: ActiveMote; onDone: (id: number) => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Deeper acts are bigger sparks (visit ~9px, apply ~13px).
  const size = 8 + Math.min(5, mote.event.amount * 0.12);

  // Flight path: from mid-screen (where the cards live) into the Now tab's
  // moon, lobbed slightly upward first so it reads as a spark, not a drop.
  const sx = width / 2 + mote.jx;
  const sy = height * 0.42 + mote.jy;
  const barTop = height - (BAR_CONTENT_HEIGHT + Math.max(insets.bottom, BAR_MIN_BOTTOM_PAD));
  const ex = width / 6; // center of the first of three equal tabs
  const ey = barTop + MOON_CENTER_FROM_BAR_TOP;
  const cx = sx + (ex - sx) * 0.25;
  const cy = sy - 64;

  const progress = useSharedValue(0);
  const finish = useCallback(() => {
    moteArrived.emit(mote.event);
    onDone(mote.id);
  }, [mote, onDone]);

  useEffect(() => {
    progress.value = withTiming(
      1,
      { duration: FLIGHT_MS, easing: Easing.in(Easing.sin) },
      (finished) => {
        if (finished) runOnJS(finish)();
      },
    );
  }, [progress, finish]);

  const style = useAnimatedStyle(() => {
    const t = progress.value;
    const inv = 1 - t;
    return {
      transform: [
        { translateX: inv * inv * sx + 2 * inv * t * cx + t * t * ex - size },
        { translateY: inv * inv * sy + 2 * inv * t * cy + t * t * ey - size },
        { scale: t > 0.85 ? 1 - (t - 0.85) * 2 : 1 },
      ],
      opacity: t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1,
    };
  });

  const canvas = size * 2;
  return (
    <Animated.View style={[styles.mote, { width: canvas, height: canvas }, style]}>
      <Svg width={canvas} height={canvas}>
        <Defs>
          <RadialGradient id={`mote-${mote.id}`} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <Stop offset="0" stopColor="rgb(255, 255, 255)" stopOpacity="0.95" />
            <Stop offset="0.35" stopColor="rgb(214, 194, 250)" stopOpacity="0.8" />
            <Stop offset="1" stopColor="rgb(190, 160, 245)" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={canvas / 2} cy={canvas / 2} r={canvas / 2} fill={`url(#mote-${mote.id})`} />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mote: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
