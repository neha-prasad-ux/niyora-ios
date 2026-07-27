// The in-the-moment flow: her moon behind, one question in front.
//
// ONE BEAT ON SCREEN AT A TIME. No transcript, and that is the design, not a
// simplification:
//
//   · a chat log accumulates, and what it accumulates is her spiral, which she
//     can then scroll back and re-read. An empty wait is rehearsal, and so is a
//     scrollback.
//   · the session is ephemeral, and the UI should be too. Nothing is stored,
//     and there is nothing to scroll back through either.
//   · momentum is the in-flow mechanic: one item per screen, a response to
//     every tap, the bar moving. Celebration waits for the end.
//
// The moon stays behind everything, so the object she has been growing in Today
// and Train is present for the one conversation that is with it. It never
// mirrors her: it shows the state of the SESSION, never a judgement of her, and
// its whole job is to be the steady thing in the frame while she is not steady.
//
// Driven by the node table in v3/moment-flow. This screen renders whatever the
// current node is and asks the table where to go next. It holds no arc.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { CloseButton } from '@/components/CloseButton';
import { GlassSurface } from '@/components/glass-surface';
import { Aurora } from '@/components/moment/aurora';
import { Orb } from '@/components/orb';
import { OptionRow, ScaleButtons, WhyLine } from '@/components/moment/controls';
import { CRISIS_COPY, openCrisisLine } from '@/lib/crisis-scan';
import { analyse, offerFeelings, type Verdict } from '@/v3/moment-analyse';
import { foldLedger } from '@/lib/moon-light';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';
import type { MoonState } from '@/lib/moon-light';
import { bodyHue } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { advance, ENTRY, node, type NodeId, type Phase } from '@/v3/moment-flow';
import { COPY, offerableActs, SETS, threeRungs, UNIVERSAL_DV_LINE } from '@/v3/moment-copy';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** Four named phases, not a step count: the flow branches, so the total is not
 *  knowable partway through, and a bar that lies is worse than no bar. */
const PHASES: Phase[] = ['what happened', 'settle', 'what to do', 'the plan'];

/** Phase ids are structure and stay stable; these are the words she reads. */
const PHASE_LABEL: Record<Phase, string> = {
  'what happened': 'The situation',
  settle: 'Settle',
  'what to do': 'What to do',
  'the plan': 'The plan',
};

/** iOS keyboard toolbar: a multiline field's return key inserts a newline, so
 *  there is no other way to dismiss it once it covers the Continue button. */
const ACCESSORY_ID = 'moment-entry-done';

/**
 * At or above this on the 1-5 rating, the moment is "big" and skips the gentle
 * reframe.
 *
 * 4 is a judgement, not a finding: it puts the midpoint on the small side, so
 * a 3 still gets offered the gentle line before the body work. Named rather
 * than buried in a comparison so it is easy to move once there is real data on
 * where women actually sit when they open this.
 */
const BIG_FROM = 4;

/**
 * How long a tapped answer stays visible before the card moves on.
 *
 * Matches reflect.tsx, which set the house feel for this. Without the pause the
 * screen changes under her thumb and she never sees what she picked; with it,
 * the choice registers and there is a moment to notice a mistap.
 */
const ADVANCE_MS = 260;

/**
 * The body check's answers.
 *
 * Sleep and movement only. Food was cut from this beat (map change 00b) on
 * three separate grounds, any one of which is enough: the body-check evidence
 * covers sleep, stress and fatigue and never hunger; the only on-topic study is
 * not in the bank and sits beside a literature that failed to replicate; and
 * the app's own audit flags an unscreened food prompt as a risk, with binge
 * eating elevated through the luteal phase. Restoring it needs the study
 * verified AND a screen designed, not one or the other.
 */
type BodyItem = 'moved' | 'slept' | 'eaten';

/** Each answer's follow-up, in the order they are walked. Movement and food are
 *  fixable in the next ten minutes so they get an offer; sleep is not, so it
 *  only names the cost. */
