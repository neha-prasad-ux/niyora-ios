// The distress loop: the in-the-moment core of PMS mode. The order is the
// safety mechanism, so it never changes: name the feeling, rate it, a calming
// activity FIRST (we never reframe anyone while they are hot), then reflection
// with a gentle distancing reframe, then rate again, then a done page scaled to
// the before/after shift. Completing it adds to a reset-proof counter, never a
// breakable streak.
//
// Privacy: her written reflection stays on the device and is never sent
// anywhere. The distancing step reuses the app's vetted, fact-checked feeling
// reframes (UNDERSTAND_CARDS) rather than an off-device model. A real rephrase
// of her own words is a later, opt-in wave.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { Orb } from '@/components/orb';
import { PhaseLabel } from '@/components/phase-label';
import { colors } from '@/theme/colors';
import { useBreathCycle } from '@/hooks/use-breath-cycle';
import type { BreathPhase } from '@/models/techniques';
import { PMS_FEELINGS, type PmsFeeling } from '@/models/activities';
import {
  UNDERSTAND_CARDS,
  type UnderstandCard,
  type UnderstandContext,
} from '@/models/understand';
import { resolveUnderstandContext } from '@/lib/understand-context';
import { addDistressEntry, getDistressState } from '@/store/distress-history';
import { CrisisLink } from '@/components/crisis-link';
import { looksLikeCrisisText } from '@/lib/crisis';

type Phase =
  | 'entry'
  | 'ratingBefore'
  | 'activity'
  | 'reflect'
  | 'reframe'
  | 'ratingAfter'
  | 'done';

const FEELING_LABELS: Record<PmsFeeling, string> = {
  irritable: 'Irritable',
  anxious: 'Anxious',
  low: 'Low',
  foggy: 'Foggy',
  overwhelmed: 'Overwhelmed',
};

// A calming breath for the activity beat: 4 in / 6 out, three rounds (~30s).
const DISTRESS_BREATH: readonly BreathPhase[] = [
  { type: 'inhale', label: 'breathe in', duration: 4 },
  { type: 'exhale', label: 'breathe out', duration: 6 },
];
const DISTRESS_BREATH_ROUNDS = 3;
const BREATH_RANGE = { min: 0.72, max: 1.3 };

const RATING_MIN = 1;
const RATING_MAX = 5;

// The vetted reframe for a feeling in the current context, falling back to the
// universal "feeling safe" card when there is no specific feeling.
function reframeFor(feeling: PmsFeeling | null, ctx: UnderstandContext): UnderstandCard {
  if (feeling) {
    const exact = UNDERSTAND_CARDS.find(
      (c) => c.scope === 'feeling' && c.feeling === feeling && c.context === ctx,
    );
    if (exact) return exact;
    const anyCtx = UNDERSTAND_CARDS.find((c) => c.scope === 'feeling' && c.feeling === feeling);
    if (anyCtx) return anyCtx;
  }
  return (
    UNDERSTAND_CARDS.find((c) => c.id === 'feeling-safe') ?? UNDERSTAND_CARDS[0]
  );
}

// Drives the calming breath and reports completion, mounted only on the
// activity beat so its timer starts then.
function BreathActivity({
  onPhase,
  onDone,
}: {
  onPhase: (p: BreathPhase) => void;
  onDone: () => void;
}) {
  const cycle = useBreathCycle(DISTRESS_BREATH, DISTRESS_BREATH_ROUNDS);
  const lastPhase = useRef(-1);
  const doneFired = useRef(false);

  useEffect(() => {
    if (cycle.phaseIndex !== lastPhase.current) {
      lastPhase.current = cycle.phaseIndex;
      onPhase(cycle.phase);
    }
  }, [cycle.phaseIndex, cycle.phase, onPhase]);

  useEffect(() => {
    if (cycle.done && !doneFired.current) {
      doneFired.current = true;
      onDone();
    }
  }, [cycle.done, onDone]);

  return <PhaseLabel label={cycle.phase.label} />;
}

