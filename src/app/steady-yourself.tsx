// "Steady yourself": the in-the-moment PMS flow, and the Now tab's single
// coached action during the PMS days. One stateful screen walks the locked flow
// tree — recognise -> kinder read -> one breath -> down-regulate (a few more /
// 20-min break / 3-min reset) -> ONCE COOLED, an optional reflect (CBT) ->
// repair -> gentle line -> close — carrying what she chose so the read and the
// branches follow from it. Reflect is offered only after arousal is down
// (reappraisal lands on a clear head, not a flooded one), never mid-spike.
//
// It reuses the app's existing surfaces for the heavy beats rather than
// rebuilding them: the breath session (/session), the reflect session
// (/rough-moment), the reconnect checklist (/couples-reconnect) and the
// bridge-back gentle line (/activity). Each hand-off sets the phase to resume on
// return, so the flow picks up where it left off — this screen stays mounted
// underneath. The flow's own copy lives in v3/steady-yourself-content.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CloseButton } from '@/components/CloseButton';
import { Orb } from '@/components/orb';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { recordLight } from '@/store/light-ledger';
import { addSteadyEntry } from '@/store/steady-history';
import {
  BREAK_TITLE,
  BREAK_WHY,
  BREATH_DONE_LINE,
  BREATH_IN_LINE,
  BREATH_LEAD,
  BREATH_OUT_LINE,
  CLOSE_LINE,
  FEW_MORE_WHY,
  GENTLE_LINE_INTRO,
  KINDER_READ,
  QUICK_OPTIONS,
  QUICK_OPTIONS_TITLE,
  REFLECT_OFFER_TITLE,
  REFLECT_OFFER_WHY,
  RESET_CARRY_LINE,
  WHAT_HAPPENED,
  type QuickOptionId,
  type WhatHappenedId,
} from '@/v3/steady-yourself-content';

// The moon paces the same calm 4:6 breath as the home screen.
const BREATH_IN = 4;
const BREATH_OUT = 6;

// Ledger ref: moving through a rough moment is applying a skill in real life
// (moon-reward-spec: apply). Logged once on close.
const STEADY_REF = 'steady-yourself';

// The internal steps. The three "auto" phases (doReflect, resetGround, close)
// carry no choice of their own — on entry they fire their side effect (route
// onward, or log-and-leave). Everything else is a screen she acts on. CBT is
// reached only through `reflectOffer`, which every cooled-down path funnels into
// (breathing helped, or after a break/reset) — never while she is still hot.
type Phase =
  | 'recognise'
  | 'rateBefore'
  | 'read'
  | 'breathe'
  | 'breakOffer'
  | 'quickOptions'
  | 'reflectOffer'
  | 'doReflect'
  | 'endingReconnect'
  | 'endingLine'
  | 'rateAfter'
  | 'relief'
  | 'exit'
  | 'close';