const BODY_ORDER: BodyItem[] = ['moved', 'eaten', 'slept'];
const BODY_NEXT: Record<BodyItem, NodeId> = {
  moved: 'body_ask_soon',
  eaten: 'body_eat',
  slept: 'body_tired',
};

export default function Moment() {
  const reduceMotion = useReducedMotion();

  const [current, setCurrent] = useState<NodeId>(ENTRY);
  const [crisis, setCrisis] = useState(false);
  const [draft, setDraft] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  /** What the app decided about her sentence. Drives clarify vs acknowledge. */
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [feeling, setFeeling] = useState<string | null>(null);
  /** She chose to name it herself, so the field is showing. */
  const [otherOpen, setOtherOpen] = useState(false);
  /**
   * What she ticked at the body check. Multi-select, because they are not
   * alternatives: barely moving and sleeping badly happen together often, and
   * making her choose one loses the other.
   */
  const [bodyPicks, setBodyPicks] = useState<BodyItem[]>([]);
  /** The reading she chose at the reframe, before we ask whether it helped. */
  const [reframePick, setReframePick] = useState<string | null>(null);

  // Her moon, exactly as she has grown it.
  const [moon, setMoon] = useState<MoonState | null>(null);
  const [lifetimeLight, setLifetimeLight] = useState(0);
  useEffect(() => {
    let alive = true;
    Promise.all([getMoonState(), getLightLedger()])
      .then(([m, ledger]) => {
        if (!alive) return;
        setMoon(m);
        setLifetimeLight(foldLedger(ledger).lifetimeLight);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const herText = useRef('');
  /** The opening reading, kept so the close can report the delta. Not state:
   *  nothing renders from it until the flow ends. */
  const baseline = useRef<number | null>(null);
  /** The word she settled on, hers or ours. */
  const chosenFeeling = useRef('');
  const beat = node(current);
  const phaseIndex = PHASES.indexOf(beat.phase);

  const go = useCallback((from: NodeId, key?: string) => {
    const next = advance(from, key);
    if (next) setCurrent(next);
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    tap();

    // One call decides all three routes. The crisis scan runs inside it, on her
    // raw text, before anything else touches the string.
    const v = analyse(text);
    if (v.kind === 'crisis') {
      setCrisis(true);
      return;
    }

    setVerdict(v);
    setDraft('');

    // From the entry, the rating comes next on its own card. From clarify she
    // has already rated, so she goes straight on.
    if (current === 'raw_entry') {
      setCurrent('intensity_in');
      return;
    }

    // `clarify` only exists for a thin entry, so a clear verdict skips it.
    // Asking again when she has already named the thing reads as not listening.
    setCurrent(v.kind === 'clear' ? 'acknowledge' : 'clarify');
  }, [current, draft]);

  const leave = useCallback(() => {
    tap();
    router.back();
  }, []);

  // Cleared on unmount so a pending advance cannot fire into a dead screen.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  /**
   * Where she goes once the feeling is named.
   *
   * BIG or SMALL, taken from the rating she already gave rather than asking a
   * second time. Small gets the gentle reading; big skips it, because a reframe
   * lands on a clear head and fails on a flooded one, so the body comes first
   * and the thinking happens once she is not at the peak.
   */
  const afterFeeling = useCallback(
    (): NodeId => ((baseline.current ?? 0) >= BIG_FROM ? 'body_check' : 'reframe_small'),
    [],
  );

  /** Show the choice, then move. One decisive tap needs no confirming. */
  const pickThenGo = useCallback((next: () => void) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(next, ADVANCE_MS);
  }, []);

  /**
   * Walk the follow-ups she ticked, in order, then move on.
   *
   * `done` is the item just finished. Each answer has its own follow-up and
   * they are not interchangeable, so ticking two means seeing two, rather than
   * the app picking one on her behalf.
   */
  const nextBodyBeat = useCallback(
    (done?: BodyItem) => {
      const remaining = BODY_ORDER.filter(
        (i) => bodyPicks.includes(i) && (done == null || BODY_ORDER.indexOf(i) > BODY_ORDER.indexOf(done)),
      );
      setCurrent(remaining.length > 0 ? BODY_NEXT[remaining[0]] : 'make_safe');
    },
    [bodyPicks],
  );

  // Sized to the cap height of the question's first letter, so the moon reads
  // as a character on the same line rather than an illustration beside it.
  // `size` IS the sphere; the Orb's own box is 1.8x that for halo room, which
  // is why the gap below it is small: the halo already carries the spacing.
  const ASK_SIZE = 21;
  const CAP_RATIO = 0.7; // Poppins cap height
  const orbSize = Math.round(ASK_SIZE * CAP_RATIO);

  // The Orb's own idle loop normalises to a fixed ~10px radius travel at ANY
  // size, which on a 15pt sphere is most of the moon. So it is frozen (`still`)
  // and breathed from here instead: a 3% swell, slow, just enough to read as
  // alive. Steady is the point — it is the thing that is not reacting.
  const breath = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    breath.value = withRepeat(
      withTiming(1.03, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [breath, reduceMotion]);
  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: breath.value }] }));

  /**
   * The head of every card: her moon beside the phase and the question, on one
   * line. Never mirrors her — it shows the state of the session, not a
   * judgement of her, and its job is to be the steady thing in the frame while
   * she is not steady. Always full.
   */
  const head = (
    question: string,
    opts: { missing?: boolean; tone?: 'ask' | 'said' } = {},
  ) => {
    // Two registers. A QUESTION is the app asking something and carries the
    // weight of the card. A SAID line is the moon repeating her own sentence,
    // and should sit lighter: it is her words, not an instruction, and setting
    // it in the same bold as a question makes the app sound emphatic about
    // something she already knows.
    const said = opts.tone === 'said';
    return (
      <View style={styles.head}>
        <Text style={styles.phaseName}>{PHASE_LABEL[PHASES[phaseIndex]]}</Text>
        <View style={styles.askRow}>
          <Animated.View pointerEvents="none" style={[styles.moonMark, breathStyle]}>
            <Orb
              size={orbSize}
              tierRingCount={0}
              still
              hue={bodyHue(lifetimeLight)}
              brightness={moon?.fullness ?? 1}
              material={moon?.material ?? 'moonstone'}
              illum={1}
            />
          </Animated.View>
          <Text style={[styles.ask, said && styles.saidLine]}>{question}</Text>
        </View>
        {said && <View style={styles.rule} />}
        {opts.missing && <Text style={styles.todo}>copy not written yet</Text>}
      </View>
    );
  };

  // CALLED, not rendered as <Beat />. Declaring a component inside the render
  // body makes a NEW component type every render, so React unmounts and
  // remounts the whole subtree on each state change — which with a TextInput
  // inside meant every keystroke tore down the field and dismissed the
  // keyboard. Calling it inlines the JSX with no component boundary.
  const ui = crisis ? Crisis() : Beat();

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      {/* The sky: three soft ribbons drifting on 50-90 second cycles. Slow
          enough to read as almost still, because for someone dysregulated
          drifting light settles and anything that pulses does the opposite. */}
      <Aurora />
      {/* A light knock-back only. It was at 0.42, which together with the
          near-black backdrop left the aurora at roughly a tenth of its
          intended strength. The card carries its own glass, so the sky does
          not need dimming for the text to hold. */}
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <CloseButton onPress={leave} />
        </View>

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Zero, not insets.top. This view already sits below the safe-area
          // header, so adding the top inset again pushed the card a whole
          // notch-height clear of the keyboard.
          keyboardVerticalOffset={0}
        >
          <View style={styles.spacer} />

          {/* The card. One question, and only the current one. */}
          <Animated.View
            key={crisis ? 'crisis' : current}
            entering={reduceMotion ? undefined : FadeIn.duration(260)}
            exiting={reduceMotion ? undefined : FadeOut.duration(140)}
            style={styles.card}
          >
            {/* Glass, three tiers deep: liquid glass where the OS has it, an
                expo-blur fallback, then a flat wash. Sits behind the content
                and never takes touches.

                It carries the SAME radius as the card. Without that its fill
                is a square that the parent has to clip, and iOS leaks that
                clip at the corners when the parent also draws a border, which
                is what made the corners look broken. */}
            <GlassSurface intensity={22} style={styles.glass} />
            <ScrollView
              contentContainerStyle={styles.cardBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {ui.body}
            </ScrollView>
            {/* Pinned, never inside the scroll. It was scrolling out of reach
                under the keyboard, which on the entry card meant the only way
                forward was hidden. */}
            <View style={styles.cta}>{ui.cta}</View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );

  function Beat() {
    switch (current) {
      // The entry and the baseline rating share a card. The rating has to be
      // taken BEFORE the echo and the feeling word, because both of those are
      // interventions and the in-to-out delta is the only evidence the flow
      // works. On its own it was a cold second screen asking her to rate a
      // thing she had not named yet; attached to the sentence she just wrote,
      // it is one thought.
      case 'raw_entry':
        return {
          body: (
          <>
            {head(COPY.raw_entry)}
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={COPY.raw_entry_placeholder}
              placeholderTextColor="rgba(255,255,255,0.30)"
              selectionColor="rgba(196, 178, 255, 0.9)"
              multiline
              textAlignVertical="top"
              autoFocus
              inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
              accessibilityLabel="What happened"
            />
            {Platform.OS === 'ios' && (
              <InputAccessoryView nativeID={ACCESSORY_ID}>
                <View style={styles.accessory}>
                  <Pressable
                    onPress={() => {
                      tap();
                      Keyboard.dismiss();
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Done typing"
                  >
                    <Text style={styles.accessoryDone}>Done</Text>
                  </Pressable>
                </View>
              </InputAccessoryView>
            )}
          </>
          ),
          cta: (
            <BeginButton fullWidth label="Continue" disabled={!draft.trim()} onPress={send} />
          ),
        };

      // She wrote something, but not a thing that happened. Ask for the event,
      // and say which part is missing rather than just asking again.
      case 'clarify': {
        const reason: ClarifyReason =
          verdict?.kind === 'unclear' ? verdict.reason : 'no-event';
        return {
          body: (
          <>
            {head(CLARIFY_ASK[reason])}
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={CLARIFY_HINT[reason]}
              placeholderTextColor="rgba(255,255,255,0.30)"
              selectionColor="rgba(196, 178, 255, 0.9)"
              multiline
              textAlignVertical="top"
              autoFocus
              inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
              accessibilityLabel="What happened"
            />
          </>
          ),
          cta: <BeginButton fullWidth label="Continue" disabled={!draft.trim()} onPress={send} />,
        };
      }

      // FOUR map nodes on one card: acknowledge, together, naming_science and
      // feelings. They were four Continue taps for three sentences and one
      // question; as one card it reads as a single thought.
      case 'acknowledge':
        return {
          body: (
          <>
            {head(verdict?.kind === 'clear' ? verdict.echo : COPY.together, { tone: 'said' })}
            <Text style={styles.settles}>{COPY.naming_science}</Text>
            <Text style={styles.feelingsAsk}>{COPY.feelings_ask}</Text>
            <View style={styles.stack}>
              {offerFeelings(herText.current).map((f) => (
                <OptionRow
                  key={f}
                  label={f}
                  selected={feeling === f}
                  onPress={() => {
                    setFeeling(f);
                    // Straight on: `together` and `naming_science` are already
                    // on this card, so advancing into them would replay two
                    // lines she has just read.
                    pickThenGo(() => {
                      chosenFeeling.current = f;
                      setCurrent(afterFeeling());
                    });
                  }}
                />
              ))}
              {/* The field stays hidden until she asks for it. Shown always, it
                  puts a keyboard-shaped decision in front of three answers that
                  are one tap each. */}
              {!otherOpen ? (
                <OptionRow
                  label={COPY.feelings_other}
                  onPress={() => {
                    setFeeling(null);
                    setOtherOpen(true);
                  }}
                />
              ) : (
                <TextInput
                  style={styles.inputSmall}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={COPY.feelings_other_hint}
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  selectionColor="rgba(196, 178, 255, 0.9)"
                  autoFocus
                  inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                  accessibilityLabel="Your own word for it"
                />
              )}
            </View>
          </>
          ),
          // Only when she is typing. Tapping a feeling is the answer already.
          cta: otherOpen ? (
            <BeginButton
              fullWidth
              label="Continue"
              disabled={!draft.trim()}
              onPress={() => {
                chosenFeeling.current = draft.trim();
                setDraft('');
                setOtherOpen(false);
                setCurrent(afterFeeling());
              }}
            />
          ) : null,
        };

      // Sleep and movement, never food. The two branches differ because the
      // fixes differ: she can move in the next ten minutes, she cannot nap.
      case 'body_check': {
        const toggle = (i: BodyItem) =>
          setBodyPicks((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
        return {
          body: (
            <>
              {head(COPY.body_check)}
              <WhyLine>{COPY.body_why}</WhyLine>
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.body_moved}
                  selected={bodyPicks.includes('moved')}
                  onPress={() => toggle('moved')}
                />
                <OptionRow
                  label={COPY.body_eaten}
                  selected={bodyPicks.includes('eaten')}
                  onPress={() => toggle('eaten')}
                />
                <OptionRow
                  label={COPY.body_slept}
                  selected={bodyPicks.includes('slept')}
                  onPress={() => toggle('slept')}
                />
                {/* "Both fine" clears rather than being a fourth tick, so it
                    cannot be selected alongside the things it contradicts. */}
                <OptionRow
                  label={COPY.body_fine}
                  onPress={() => {
                    setBodyPicks([]);
                    pickThenGo(() => setCurrent('make_safe'));
                  }}
                />
              </View>
            </>
          ),
          // Multi-select has no single decisive tap, so this one keeps its
          // button: she is done when she says she is.
          cta: (
            <BeginButton
              fullWidth
              label="Continue"
              disabled={bodyPicks.length === 0}
              onPress={() => nextBodyBeat()}
            />
          ),
        };
      }

      // Fixable now, so it is an offer rather than a note. "Later" is a real
      // answer, not a lesser one.
      case 'body_ask_soon':
        return {
          body: (
            <>
              {head(COPY.body_move_ask)}
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.body_move_yes}
                  onPress={() => pickThenGo(() => setCurrent('body_do_now'))}
                />
                <OptionRow
                  label={COPY.body_move_later}
                  onPress={() => pickThenGo(() => nextBodyBeat('moved'))}
                />
              </View>
            </>
          ),
          cta: null,
        };

      // A bare offer, and deliberately no WhyLine. Every other choice point in
      // the flow explains itself; this one cannot, because there is no claim we
      // can make honestly. See the note in moment-copy before adding one.
      case 'body_eat':
        return {
          body: (
            <>
              {head(COPY.body_eat_ask)}
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.body_eat_yes}
                  onPress={() => pickThenGo(() => nextBodyBeat('eaten'))}
                />
                <OptionRow
                  label={COPY.body_eat_later}
                  onPress={() => pickThenGo(() => nextBodyBeat('eaten'))}
                />
              </View>
            </>
          ),
          cta: null,
        };

      // Cannot be napped away, so this only names the cost and moves on.
      case 'body_tired':
        return {
          body: head(COPY.body_tired, { tone: 'said' }),
          cta: (
            <BeginButton fullWidth label="Continue" onPress={() => nextBodyBeat('slept')} />
          ),
        };

      // Her word said back, then the split.
      // The reframe, small moments only. Big ones never reach here: a gentler
      // reading lands on a clear head and fails on a flooded one, so they go
      // straight to the body and the thinking happens later.
      case 'reframe_small': {
        // Before she picks: three readings to choose from. A PICK over a closed
        // authored set, not one line delivered at her — she decides which is
        // true, and the app does not get to assert any of them.
        if (reframePick == null) {
          return {
            body: (
              <>
                {head(COPY.reframe_small_ask)}
                <View style={styles.stack}>
                  {SETS.smallReframes.map((r) => (
                    <OptionRow key={r} label={r} onPress={() => setReframePick(r)} />
                  ))}
                </View>
              </>
            ),
            cta: null,
          };
        }

        // After she picks: the line she chose, then whether it helped.
        return {
          body: (
            <>
              {head(reframePick, { tone: 'said' })}
              <Text style={styles.feelingsAsk}>{COPY.reframe_small_check}</Text>
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.reframe_small_yes}
                  onPress={() => pickThenGo(() => setCurrent('we_good'))}
                />
                <OptionRow
                  label={COPY.reframe_small_no}
                  onPress={() => pickThenGo(() => setCurrent('body_check'))}
                />
                <OptionRow
                  label={COPY.reframe_small_bigger}
                  onPress={() => pickThenGo(() => setCurrent('body_check'))}
                />
              </View>
            </>
          ),
          cta: null,
        };
      }

      // Both readings get their own card. The opening one is the baseline for
      // the flow's only outcome measure, and it has to be taken BEFORE the echo
      // and the feeling word, because both of those are interventions.
      case 'intensity_in':
      case 'intensity_out':
        return {
          body: (
          <>
            {head(current === 'intensity_in' ? COPY.intensity_in : COPY.intensity_out)}
            <ScaleButtons
              value={intensity}
              onChange={(n) => {
                setIntensity(n);
                pickThenGo(() => {
                  setIntensity(null);
                  if (current === 'intensity_in') {
                    baseline.current = n;
                    // clarify only exists for a thin entry; a clear one skips it.
                    setCurrent(verdict?.kind === 'clear' ? 'acknowledge' : 'clarify');
                    return;
                  }
                  go(current);
                });
              }}
            />
          </>
          ),
          // The tap IS the answer. A Continue after it is a second press for
          // nothing, the same reasoning as the branch beats below.
          cta: null,
        };

      case 'options':
        return {
          body: (
            <>
              {head(COPY.options)}
              <WhyLine>{COPY.options_why}</WhyLine>
              <View style={styles.stack}>
                {/* The suppression is an array filter running before anything
                    is ranked or rendered, never a caveat added afterwards. */}
                {threeRungs(offerableActs(false)).map((a) => (
                  <View key={a.id} style={styles.optionWrap}>
                    <OptionRow label={a.label} onPress={() => go('options', 'picks')} />
                    {a.universalLine && <WhyLine>{UNIVERSAL_DV_LINE}</WhyLine>}
                  </View>
                ))}
                <OptionRow
                  label={COPY.options_more}
                  onPress={() => go('options', 'show_others')}
                />
                <OptionRow
                  label={COPY.options_none}
                  onPress={() => go('options', 'none_possible')}
                />
              </View>
            </>
          ),
          // She advances by choosing, so there is nothing to confirm.
          cta: null,
        };

      // Every beat with no bespoke card: its options if it branches, otherwise
      // a plain Continue.
      default: {
        const b = node(current).branches;
        return {
          body: (
            <>
              {/* No copy written for this beat yet. Showing the beat's name and
                  saying so is better than my placeholder sentence standing in
                  for hers: the gap should be visible while we walk it. */}
              {head(SPOKEN[current] ?? `[${current}]`, { missing: SPOKEN[current] == null })}
              {b && (
                <View style={styles.stack}>
                  {b.map((edge) => (
                    <OptionRow
                      key={edge.when}
                      label={BRANCH_LABEL[edge.when] ?? edge.when}
                      onPress={() => go(current, edge.when)}
                    />
                  ))}
                </View>
              )}
            </>
          ),
          // A branching beat advances by its options, so it needs no button.
          cta: b ? null : node(current).terminal ? (
            <BeginButton fullWidth label="Done" onPress={leave} />
          ) : (
            <BeginButton fullWidth label="Continue" onPress={() => go(current)} />
          ),
        };
      }
    }
  }

  function Crisis() {
    return {
      body: (
      <>
        <Text style={styles.ask}>{CRISIS_COPY.title}</Text>
        <Text style={styles.crisisBody}>{CRISIS_COPY.body}</Text>
        {CRISIS_COPY.lines.map((line, i) => (
          <Pressable
            key={line.label}
            style={styles.crisisLine}
            onPress={() => openCrisisLine(i)}
            accessibilityRole="button"
            accessibilityLabel={`${line.label}. ${line.detail}`}
          >
            <Text style={styles.crisisLineLabel}>{line.label}</Text>
            <Text style={styles.crisisLineDetail}>{line.detail}</Text>
          </Pressable>
        ))}
        <Text style={styles.crisisEmergency}>{CRISIS_COPY.emergency}</Text>
      </>
      ),
      cta: <BeginButton fullWidth label="Close" onPress={leave} />,
    };
  }
}