// The 1..5 feel scale. Light on the left, heavy on the right.
function FeelScale({
  value,
  onPick,
}: {
  value: number | null;
  onPick: (n: number) => void;
}) {
  return (
    <View>
      <View style={styles.scaleRow}>
        {Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => RATING_MIN + i).map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onPick(n)}
              style={[styles.scaleDot, selected && styles.scaleDotOn]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${n} of ${RATING_MAX}`}
            >
              <Text style={[styles.scaleNum, selected && styles.scaleNumOn]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleEnd}>A little</Text>
        <Text style={styles.scaleEnd}>A lot</Text>
      </View>
    </View>
  );
}

export default function DistressLoopScreen() {
  const [phase, setPhase] = useState<Phase>('entry');
  const [feeling, setFeeling] = useState<PmsFeeling | null>(null);
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  const [reflection, setReflection] = useState('');
  const [breathPhase, setBreathPhase] = useState<BreathPhase | undefined>(undefined);
  const [breathDone, setBreathDone] = useState(false);
  const [ctx, setCtx] = useState<UnderstandContext>('general');
  // The count to celebrate on the done page (stored + this one), read once.
  const [doneCount, setDoneCount] = useState<number | null>(null);
  // The behavioral net: set when she has finished the loop and still rates
  // bottom-band several times running. A single low rating never triggers it.
  const [showReachOut, setShowReachOut] = useState(false);
  const recorded = useRef(false);

  // Resolve the reframe context (PMS vs general) once on mount.
  useEffect(() => {
    let alive = true;
    resolveUnderstandContext()
      .then((c) => alive && setCtx(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const reframe = useMemo(() => reframeFor(feeling, ctx), [feeling, ctx]);
  const shift = before != null && after != null ? before - after : 0;
  const bigShift = (after != null && after <= 2) || shift >= 2;

  const exit = useCallback(() => {
    Haptics.selectionAsync();
    router.back();
  }, []);

  const chooseFeeling = useCallback((f: PmsFeeling | null) => {
    Haptics.selectionAsync();
    setFeeling(f);
    setPhase('ratingBefore');
  }, []);

  const startActivity = useCallback(() => {
    Haptics.selectionAsync();
    setBreathPhase(undefined);
    setBreathDone(false);
    setPhase('activity');
  }, []);

  const handleBreathDone = useCallback(() => {
    setBreathDone(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  const goReflect = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setPhase('reflect');
  }, []);

  const goReframe = useCallback(() => {
    Haptics.selectionAsync();
    Keyboard.dismiss();
    // Content exit: self-harm-adjacent input goes straight to the crisis
    // resource, never to a reframe.
    if (looksLikeCrisisText(reflection)) {
      router.push('/crisis');
      return;
    }
    setPhase('reframe');
  }, [reflection]);

  const goRatingAfter = useCallback(() => {
    Haptics.selectionAsync();
    setPhase('ratingAfter');
  }, []);

  // Entering the done page: read the current count so we can show this
  // completion as count + 1, without recording yet (try-another must not count).
  const goDone = useCallback(() => {
    Haptics.selectionAsync();
    setPhase('done');
    getDistressState()
      .then((s) => {
        setDoneCount(s.count + 1);
        // Behavioral net: this rating plus the last two recorded, all bottom
        // band (4 or 5). Needs three in a row, so a single low day never fires.
        const recent = s.entries.slice(-2).map((e) => e.after);
        const band = [after, ...recent].filter((n): n is number => n != null);
        setShowReachOut(band.length >= 3 && band.every((n) => n >= 4));
      })
      .catch(() => setDoneCount(null));
  }, [after]);

  // Record once, on the terminal exit from the done page.
  const finishAndExit = useCallback(() => {
    Haptics.selectionAsync();
    if (!recorded.current && before != null && after != null) {
      recorded.current = true;
      addDistressEntry({
        feeling,
        before,
        after,
        completedAt: new Date().toISOString(),
      }).catch(() => {});
    }
    router.back();
  }, [feeling, before, after]);

  // "Try another" loops back to a fresh activity; the after-rating is re-taken.
  const tryAnother = useCallback(() => {
    Haptics.selectionAsync();
    setAfter(null);
    setBreathPhase(undefined);
    setBreathDone(false);
    setPhase('activity');
  }, []);

  return (
    <View style={styles.root}>
      <BackgroundGradient luteal={ctx === 'pms'} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={exit}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <SymbolView name="xmark" tintColor={colors.textTagline} size={15} weight="medium" />
          </Pressable>
        </View>

        {phase === 'entry' && (
          <ScrollView style={styles.phaseScroll} contentContainerStyle={styles.entryContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>How are you?</Text>
            <View style={styles.chips}>
              {PMS_FEELINGS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => chooseFeeling(f)}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel={FEELING_LABELS[f]}
                >
                  <Text style={styles.chipText}>{FEELING_LABELS[f]}</Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => chooseFeeling(null)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel="Something feels off"
              >
                <Text style={styles.chipText}>Something feels off</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={exit}
              hitSlop={12}
              style={styles.imGood}
              accessibilityRole="button"
              accessibilityLabel="I'm good"
            >
              <Text style={styles.imGoodText}>I&apos;m good</Text>
            </Pressable>
          </ScrollView>
        )}

        {phase === 'ratingBefore' && (
          <View style={styles.centerContent}>
            <Text style={styles.title}>How strong is it right now?</Text>
            <View style={styles.scaleWrap}>
              <FeelScale value={before} onPick={(n) => { Haptics.selectionAsync(); setBefore(n); }} />
            </View>
            <View style={styles.footer}>
              <BeginButton label="Continue" onPress={startActivity} disabled={before == null} />
            </View>
          </View>
        )}

        {phase === 'activity' && (
          <View style={styles.activityContent}>
            <View style={styles.orbArea}>
              <Orb
                size={200}
                hue={ctx === 'pms' ? 332 : undefined}
                phase={breathPhase ? (breathPhase.type === 'hold2' ? 'hold' : breathPhase.type) : undefined}
                phaseDuration={breathPhase?.duration}
                breathRange={BREATH_RANGE}
              />
            </View>
            <View style={styles.activityLabel}>
              {!breathDone ? (
                <BreathActivity onPhase={setBreathPhase} onDone={handleBreathDone} />
              ) : (
                <Text style={styles.sub}>Whenever you&apos;re ready.</Text>
              )}
            </View>
            <View style={styles.footer}>
              <BeginButton label={breathDone ? 'Continue' : 'I feel calmer'} onPress={goReflect} />
            </View>
          </View>
        )}

        {phase === 'reflect' && (
          <ScrollView
            style={styles.phaseScroll}
            contentContainerStyle={styles.reflectContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>What&apos;s on your mind?</Text>
            <Text style={styles.sub}>Just for you. It stays on your phone.</Text>
            <TextInput
              style={styles.input}
              value={reflection}
              onChangeText={setReflection}
              placeholder="Write as little or as much as you like"
              placeholderTextColor={colors.textTagline}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Your reflection"
            />
            <View style={styles.footer}>
              <BeginButton label="Continue" onPress={goReframe} />
            </View>
          </ScrollView>
        )}

        {phase === 'reframe' && (
          <ScrollView style={styles.phaseScroll} contentContainerStyle={styles.reflectContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.reframeTitle}>{reframe.title}</Text>
            <Text style={styles.reframeBody}>{reframe.body}</Text>
            <Text style={styles.reframeAsk}>Does this land?</Text>
            <View style={styles.footer}>
              <BeginButton label="Yes" onPress={goRatingAfter} />
              <Pressable
                onPress={goRatingAfter}
                hitSlop={12}
                style={styles.notNow}
                accessibilityRole="button"
                accessibilityLabel="Not quite"
              >
                <Text style={styles.notNowText}>Not quite</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        {phase === 'ratingAfter' && (
          <View style={styles.centerContent}>
            <Text style={styles.title}>And now?</Text>
            <View style={styles.scaleWrap}>
              <FeelScale value={after} onPick={(n) => { Haptics.selectionAsync(); setAfter(n); }} />
            </View>
            <View style={styles.footer}>
              <BeginButton label="Continue" onPress={goDone} disabled={after == null} />
            </View>
          </View>
        )}

        {phase === 'done' && (
          <View style={styles.centerContent}>
            {showReachOut ? (
              <>
                <Text style={styles.title}>You&apos;ve been carrying a lot.</Text>
                <Text style={styles.sub}>
                  These days have stayed heavy even after you showed up for yourself. Talking to
                  someone can help, and reaching out is a strong thing to do.
                </Text>
                <View style={styles.footer}>
                  <BeginButton label="Find support" onPress={() => router.push('/crisis')} />
                  <Pressable
                    onPress={finishAndExit}
                    hitSlop={12}
                    style={styles.notNow}
                    accessibilityRole="button"
                    accessibilityLabel="Maybe later"
                  >
                    <Text style={styles.notNowText}>Maybe later</Text>
                  </Pressable>
                </View>
              </>
            ) : bigShift ? (
              <>
                <Text style={styles.title}>You moved through it.</Text>
                <Text style={styles.sub}>
                  {doneCount != null
                    ? `That's ${doneCount} ${doneCount === 1 ? 'time' : 'times'} you've come back to yourself.`
                    : "That's one more time you came back to yourself."}
                </Text>
                <View style={styles.footer}>
                  <BeginButton label="Close" onPress={finishAndExit} />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.title}>That happens.</Text>
                <Text style={styles.sub}>Some days need a second pass. Want to try another?</Text>
                <View style={styles.footer}>
                  <BeginButton label="Try another" onPress={tryAnother} />
                  <Pressable
                    onPress={finishAndExit}
                    hitSlop={12}
                    style={styles.notNow}
                    accessibilityRole="button"
                    accessibilityLabel="I'm done for now"
                  >
                    <Text style={styles.notNowText}>I&apos;m done for now</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.crisisFooter}>
          <CrisisLink />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  topBar: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: 0.3,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 12,
  },
  phaseScroll: {
    flex: 1,
    alignSelf: 'stretch',
  },
  entryContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  imGood: {
    marginTop: 30,
  },
  imGoodText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  scaleWrap: {
    marginTop: 32,
    alignSelf: 'stretch',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  scaleDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDotOn: {
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.25)',
  },
  scaleNum: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    color: colors.textSubtitle,
  },
  scaleNumOn: {
    fontFamily: 'Poppins-Medium',
    color: colors.textPrimary,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 6,
  },
  scaleEnd: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },
  activityContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  activityLabel: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  input: {
    marginTop: 20,
    minHeight: 120,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  reframeTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  reframeBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 18,
  },
  reframeAsk: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: 26,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  notNow: {
    marginTop: 16,
  },
  notNowText: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: colors.textTertiary,
    letterSpacing: 0.2,
  },
  // Pinned to the bottom of every phase: the crisis link is always reachable.
  crisisFooter: {
    marginTop: 'auto',
    paddingTop: 8,
    paddingBottom: 4,
  },
});
