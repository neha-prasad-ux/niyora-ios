// Cross-fading phase label. When the label string changes, the old text
// fades out while the new one fades in, both shifted by a soft text shadow
// so the active cue feels "lit" (mirrors the Mac canvas shadowBlur on text).
//
// Pass nextLabel to show a dimmer sub-label ("then hold") below the current
// phase, matching the Mac next-phase cue from niyora#78.

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type PhaseLabelProps = {
  label: string;
  nextLabel?: string | null;
};

const FADE_MS = 360;
// How far the cue slides horizontally as it crosses over (new in from the
// right, old out to the left).
const SLIDE = 22;
const EASE = Easing.out(Easing.cubic);

export function PhaseLabel({ label, nextLabel }: PhaseLabelProps) {
  const [shown, setShown] = useState(label);
  const [prev, setPrev] = useState<string | null>(null);
  const shownOpacity = useSharedValue(1);
  const prevOpacity = useSharedValue(0);
  const shownTx = useSharedValue(0);
  const prevTx = useSharedValue(0);
  const lastLabelRef = useRef(label);
  const [reduceMotion, setReduceMotion] = useState(false);

  const [shownNext, setShownNext] = useState(nextLabel ?? null);
  const nextOpacity = useSharedValue(nextLabel ? 1 : 0);
  const lastNextRef = useRef(nextLabel);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      if (!cancelled) setReduceMotion(rm);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (label === lastLabelRef.current) return;

    // Snapshot before canceling so prev inherits exactly where shown left off,
    // avoiding a pop-to-1 flicker when a change arrives mid-animation.
    const currentShownOpacity = shownOpacity.value;

    cancelAnimation(shownOpacity);
    cancelAnimation(prevOpacity);

    setPrev(lastLabelRef.current);
    setShown(label);
    lastLabelRef.current = label;

    const duration = reduceMotion ? 0 : FADE_MS;

    // Old text fades + slides out to the left; new text fades + slides in from
    // the right, for a smooth horizontal hand-off.
    prevOpacity.value = currentShownOpacity;
    prevTx.value = 0;
    shownOpacity.value = 0;
    shownTx.value = reduceMotion ? 0 : SLIDE;
    prevOpacity.value = withTiming(0, { duration, easing: EASE }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(setPrev)(null);
      }
    });
    prevTx.value = withTiming(reduceMotion ? 0 : -SLIDE, { duration, easing: EASE });
    shownOpacity.value = withTiming(1, { duration, easing: EASE });
    shownTx.value = withTiming(0, { duration, easing: EASE });

    // Announce the new phase label for iOS VoiceOver.
    AccessibilityInfo.announceForAccessibility(label);
  }, [label, prevOpacity, shownOpacity, prevTx, shownTx, reduceMotion]);

  useEffect(() => {
    if (nextLabel === lastNextRef.current) return;
    lastNextRef.current = nextLabel;
    const duration = reduceMotion ? 0 : FADE_MS;
    if (nextLabel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the label cross-fade effect above; the ref guard prevents cascading renders
      setShownNext(nextLabel);
      nextOpacity.value = 0;
      nextOpacity.value = withTiming(1, { duration });
    } else {
      nextOpacity.value = withTiming(0, { duration }, (finished) => {
        'worklet';
        if (finished) runOnJS(setShownNext)(null);
      });
    }
  }, [nextLabel, nextOpacity, reduceMotion]);

  const shownStyle = useAnimatedStyle(() => ({
    opacity: shownOpacity.value,
    transform: [{ translateX: shownTx.value }],
  }));
  const prevStyle = useAnimatedStyle(() => ({
    opacity: prevOpacity.value,
    transform: [{ translateX: prevTx.value }],
  }));
  const nextStyle = useAnimatedStyle(() => ({ opacity: nextOpacity.value }));

  return (
    <View style={styles.wrap}>
      {prev !== null && (
        <Animated.View style={[styles.absolute, prevStyle]}>
          <Text style={styles.text}>{prev}</Text>
        </Animated.View>
      )}
      <Animated.View style={shownStyle}>
        <Text style={styles.text} accessibilityLiveRegion="polite">{shown}</Text>
      </Animated.View>
      {shownNext !== null && (
        <Animated.View style={[styles.nextWrap, nextStyle]}>
          <Text style={styles.nextText}>{shownNext}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 24,
    // Stretch to the parent's full width so a long cue ("inhale through your
    // mouth") lays out on one line and centers, instead of collapsing to the
    // longest-word width and wrapping into a narrow vertical column.
    alignSelf: 'stretch',
    justifyContent: 'center',
    // Breathing room so the soft white text-glow isn't cramped on the sides.
    paddingTop: 10,
    paddingHorizontal: 18,
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  text: {
    // Match the mindfulness prompt title (22/400) so breathing and mindfulness
    // sessions read with the same size and weight.
    fontSize: 22,
    fontWeight: '400',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255, 245, 235, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  nextWrap: {
    marginTop: 8,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 12,
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.47)',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