/** What each beat asks. Beats not listed fall back to their id, which is a
 *  visible reminder that the copy is not written yet. */
const SPOKEN: Partial<Record<NodeId, string>> = {
  together: COPY.together,
  naming_science: COPY.naming_science,
  feelings: COPY.feelings_ask,
  body_check: COPY.body_check,
  body_ask_soon: COPY.body_ask_soon,
  body_do_now: COPY.body_do_now,
  body_today_action: COPY.body_today_action,
  body_tired: COPY.body_tired,
  make_safe: COPY.make_safe,
  high_breathe: COPY.high_breathe,
  high_more: COPY.high_more,
  high_howlong: COPY.high_howlong,
  high_cbt_stem: COPY.high_cbt_stem,
  arousal_check: COPY.arousal_check,
  high_ladder: COPY.high_ladder,
  low_activate: COPY.low_activate,
  low_justone: COPY.low_justone,
  low_better: COPY.low_better,
  mixed_name_swing: COPY.mixed_name_swing,
  mixed_validate: COPY.mixed_validate,
  mixed_swing_real: COPY.mixed_swing_real,
  unctrl_honor: COPY.unctrl_honor,
  unctrl_warmth: COPY.unctrl_warmth,
  unctrl_act: COPY.unctrl_act,
  unctrl_door: COPY.unctrl_door,
  time_it: COPY.time_it,
  today_action: COPY.today_action,
  we_good: COPY.we_good,
  close: COPY.close,
};

