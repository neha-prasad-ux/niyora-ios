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
import { recordLight } from '@/store/light-ledger';
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
  | 'read'
  | 'breathe'
  | 'breakOffer'
  | 'quickOptions'
  | 'reflectOffer'
  | 'doReflect'
  | 'endingReconnect'
  | 'endingLine'
  | 'exit'
  | 'close';

export default function SteadyYourselfScreen() {
  const [phase, setPhase] = useState<Phase>('recognise');
  const [what, setWhat] = useState<WhatHappenedId | null>(null);

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
      go('read');
    },
    [go],
  );

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

  const showClose = phase !== 'doReflect' && phase !== 'exit' && phase !== 'close';

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
              leaveTo('close', () =>
                router.push({ pathname: '/activity', params: { id: 'bridge-back' } }),
              )
            }
            secondaryLabel="I'll find my own words"
            onSecondary={() => go('close')}
          />
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
    paddingTop: 4,
  },
  back: { fontFamily: 'Poppins-Light', fontSize: 30, lineHeight: 32, color: colors.textSubtitle },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  block: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },

  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 26,
    lineHeight: 32,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 22,
  },

  chips: { width: '100%', gap: 12 },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  chipText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  readLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    lineHeight: 33,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    paddingHorizontal: 4,
  },

  orbWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  breathLead: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textTagline,
    marginBottom: 18,
  },
  breathLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 18,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 320,
  },
  breathWhy: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
    letterSpacing: 0.2,
    maxWidth: 300,
    marginTop: 12,
  },

  gateTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  gateBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
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
    gap: 6,
  },
  ghost: { paddingVertical: 12 },
  ghostText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textTagline,
    textDecorationLine: 'underline',
    letterSpacing: 0.2,
  },

  closeLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 20,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    marginTop: 24,
    paddingHorizontal: 12,
  },
});
