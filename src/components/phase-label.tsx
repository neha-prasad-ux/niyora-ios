// Phase cue, shown as text. When the phase changes, the old word fades fully
// out and the new word fades in (sequenced, never overlapping) so the swap reads
// as one clean word replacing another. Long multi-word labels wrap to two lines
// at full size rather than shrinking.

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type PhaseLabelProps = {
  label: string;
};

const FADE_MS = 420;
const EASE = Easing.inOut(Easing.cubic);

export function PhaseLabel({ label }: PhaseLabelProps) {
  const [shown, setShown] = useState(label);
  const [prev, setPrev] = useState<string | null>(null);
  const shownOpacity = useSharedValue(1);
  const shownScale = useSharedValue(1);
  const prevOpacity = useSharedValue(0);
  const prevScale = useSharedValue(1);
  // Subtle pulse of the whole chip on each change, so the container feels alive.
  const chipScale = useSharedValue(1);
  const lastLabelRef = useRef(label);
  const [reduceMotion, setReduceMotion] = useState(false);

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
    const fromOpacity = shownOpacity.value;
    cancelAnimation(shownOpacity);
    cancelAnimation(prevOpacity);

    setPrev(lastLabelRef.current);
    setShown(label);
    lastLabelRef.current = label;

    const duration = reduceMotion ? 0 : FADE_MS;

    // Old word fades + eases down slightly; new word fades + eases up to rest.
    // Both are centred in the same spot, so nothing slides sideways.
    prevOpacity.value = fromOpacity;
    prevScale.value = 1;
    shownOpacity.value = 0;
    shownScale.value = reduceMotion ? 1 : 0.94;

    // Sequence rather than overlap: the old word fades fully out first, THEN the
    // new word fades in. Two different words never share the screen at once, so
    // the swap reads as one clean word replacing another instead of two garbled
    // words ghosting through each other. (reduceMotion collapses to an instant
    // swap.)
    const outMs = reduceMotion ? 0 : Math.round(duration * 0.42);
    const inMs = reduceMotion ? 0 : duration - outMs;

    prevOpacity.value = withTiming(0, { duration: outMs, easing: EASE }, (finished) => {
      'worklet';
      if (finished) runOnJS(setPrev)(null);
    });
    prevScale.value = withTiming(reduceMotion ? 1 : 0.94, { duration: outMs, easing: EASE });
    shownOpacity.value = withDelay(outMs, withTiming(1, { duration: inMs, easing: EASE }));
    shownScale.value = withDelay(outMs, withTiming(1, { duration: inMs, easing: EASE }));

    if (!reduceMotion) {
      chipScale.value = withSequence(
        withTiming(1.05, { duration: 150, easing: EASE }),
        withTiming(1, { duration: 260, easing: EASE }),
      );
    }

    // Announce the new phase label for iOS VoiceOver.
    AccessibilityInfo.announceForAccessibility(label);
  }, [label, reduceMotion]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
  }));
  const shownStyle = useAnimatedStyle(() => ({
    opacity: shownOpacity.value,
    transform: [{ scale: shownScale.value }],
  }));
  const prevStyle = useAnimatedStyle(() => ({
    opacity: prevOpacity.value,
    transform: [{ scale: prevScale.value }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.chip, chipStyle]}>
        <View style={styles.textStack}>
          {prev !== null && (
            <Animated.View style={[styles.layer, prevStyle]} pointerEvents="none">
              <Text style={styles.text} numberOfLines={2}>
                {prev}
              </Text>
            </Animated.View>
          )}
          <Animated.View style={[styles.layer, shownStyle]}>
            <Text style={styles.text} numberOfLines={2} accessibilityLiveRegion="polite">
              {shown}
            </Text>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 10,
  },
  chip: {
    // No pill container off-centre: the cue is just glowing text now that it no
    // longer needs to stand apart from the bloom behind it.
    // Stretch to the full available width: the words live in an absolutely-
    // positioned layer (below) and so give the container no intrinsic width.
    // Without this the chip collapses to its content, forcing multi-word labels
    // like "inhale left" to wrap and get clipped by the fixed textStack height.
    alignSelf: 'stretch',
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed-height stack. Both words are absolutely-positioned, flex-centred
  // layers (below), so the outgoing and incoming words occupy the exact same
  // centred rect during the cross-fade. This avoids the iOS glitch where an
  // absolute Text relying on textAlignVertical (Android-only) sat higher than
  // the centred incoming word, so the two never lined up mid-transition.
  textStack: {
    // Tall enough for up to two lines so long labels ("inhale through teeth")
    // wrap and stay at full size instead of shrinking or getting clipped.
    height: 78,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 30,
    // Poppins SemiBold to match the rest of the app (the weight is baked into
    // the family file, so no fontWeight — that would trigger synthetic bolding).
    fontFamily: 'Poppins-SemiBold',
    lineHeight: 34,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