/**
 * What to ask when her entry was not a thing that happened. Naming the missing
 * part matters: asking the same question again reads as the app not having
 * listened, which is the opposite of what this beat is for.
 */
type ClarifyReason = 'too-short' | 'no-event' | 'nothing-to-echo';

const CLARIFY_ASK: Record<ClarifyReason, string> = {
  'too-short': 'A bit more. What actually happened?',
  'no-event': 'And what happened, to bring that on?',
  // She wrote what she thinks he meant, or something hard about herself.
  // Neither can be said back to her, so ask for the event underneath it.
  'nothing-to-echo': 'What happened, just the part you saw or heard?',
};

/**
 * Each reason gets its own placeholder too. Sharing one made the three read as
 * the same screen asked twice, when they are three different questions with
 * three different missing pieces.
 *
 * Each one names the missing piece rather than repeating the question, because
 * the placeholder is the only place the app can say what kind of answer works.
 * The third is the most useful of the three: it tells her, without lecturing,
 * that the app works from what happened rather than from what she thinks it
 * meant — which is also why it declined to say her line back to her.
 */
const CLARIFY_HINT: Record<ClarifyReason, string> = {
  'too-short': 'One sentence is plenty. What was said or done, and by whom.',
  'no-event': 'The thing that set it off. What happened just before.',
  'nothing-to-echo': 'Just what was said or done, not what you think it meant.',
};

