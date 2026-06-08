// Phase cue, shown as glowing text. The word cross-fades + scales in place when
// the phase changes, so the swap reads as one smooth morph rather than two words
// sliding past each other. A soft text glow keeps the active cue feeling "lit"
// (mirrors the Mac canvas shadowBlur).
//
// Pass nextLabel to show a dimmer sub-label below the chip.

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

type PhaseLabelProps = {
  label: string;
  nextLabel?: string | null;
};

const FADE_MS = 300;
const EASE = Easing.out(Easing.cubic);

export function PhaseLabel({ label, nextLabel }: PhaseLabelProps) {
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

    prevOpacity.value = withTiming(0, { duration, easing: EASE }, (finished) => {
      'worklet';
      if (finished) runOnJS(setPrev)(null);
    });
    prevScale.value = withTiming(reduceMotion ? 1 : 0.94, { duration, easing: EASE });
    shownOpacity.value = withTiming(1, { duration, easing: EASE });
    shownScale.value = withTiming(1, { duration, easing: EASE });

    if (!reduceMotion) {
      chipScale.value = withSequence(
        withTiming(1.05, { duration: 150, easing: EASE }),
        withTiming(1, { duration: 260, easing: EASE }),
      );
    }

    // Announce the new phase label for iOS VoiceOver.
    AccessibilityInfo.announceForAccessibility(label);
  }, [label, reduceMotion]);

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
  }, [nextLabel, reduceMotion]);

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
  const nextStyle = useAnimatedStyle(() => ({ opacity: nextOpacity.value }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.chip, chipStyle]}>
        <View style={styles.textStack}>
          {prev !== null && (
            <Animated.Text style={[styles.text, styles.textAbsolute, prevStyle]}>
              {prev}
            </Animated.Text>
          )}
          <Animated.Text
            style={[styles.text, shownStyle]}
            accessibilityLiveRegion="polite"
          >
            {shown}
          </Animated.Text>
        </View>
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
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingTop: 10,
  },
  chip: {
    // No pill container off-centre: the cue is just glowing text now that it no
    // longer needs to stand apart from the bloom behind it.
    minWidth: 132,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Fixed-height stack so the outgoing (absolute) and incoming words sit in the
  // exact same centred spot during the cross-fade.
  textStack: {
    height: 30,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    textAlignVertical: 'center',
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
    marginTop: 10,
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