export default function SteadyYourselfScreen() {
  const [phase, setPhase] = useState<Phase>('recognise');
  const [what, setWhat] = useState<WhatHappenedId | null>(null);
  // The before/after feel-ratings (1..5) that measure whether the flow actually
  // helped. `before` is taken right after she names what happened (peak), `after`
  // once she has cooled down, and the relief screen scales its line to the shift.
  const [before, setBefore] = useState<number | null>(null);
  const [after, setAfter] = useState<number | null>(null);
  // The reset-proof lifetime count, read fresh on the relief screen.
  const [reliefCount, setReliefCount] = useState<number | null>(null);

  // A history stack for the in-flow Back button: every forward step records the
  // step it left, so Back retraces the actual path she took (branches included).
  // phaseRef mirrors phase so the ref-based helpers (event handlers) read the
  // current step without being recreated each render.
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const historyRef = useRef<Phase[]>([]);

  // The phase to resume when a hand-off screen (breath, reflect, repair, line)
  // pops back to this one. This screen stays mounted underneath the pushed one,
  // so restoring is just reading the ref on refocus. leaveTo records the
  // pre-hand-off step so Back from the resumed step returns here.
  const resumeRef = useRef<Phase | null>(null);
  const leaveTo = useCallback((resume: Phase, run: () => void) => {
    Haptics.selectionAsync().catch(() => {});
    historyRef.current.push(phaseRef.current);
    resumeRef.current = resume;
    run();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (resumeRef.current != null) {
        const next = resumeRef.current;
        resumeRef.current = null;
        setPhase(next);
      }
    }, []),
  );

  // The one auto hand-off: she accepted the reflect invite, so open the CBT
  // session and resume at the shared ending when it pops back.
  useEffect(() => {
    if (phase === 'doReflect') {
      resumeRef.current = 'endingReconnect';
      router.push('/rough-moment' as Href);
    }
  }, [phase]);

  // The close: log the effort once, hold the parting line a beat, then home.
  // Both the full close (CLOSE_LINE) and the quick exit (the carry line) settle
  // this way — showing up and stepping back is itself the win worth logging.
  const logged = useRef(false);
  useEffect(() => {
    if (phase !== 'close' && phase !== 'exit') return;
    if (!logged.current) {
      logged.current = true;
      recordLight('apply', { refId: STEADY_REF }).catch(() => {});
    }
    const t = setTimeout(() => router.back(), 1800);
    return () => clearTimeout(t);
  }, [phase]);

  // Close leaves the whole flow (one route, whatever the inner step).
  const exit = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  }, []);

  // Forward navigation records where we came from so Back can retrace it.
  const go = useCallback((next: Phase) => {
    Haptics.selectionAsync().catch(() => {});
    historyRef.current.push(phaseRef.current);
    setPhase(next);
  }, []);

  // Back walks one step up the path she took; from the first step it leaves.
  const back = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    const prev = historyRef.current.pop();
    if (prev != null) setPhase(prev);
    else router.back();
  }, []);

  const chooseWhat = useCallback(
    (id: WhatHappenedId) => {
      setWhat(id);
      // Name it, then rate it before any calming, so the shift is measured from
      // the peak.
      go('rateBefore');
    },
    [go],
  );

  // The relief screen: record the completed flow (once) and read the fresh
  // lifetime count. Recording needs both ratings; the light is logged here
  // rather than on 'close' since a rated flow ends here. Then it settles home.
  const reliefRecorded = useRef(false);
  useEffect(() => {
    if (phase !== 'relief') return;
    if (!reliefRecorded.current) {
      reliefRecorded.current = true;
      recordLight('apply', { refId: STEADY_REF }).catch(() => {});
      if (before != null && after != null) {
        addSteadyEntry({ what, before, after, at: new Date().toISOString() })
          .then((s) => setReliefCount(s.count))
          .catch(() => {});
      }
    }
    const t = setTimeout(() => router.back(), 4600);
    return () => clearTimeout(t);
  }, [phase, before, after, what]);

  // The quick menu behind "I can't spare 20". The two doing-options cool her
  // down and converge on the reflect invite; exit carries the parting line out.
  const pickQuick = useCallback(
    (id: QuickOptionId) => {
      if (id === 'exit') {
        go('exit');
        return;
      }
      if (id === 'cold-water') {
        leaveTo('reflectOffer', () =>
          router.push({ pathname: '/activity', params: { id: 'cold-water' } }),
        );
        return;
      }
      // ground: the five-senses grounding session.
      leaveTo('reflectOffer', () =>
        router.push({ pathname: '/session', params: { id: 'five-senses' } }),
      );
    },
    [go, leaveTo],
  );

  const showClose =
    phase !== 'doReflect' && phase !== 'exit' && phase !== 'close' && phase !== 'relief';

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topBar}>
          {showClose ? (
            <>
              <Pressable
                onPress={back}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Text style={styles.back}>‹</Text>
              </Pressable>
              <CloseButton onPress={exit} />
            </>
          ) : (
            <View />
          )}
        </View>

        {phase === 'recognise' ? (
          <ChoiceMenu
            title="What happened?"
            sub="Science can help you move through it."
            options={WHAT_HAPPENED.map((w) => ({
              key: w.id,
              label: w.label,
              onPress: () => chooseWhat(w.id),
            }))}
          />
        ) : phase === 'rateBefore' ? (
          <FeelStep
            title="How strong is it right now?"
            value={before}
            onPick={setBefore}
            onNext={() => go('read')}
          />
        ) : phase === 'read' ? (
          <Read what={what} onNext={() => go('breathe')} />
        ) : phase === 'breathe' ? (
          <Breathe
            onFewMore={() =>
              leaveTo('breakOffer', () =>
                router.push({ pathname: '/session', params: { id: 'quick-calm', rounds: '6' } }),
              )
            }
            onEnough={() => go('breakOffer')}
          />
        ) : phase === 'breakOffer' ? (
          <Gate
            title={BREAK_TITLE}
            body={BREAK_WHY}
            primaryLabel="Start the timer"
            onPrimary={() =>
              leaveTo('reflectOffer', () =>
                router.push({ pathname: '/steady-break', params: { minutes: '20' } }),
              )
            }
            secondaryLabel="I can't spare 20"
            onSecondary={() => go('quickOptions')}
          />
        ) : phase === 'quickOptions' ? (
          <ChoiceMenu
            title={QUICK_OPTIONS_TITLE}
            options={QUICK_OPTIONS.map((o) => ({
              key: o.id,
              label: o.label,
              onPress: () => pickQuick(o.id),
            }))}
          />
        ) : phase === 'reflectOffer' ? (
          <Gate
            title={REFLECT_OFFER_TITLE}
            body={REFLECT_OFFER_WHY}
            primaryLabel="Let's think next step"
            onPrimary={() => go('doReflect')}
            secondaryLabel="I'm good for now"
            onSecondary={() => go('endingReconnect')}
          />
        ) : phase === 'endingReconnect' ? (
          <Gate
            title="Want to make things right?"
            body="If you hurt someone, here is how to reconnect."
            primaryLabel="Show me how"
            onPrimary={() => leaveTo('endingLine', () => router.push('/couples-reconnect' as Href))}
            secondaryLabel="Not right now"
            onSecondary={() => go('endingLine')}
          />
        ) : phase === 'endingLine' ? (
          <Gate
            title={GENTLE_LINE_INTRO}
            primaryLabel="Yes, show me the message"
            onPrimary={() =>
              leaveTo('rateAfter', () =>
                router.push({ pathname: '/activity', params: { id: 'bridge-back' } }),
              )
            }
            secondaryLabel="I'll find my own words"
            onSecondary={() => go('rateAfter')}
          />
        ) : phase === 'rateAfter' ? (
          <FeelStep
            title="And how is it now?"
            value={after}
            onPick={setAfter}
            onNext={() => go('relief')}
          />
        ) : phase === 'relief' ? (
          <Relief before={before} after={after} count={reliefCount} />
        ) : phase === 'close' ? (
          <Closing line={CLOSE_LINE} />
        ) : phase === 'exit' ? (
          <Closing line={RESET_CARRY_LINE} />
        ) : (
          // doReflect: a calm holding beat while the reflect screen pushes in.
          <View style={styles.center}>
            <Orb size={120} still />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

// --- A tap-to-choose menu: a title, an optional sub, a stack of chips ---------
// Shared by every single-select step (recognise, the post-breath triage, the
// quick options) so they read as one pattern.

type Choice = { key: string; label: string; onPress: () => void };

function ChoiceMenu({
  title,
  sub,
  options,
}: {
  title: string;
  sub?: string;
  options: readonly Choice[];
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.block}>
        <Text style={styles.title}>{title}</Text>
        {sub != null && <Text style={styles.sub}>{sub}</Text>}
        <View style={styles.chips}>
          {options.map((o) => (
            <Pressable
              key={o.key}
              style={styles.chip}
              onPress={o.onPress}
              accessibilityRole="button"
              accessibilityLabel={o.label}
            >
              <Text style={styles.chipText}>{o.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// --- Kinder read (and the reset carry line, same held-line shape) -----------

function Read({
  what,
  line,
  onNext,
  nextLabel = 'Take a breath',
}: {
  what?: WhatHappenedId | null;
  line?: string;
  onNext: () => void;
  nextLabel?: string;
}) {
  const text = line ?? (what ? KINDER_READ[what] : '');
  return (
    <View style={styles.center}>
      <Animated.Text entering={FadeIn.duration(600)} style={styles.readLine}>
        {text}
      </Animated.Text>
      <View style={styles.footer}>
        <BeginButton label={nextLabel} onPress={onNext} fullWidth />
      </View>
    </View>
  );
}

// --- One breath -------------------------------------------------------------
// Exactly one round: inhale, a longer exhale, then it settles and holds. The
// orb stops moving and the choice fades in right here — "a few more breaths" or
// "that's enough" — so there is no separate "can you do a few more?" page.

function Breathe({ onFewMore, onEnough }: { onFewMore: () => void; onEnough: () => void }) {
  const [phase, setPhase] = useState<'inhale' | 'exhale' | 'done'>('inhale');
  useEffect(() => {
    if (phase === 'done') return;
    const secs = phase === 'inhale' ? BREATH_IN : BREATH_OUT;
    const id = setTimeout(
      () => setPhase((p) => (p === 'inhale' ? 'exhale' : 'done')),
      secs * 1000,
    );
    return () => clearTimeout(id);
  }, [phase]);

  const done = phase === 'done';

  // Done: the moon steps away and the choice takes the centre, like the other
  // gates. The breath is over, so there is nothing left to breathe with.
  if (done) {
    return (
      <View style={styles.center}>
        <Animated.View entering={FadeIn.duration(500)} style={styles.block}>
          <Text style={styles.gateTitle}>{BREATH_DONE_LINE}</Text>
          <Text style={styles.gateBody}>{FEW_MORE_WHY}</Text>
        </Animated.View>
        <View style={styles.footer}>
          <BeginButton label="A few more breaths" onPress={onFewMore} fullWidth />
          <Pressable onPress={onEnough} hitSlop={10} accessibilityRole="button" style={styles.ghost}>
            <Text style={styles.ghostText}>That's enough</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Mid-breath: the moon breathes with the in/out line.
  return (
    <View style={styles.center}>
      <Text style={styles.breathLead}>{BREATH_LEAD}</Text>
      <View style={styles.orbWrap} pointerEvents="none">
        <Orb
          size={188}
          phase={phase}
          phaseDuration={phase === 'inhale' ? BREATH_IN : BREATH_OUT}
          breathRange={{ min: 0.72, max: 1.16 }}
        />
      </View>
      <Animated.Text key={phase} entering={FadeIn.duration(500)} style={styles.breathLine}>
        {phase === 'inhale' ? BREATH_IN_LINE : BREATH_OUT_LINE}
      </Animated.Text>
    </View>
  );
}

// --- A branch gate: a title, an optional why, a primary + a ghost choice -----

function Gate({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  body?: string;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) {
  return (
    <View style={styles.center}>
      <Animated.View entering={FadeIn.duration(500)} style={styles.block}>
        <Text style={styles.gateTitle}>{title}</Text>
        {body != null && <Text style={styles.gateBody}>{body}</Text>}
      </Animated.View>
      <View style={styles.footer}>
        <BeginButton label={primaryLabel} onPress={onPrimary} fullWidth />
        <Pressable onPress={onSecondary} hitSlop={10} accessibilityRole="button" style={styles.ghost}>
          <Text style={styles.ghostText}>{secondaryLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// --- Close ------------------------------------------------------------------
// Shared by the full close (CLOSE_LINE) and the quick exit (the carry line).

function Closing({ line }: { line: string }) {
  return (
    <View style={styles.center}>
      <Orb size={140} still />
      <Animated.Text entering={FadeIn.duration(700)} style={styles.closeLine}>
        {line}
      </Animated.Text>
    </View>
  );
}

// --- The 1..5 feel scale, light on the left, heavy on the right ---------------
function FeelScale({ value, onPick }: { value: number | null; onPick: (n: number) => void }) {
  return (
    <View style={styles.scaleWrap}>
      <View style={styles.scaleRow}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onPick(n)}
              hitSlop={8}
              style={[styles.scaleDot, selected && styles.scaleDotOn]}
              accessibilityRole="button"
              accessibilityLabel={`${n} of 5`}
              accessibilityState={{ selected }}
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

// A rating step: name the level now, then continue. Used before the calming
// (from the peak) and after it (once cooled down), so the shift is real.
function FeelStep({
  title,
  value,
  onPick,
  onNext,
}: {
  title: string;
  value: number | null;
  onPick: (n: number) => void;
  onNext: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.block}>
        <Text style={styles.title}>{title}</Text>
        <FeelScale
          value={value}
          onPick={(n) => {
            Haptics.selectionAsync().catch(() => {});
            onPick(n);
          }}
        />
        <View style={styles.feelFooter}>
          <BeginButton label="Continue" onPress={onNext} disabled={value == null} fullWidth />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// The relief payoff: a line scaled to the real before/after shift, then the
// reset-proof "N times you've come back" count. Honesty is the ask, so a small
// or no shift is still met warmly, never as a failure.
function Relief({
  before,
  after,
  count,
}: {
  before: number | null;
  after: number | null;
  count: number | null;
}) {
  const shift = before != null && after != null ? before - after : 0;
  const line =
    shift >= 2
      ? 'That eased a lot. Well done for staying with it.'
      : shift >= 1
        ? 'A little lighter than when you started. That counts.'
        : after != null && after <= 2
          ? 'You are in a calmer place now.'
          : 'Some days it barely shifts, and showing up for yourself still matters.';
  return (
    <View style={styles.center}>
      <Orb size={140} still />
      <Animated.Text entering={FadeIn.duration(700)} style={styles.closeLine}>
        {line}
      </Animated.Text>
      {count != null && (
        <Animated.Text
          entering={FadeIn.duration(700).delay(500)}
          style={styles.reliefCount}
        >
          {`That's ${count} ${count === 1 ? 'time' : 'times'} you've come back to yourself.`}
        </Animated.Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: pageGutter },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
    paddingTop: spacing.xs,
  },
  back: { fontFamily: fonts.light, fontSize: fontScale.pageTitle, lineHeight: 32, color: colors.textSubtitle },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  block: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },

  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.pageTitle,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sub: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: spacing.xl,
  },

  chips: { width: '100%', gap: spacing.md },
  chip: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  readLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.technique,
    lineHeight: 33,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: spacing.xs,
  },

  orbWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  breathLead: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: spacing.lg,
  },
  breathLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 320,
  },
  breathWhy: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 300,
    marginTop: spacing.md,
  },

  gateTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.technique,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  gateBody: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 320,
  },

  // The action block sits at the foot of the centred content.
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 12,
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghost: { paddingVertical: spacing.md },
  ghostText: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textTagline,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },

  closeLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.title,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.md,
  },
  reliefCount: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  scaleWrap: { width: '100%', gap: spacing.sm, marginTop: spacing.md },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  scaleDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleDotOn: {
    borderColor: colors.primarySolid,
    // unmapped: translucent violet selected-fill; fill ramp is white-only and
    // accentViolet is opaque.
    backgroundColor: 'rgba(150, 110, 205, 0.22)',
  },
  scaleNum: { fontFamily: fonts.regular, fontSize: fontScale.cardTitle, color: colors.textSubtitle },
  scaleNumOn: { color: colors.textPrimary },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: spacing.xs,
  },
  scaleEnd: { fontFamily: fonts.regular, fontSize: fontScale.caption, color: colors.textTagline },
  feelFooter: { width: '100%', marginTop: spacing.xl },
});