/** Her side of a branch, in her words rather than the graph's keys. */
const BRANCH_LABEL: Record<string, string> = {
  yes: 'yes',
  no: 'not really',
  gap: 'yes, one of those',
  tired: "i'm tired",
  all_good: 'all fine',
  now: 'i can now',
  not_now: 'not now',
  high: 'wound up',
  low: 'flat',
  mixed: 'all over the place',
  none: COPY.high_none,
  few: COPY.high_few,
  twenty: COPY.high_twenty,
  better: 'a bit',
  not_yet: 'not yet',
  swing: COPY.mixed_swing,
  real: COPY.mixed_real_label,
  small_lands: 'that helps',
  small_no: 'not really',
  big: "it's bigger than that",
  has_after: 'yes',
  no_after: 'no',
  safe: "i'm safe",
  not_safe: 'not really',
  picks: 'that one',
  show_others: COPY.options_more,
  none_possible: COPY.options_none,
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  fill: { flex: 1 },
  spacer: { flex: 1 },
  // Overlaps the card's top edge, so the moon reads as in front of it.

  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.06)',
  },
  // "The situation" is a label sitting above; the moon and the question below
  // it are one unit, so the gap here is what separates label from speech.
  head: { gap: 8 },
  // The moon sits ON the question's first line, not above the whole block, so
  // it stays put when the question wraps to two lines.
  askRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // The Orb's box is 1.8x its sphere, so it carries ~6pt of empty halo on each
  // side. The left margin pulls that back so the sphere lines up with the
  // card's text edge; the right leaves a real gap between moon and words.
  moonMark: { marginLeft: -6, marginRight: 3 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },

  // The sheet: her moon in front of it, the question inside it. Glass rather
  // than a flat panel, so the colour behind it carries through.
  // A floating glass panel rather than a sheet welded to the screen edge.
  // Every corner is rounded and the hairline runs the whole way round, so
  // there is no point where an edge starts or stops mid-curve — which is what
  // was reading as broken when the outline only covered the top.
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    overflow: 'hidden',
    // A CAP, not a height: the card is only as tall as its content, so short
    // beats still leave most of the sky showing. Raised from 78% because the
    // long cards were scrolling with Continue below the fold while a third of
    // the screen above sat empty. Growing upward costs nothing on short cards
    // and removes the scroll on nearly every one.
    maxHeight: '92%',
  },
  glass: { borderRadius: 28, borderCurve: 'continuous' },
  cardBody: { padding: 22, paddingBottom: 4, gap: 14 },
  cta: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20 },

  phaseName: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 0.3,
    color: v3.accent,
  },
  ask: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 21,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  input: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 25,
    color: 'rgba(255,255,255,0.92)',
    backgroundColor: v3.panel,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    padding: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  todo: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: v3.activated,
  },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingVertical: 9,
    backgroundColor: 'rgba(20, 17, 28, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  accessoryDone: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: v3.accent,
    letterSpacing: 0.3,
  },
  // Her own words, repeated back. Lighter than a question, and slightly
  // smaller: the app is not making a point here, it is showing it listened.
  saidLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: 0,
    color: colors.textTertiary,
  },
  // Closes the moon's line off, so what follows reads as a new thought rather
  // than more of the same sentence.
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: v3.panelBorder,
    marginTop: 14,
  },
  settles: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSubtitle,
  },
  feelingsAsk: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    lineHeight: 23,
    color: colors.textPrimary,
    marginTop: 2,
  },
  inputSmall: {
    fontFamily: 'Poppins-Light',
    fontSize: 15.5,
    color: 'rgba(255,255,255,0.92)',
    backgroundColor: v3.panel,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  stack: { gap: 10 },
  optionWrap: { gap: 6 },

  crisisBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSubtitle,
  },
  crisisLine: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  crisisLineLabel: { fontFamily: 'Poppins-Medium', fontSize: 15, color: colors.textPrimary },
  crisisLineDetail: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
  },
  crisisEmergency: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
