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
import { BackButton } from '@/components/BackButton';
import { BeginButton } from '@/components/begin-button';
import { CloseButton } from '@/components/CloseButton';
import { GlassSurface } from '@/components/glass-surface';
import { Aurora } from '@/components/moment/aurora';
import { ActivityCard } from '@/components/moment/activity-card';
import { HoldTimer } from '@/components/moment/hold-timer';
import { PhaseProgress, phaseTint } from '@/components/moment/phase-progress';
import { MoonText } from '@/components/moment/moon-text';
import { Orb } from '@/components/orb';
import { OptionRow, ScaleButtons, WhyLine } from '@/components/moment/controls';
import { CRISIS_COPY, openCrisisLine } from '@/lib/crisis-scan';
import {
  analyse,
  laneFor,
  offerFeelings,
  type Verdict,
} from '@/v3/moment-analyse';
import { foldLedger } from '@/lib/moon-light';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';
import type { MoonState } from '@/lib/moon-light';
import { bodyHue } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { advance, ENTRY, node, type NodeId, type Phase } from '@/v3/moment-flow';
import {
  BREATH_SCRIPT,
  COPY,
  offerableActs,
  SETS,
  threeRungs,
  UNIVERSAL_DV_LINE,
} from '@/v3/moment-copy';

const tap = () => Haptics.selectionAsync().catch(() => {});

/** iOS keyboard toolbar: a multiline field's return key inserts a newline, so
 *  there is no other way to dismiss it once it covers the Continue button. */
const ACCESSORY_ID = 'moment-entry-done';

/**
 * How long a tapped answer stays visible before the card moves on.
 *
 * Matches reflect.tsx, which set the house feel for this. Without the pause the
 * screen changes under her thumb and she never sees what she picked; with it,
 * the choice registers and there is a moment to notice a mistap.
 */
const ADVANCE_MS = 260;

/** The hold. Twenty real minutes: the wait is the intervention, not a loading
 *  bar, so it is not shortened. The un-shamed "i'm ready now" is the way out for
 *  anyone who does not want the full twenty, and the way past it in a demo. */
const HOLD_MS = 20 * 60 * 1000;

/** The breath: in for four, out for six, so the exhale is the longer half. The
 *  app's calm 4:6, the same one steady-break and the home orb pace. */
const BREATH_IN = 4;
const BREATH_OUT = 6;

export default function Moment() {
  const reduceMotion = useReducedMotion();

  const [current, setCurrent] = useState<NodeId>(ENTRY);
  /** The beats she has passed through, so the back button can walk them in
   *  reverse. Routing-only nodes (lane_split) never land here; the node she was
   *  actually looking at does. */
  const [history, setHistory] = useState<NodeId[]>([]);
  const [crisis, setCrisis] = useState(false);
  const [draft, setDraft] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  /** What the app decided about her sentence. Drives clarify vs acknowledge. */
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /** She chose to name it herself, so the field is showing. */
  const [otherOpen, setOtherOpen] = useState(false);
  /** The echo beat's sub-states. `streamLen` is how many characters of the
   *  reply have streamed in — the moon's words arrive the way a model streams
   *  them, not popping in whole, because an instant reply does not read as the
   *  moon having listened (and once Gemini is wired this IS the token stream).
   *  `echoOk` is her confirming the reply is right, which reveals the naming.
   *  `echoFixing` is the correction field she gets when she says it is wrong. */
  const [streamLen, setStreamLen] = useState(0);
  const [echoOk, setEchoOk] = useState(false);
  const [echoFixing, setEchoFixing] = useState(false);
  /** The reading she chose at the reframe, before we ask whether it helped. */
  const [reframePick, setReframePick] = useState<string | null>(null);
  /** The thing she picked to do during the hold, kept so the timer screen can
   *  name it back to her. */
  const [activity, setActivity] = useState<string | null>(null);
  /** Index into BREATH_SCRIPT. The guided breath walks it while she is on the
   *  breathe beat; past the end, the flow moves on. */
  const [breathStep, setBreathStep] = useState(0);
  /** She chose to act now instead of taking the twenty-minute hold. Gates the
   *  gentle "still worth twenty minutes" offer on the act menu, and only when
   *  the opening rating was high. */
  const [skippedHold, setSkippedHold] = useState(false);
  /** She picked "say it to them", so the DV line shows on its own before she
   *  drafts anything, rather than sitting under the option in the menu. */
  const [dvConfirm, setDvConfirm] = useState(false);
  /** She rated the readiness check low, so the "you don't have to respond now"
   *  line shows before the act menu. It never blocks her: the menu still
   *  follows, with "none of these feel possible" as the honest way out. */
  const [readyLow, setReadyLow] = useState(false);

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

  // How far the current state's segment is filled: the distinct beats she has
  // passed through in THIS phase over a rough main-path length. Counting graph
  // nodes would be wrong — a phase holds branches she never visits — so this
  // counts what she actually walked and caps at full. Approximate on purpose:
  // it reads as progress within the state, never a precise "N steps left".
  const PHASE_LENGTH: Record<Phase, number> = { reflect: 5, regulate: 6, react: 5 };
  const visitedInPhase = new Set(
    [...history, current].filter((id) => node(id).phase === beat.phase),
  ).size;
  const phaseFill = Math.min(1, visitedInPhase / PHASE_LENGTH[beat.phase]);
  // The one accent for this screen: whatever a control selects is tinted the
  // current state's colour, so it never fights the progress map.
  const selTint = phaseTint(beat.phase);

  // The moon's reply on the echo beat: her words carved and person-flipped when
  // the read was clear, an authored line otherwise. Derived here so the stream
  // effect and the render share one source.
  const echoText = verdict?.kind === 'clear' ? verdict.echo : COPY.together;
  const echoAi = verdict?.kind === 'clear';

  const go = useCallback((from: NodeId, key?: string) => {
    const next = advance(from, key);
    if (next == null) return;
    // `lane_split` is a routing node, not a card. She has already named the
    // feeling, so the lane is derived rather than asked: putting the question
    // on screen would be the app asking for something it was just told. The
    // node she was actually on (`from`) is what goes on the history, never the
    // routing node.
    const resolved =
      next === 'lane_split'
        ? (advance('lane_split', laneFor(chosenFeeling.current)) ?? 'options')
        : next;
    setHistory((h) => [...h, from]);
    setCurrent(resolved);
  }, []);

  /** Step back one beat. Not memoised: it closes over this render's `history`
   *  so it always pops the real top, and it is cheap. From the first beat there
   *  is nothing to go back to, so it leaves the flow — same as close. */
  const back = () => {
    tap();
    // Sub-states first: these are second screens on the SAME beat, so back
    // undoes them in place rather than jumping to the previous beat.
    if (dvConfirm) {
      setDvConfirm(false);
      return;
    }
    if (readyLow) {
      setReadyLow(false);
      return;
    }
    // Inside the echo beat: unwind the correction, then the naming, then the
    // confirm, each in place, before stepping to the previous beat.
    if (echoFixing) {
      setEchoFixing(false);
      setDraft('');
      return;
    }
    if (current === 'acknowledge' && echoOk) {
      setEchoOk(false);
      setOtherOpen(false);
      setDraft('');
      return;
    }
    if (reframePick) {
      setReframePick(null);
      return;
    }
    if (otherOpen) {
      setOtherOpen(false);
      setDraft('');
      return;
    }
    if (history.length === 0) {
      router.back();
      return;
    }
    const prev = history[history.length - 1];
    setHistory(history.slice(0, -1));
    // Sub-state that belongs to a particular beat, cleared so returning to an
    // earlier one never shows a stale pick or a half-open field.
    setReframePick(null);
    setOtherOpen(false);
    setDraft('');
    setCurrent(prev);
  };

  // Off the timer. Both the timer completing and her tapping "i'm ready now"
  // land here, so it is one stable callback: passing an inline function as the
  // timer's onComplete would re-arm the interval on every countdown tick.
  const goTimerEnd = useCallback(() => go('high_activity_context'), [go]);

  /** Arm the echo beat: fresh, unconfirmed, and "typing". Called whenever she
   *  arrives at acknowledge (or re-submits a correction). */
  const startEcho = useCallback(() => {
    setEchoOk(false);
    setEchoFixing(false);
    setStreamLen(0);
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

    // Her latest event text, kept for the feeling suggestions and the echo
    // correction prefill.
    herText.current = text;
    setVerdict(v);
    setDraft('');

    // From the entry, the rating comes next on its own card. From clarify she
    // has already rated, so she goes straight on.
    if (current === 'raw_entry') {
      setHistory((h) => [...h, 'raw_entry']);
      setCurrent('intensity_in');
      return;
    }

    // `clarify` only exists for a thin entry, so a clear verdict skips it.
    // Asking again when she has already named the thing reads as not listening.
    setHistory((h) => [...h, 'clarify']);
    if (v.kind === 'clear') {
      startEcho();
      setCurrent('acknowledge');
    } else {
      setCurrent('clarify');
    }
  }, [current, draft, startEcho]);

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

  /** Show the choice, then move. One decisive tap needs no confirming. */
  const pickThenGo = useCallback((next: () => void) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(next, ADVANCE_MS);
  }, []);

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
  const breathStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breath.value }],
  }));

  // Walk the guided breath. Each step holds for its own length — a breath in
  // for four, out for six, the intro and the counts shorter — then advances. A
  // light tick lands at the start of every inhale and exhale so she can pace it
  // with her eyes shut. Past the last step the flow moves on to the hold. The
  // ball's visual swell is gated by reduce-motion elsewhere; the copy sequence
  // and the ticks still run, so the guidance survives with motion off.
  useEffect(() => {
    if (current !== 'breathe') {
      // Rewind so the guided breath starts from the top the next time she
      // reaches it (e.g. stepping back into it). Guarded so it cannot re-fire
      // once already zero.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot reset, converges
      if (breathStep !== 0) setBreathStep(0);
      return;
    }
    const step = BREATH_SCRIPT[breathStep];
    if (step == null) {
      go('breathe');
      return;
    }
    if (step.kind === 'inhale' || step.kind === 'exhale') {
      Haptics.selectionAsync().catch(() => {});
    }
    const ms =
      step.kind === 'inhale'
        ? BREATH_IN * 1000
        : step.kind === 'exhale'
          ? BREATH_OUT * 1000
          : 1600;
    const id = setTimeout(() => setBreathStep((s) => s + 1), ms);
    return () => clearTimeout(id);
  }, [current, breathStep, go]);

  // Stream the echo in, one character at a time: a short beat before the first
  // (the moon "gathering"), then quick. Off under reduce-motion — the render
  // shows the whole line at once there. The setState is inside the timeout
  // (async), so it does not trip the in-effect rule.
  useEffect(() => {
    if (current !== 'acknowledge' || echoOk || echoFixing || reduceMotion) return;
    if (streamLen >= echoText.length) return;
    const first = streamLen === 0;
    const id = setTimeout(
      () => setStreamLen((n) => Math.min(n + 1, echoText.length)),
      first ? 350 : 22,
    );
    return () => clearTimeout(id);
  }, [current, echoOk, echoFixing, reduceMotion, streamLen, echoText]);

  /**
   * The head of every card: her moon beside the phase and the question, on one
   * line. Never mirrors her — it shows the state of the session, not a
   * judgement of her, and its job is to be the steady thing in the frame while
   * she is not steady. Always full.
   */
  const head = (
    question: string,
    opts: { missing?: boolean; tone?: 'ask' | 'said'; ai?: boolean } = {},
  ) => {
    // Two registers. A QUESTION is the app asking something and carries the
    // weight of the card. A SAID line is the moon repeating her own sentence,
    // and should sit lighter: it is her words, not an instruction, and setting
    // it in the same bold as a question makes the app sound emphatic about
    // something she already knows.
    const said = opts.tone === 'said';
    // The AI signal: when the words are the MODEL'S (the grounded echo), fill
    // them with the moon's material so they read as the moon speaking, not as
    // authored copy. Used only here, so the texture means exactly one thing.
    return (
      <View style={styles.head}>
        <View style={styles.askRow}>
          <Animated.View
            pointerEvents="none"
            style={[styles.moonMark, breathStyle]}
          >
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
          {opts.ai ? (
            <MoonText
              hue={bodyHue(lifetimeLight)}
              containerStyle={styles.askFill}
              style={[styles.ask, styles.saidLine]}
            >
              {question}
            </MoonText>
          ) : (
            <Text style={[styles.ask, said && styles.saidLine]}>
              {question}
            </Text>
          )}
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
        {/* Close only. Back lives inside the card, next to the beat it steps
            back from. */}
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
            // Direction rule: entrances ease-out (~300ms, sheet-sized), exits
            // ease-in and faster (~150ms). A crossfade, not a slide: the card is
            // one persistent surface and the beat inside it changes — continuity,
            // not travel — so a horizontal slide would imply movement that isn't.
            entering={
              reduceMotion ? undefined : FadeIn.duration(300).easing(Easing.out(Easing.quad))
            }
            exiting={
              reduceMotion ? undefined : FadeOut.duration(150).easing(Easing.in(Easing.quad))
            }
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
            {/* Card header: back and the three-state map share one row, so they
                sit on the same line and read as one piece of chrome. Back shows
                only when there is somewhere to go back to; a spacer holds the
                map's position steady when it does not. Hidden on the crisis
                screen, which has its own single way out. Pinned above the scroll
                so it stays put as the body scrolls. */}
            {!crisis && (
              <View style={styles.cardHeader}>
                {history.length > 0 ? (
                  <BackButton onPress={back} />
                ) : (
                  <View style={styles.backSpacer} />
                )}
                <View style={styles.headerProgress}>
                  <PhaseProgress current={beat.phase} fill={phaseFill} />
                </View>
              </View>
            )}
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
                inputAccessoryViewID={
                  Platform.OS === 'ios' ? ACCESSORY_ID : undefined
                }
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
            <BeginButton
              fullWidth
              label="Continue"
              disabled={!draft.trim()}
              onPress={send}
            />
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
                inputAccessoryViewID={
                  Platform.OS === 'ios' ? ACCESSORY_ID : undefined
                }
                accessibilityLabel="What happened"
              />
            </>
          ),
          cta: (
            <BeginButton
              fullWidth
              label="Continue"
              disabled={!draft.trim()}
              onPress={send}
            />
          ),
        };
      }

      // The echo, in stages (Neha 2026-07-28). The moon "types", says her words
      // back, and she confirms they are right before anything moves on. "No"
      // opens a field to say it again and re-echoes; only "yes" reveals the
      // naming (the old acknowledge card: name + feelings).
      case 'acknowledge': {
        // What has streamed in so far, and whether the stream has finished.
        const revealed = reduceMotion ? echoText : echoText.slice(0, streamLen);
        const streamDone = reduceMotion || streamLen >= echoText.length;

        // She said it was wrong: a field to say it again, then re-echo.
        if (echoFixing) {
          return {
            body: (
              <>
                {head(COPY.ack_fix)}
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
                  inputAccessoryViewID={
                    Platform.OS === 'ios' ? ACCESSORY_ID : undefined
                  }
                  accessibilityLabel="What happened"
                />
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label="Continue"
                disabled={!draft.trim()}
                onPress={() => {
                  const t = draft.trim();
                  const v = analyse(t);
                  if (v.kind === 'crisis') {
                    setCrisis(true);
                    return;
                  }
                  herText.current = t;
                  setVerdict(v);
                  setDraft('');
                  // Re-echo the correction: back to typing, then confirm again.
                  startEcho();
                }}
              />
            ),
          };
        }

        // The reply streams in; once it lands, she confirms it is right before
        // the naming appears. The confirm question and its options hold back
        // until the stream finishes, so she reads the whole line first.
        if (!echoOk) {
          return {
            body: (
              <>
                {head(revealed, { tone: 'said', ai: echoAi })}
                {streamDone && (
                  <>
                    <Text style={styles.feelingsAsk}>{COPY.ack_confirm}</Text>
                    <View style={styles.stack}>
                      <OptionRow
                        label={COPY.ack_yes}
                        index={0}
                        tint={selTint}
                        onPress={() => setEchoOk(true)}
                      />
                      <OptionRow
                        label={COPY.ack_no}
                        index={1}
                        tint={selTint}
                        onPress={() => {
                          setDraft(herText.current);
                          setEchoFixing(true);
                        }}
                      />
                    </View>
                  </>
                )}
              </>
            ),
            cta: null,
          };
        }

        // Confirmed: name the emotion. The echo is gone from this card — she
        // just confirmed it on the step before, so repeating all of it here was
        // what crowded the page. One heading (the question), one why line, then
        // the options: three type roles, room to breathe.
        return {
          body: (
            <>
              {head(COPY.feelings_ask)}
              <WhyLine>{COPY.feelings_why}</WhyLine>
              <View style={styles.stack}>
                {offerFeelings(herText.current).map((f, i) => (
                  <OptionRow
                    key={f}
                    label={f}
                    index={i}
                    tint={selTint}
                    onPress={() => {
                      chosenFeeling.current = f;
                      setHistory((h) => [...h, 'acknowledge']);
                      setCurrent('reframe_small');
                    }}
                  />
                ))}
                {/* The field stays hidden until she asks for it. Shown always, it
                    puts a keyboard-shaped decision in front of three answers that
                    are one tap each. No tint: this opens a field in place rather
                    than advancing a beat. */}
                {!otherOpen ? (
                  <OptionRow
                    label={COPY.feelings_other}
                    index={offerFeelings(herText.current).length}
                    onPress={() => setOtherOpen(true)}
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
                    inputAccessoryViewID={
                      Platform.OS === 'ios' ? ACCESSORY_ID : undefined
                    }
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
                setHistory((h) => [...h, 'acknowledge']);
                setCurrent('reframe_small');
              }}
            />
          ) : null,
        };
      }

      // The guided breath. Her own moon, grown big, IS the breath ball: it
      // swells on an inhale step, settles on an exhale, holds on the intro and
      // the counts. The copy changes with each step; a light tick marks every
      // turn. One quiet exit — leaving and finishing both land on the hold.
      case 'breathe': {
        const step =
          BREATH_SCRIPT[breathStep] ?? BREATH_SCRIPT[BREATH_SCRIPT.length - 1];
        const ballPhase =
          step.kind === 'inhale'
            ? 'inhale'
            : step.kind === 'exhale'
              ? 'exhale'
              : 'hold';
        return {
          body: (
            <>
              <View style={styles.breathStage}>
                <Orb
                  size={140}
                  tierRingCount={0}
                  phase={reduceMotion ? undefined : ballPhase}
                  phaseDuration={
                    step.kind === 'exhale' ? BREATH_OUT : BREATH_IN
                  }
                  // A wide swell on purpose: the whole point is that she can SEE
                  // the breath. Small and it is hard to tell in from out; this
                  // travels far enough to follow with a glance. Slow, so wide
                  // still reads as calm, not busy.
                  breathRange={{ min: 0.58, max: 1.42 }}
                  still={reduceMotion}
                  hue={bodyHue(lifetimeLight)}
                  brightness={moon?.fullness ?? 1}
                  material={moon?.material ?? 'moonstone'}
                  illum={1}
                />
                <Text style={styles.breathLine}>{step.text}</Text>
              </View>
              <Pressable
                onPress={() => {
                  tap();
                  go('breathe');
                }}
                hitSlop={10}
                accessibilityRole="button"
                style={styles.breathSkip}
              >
                <Text style={styles.breathSkipText}>{COPY.breathe_skip}</Text>
              </Pressable>
            </>
          ),
          cta: null,
        };
      }

      // The hold, framed as a challenge (Neha 2026-07-28): "20-Minute Challenge
      // — beat the urge to react immediately", she is ready or not. Names no
      // person: the app does not know who she is upset with unless she said so.
      case 'make_safe':
        return {
          body: (
            <>
              {head(COPY.make_safe_intro)}
              <Text style={styles.settles}>{COPY.make_safe_why}</Text>
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.make_safe_wait}
                  index={0}
                  tint={selTint}
                  onPress={() => go('make_safe', 'wait')}
                />
                <OptionRow
                  label={COPY.make_safe_now}
                  index={1}
                  tint={selTint}
                  onPress={() => {
                    setSkippedHold(true);
                    go('make_safe', 'now');
                  }}
                />
              </View>
            </>
          ),
          cta: null,
        };

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
                {/* One prompt, not two: the old "sometimes a different
                    perspective helps" framing was dropped — the question plus
                    the moon's-read label already carry it. */}
                {head(COPY.reframe_small_ask)}
                {/* The AI-written readings. The "the moon's read" label was
                    pulled 2026-07-28 (it did not sit well); the signal now rides
                    the stream-in and the per-option "suggested by the moon"
                    VoiceOver hint. Authored placeholders today, Gemini-written
                    soon. */}
                <View style={styles.stack}>
                  {SETS.smallReframes.map((r, i) => (
                    <OptionRow
                      key={r}
                      label={r}
                      index={i}
                      hint="Suggested by the moon"
                      tint={selTint}
                      onPress={() => setReframePick(r)}
                    />
                  ))}
                </View>
                {/* Her own answer, apart from the moon's readings and plainly
                    authored: "none of them are true" is a real answer, and it
                    skips the follow-up because there is no line to ask whether
                    it helped. */}
                <OptionRow
                  label={COPY.reframe_small_none}
                  index={SETS.smallReframes.length}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_no')}
                />
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
                  index={0}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_lands')}
                />
                <OptionRow
                  label={COPY.reframe_small_no}
                  index={1}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_no')}
                />
                <OptionRow
                  label={COPY.reframe_small_bigger}
                  index={2}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'big')}
                />
              </View>
            </>
          ),
          cta: null,
        };
      }

      // The opening reading, and the baseline for the flow's only outcome
      // measure. Taken BEFORE the echo and the feeling word, because both of
      // those are interventions and the delta is what the flow is measured on.
      case 'intensity_in':
        return {
          body: (
            <>
              {head(COPY.intensity_in)}
              <ScaleButtons
                value={intensity}
                onChange={(n) => {
                  setIntensity(n);
                  pickThenGo(() => {
                    setIntensity(null);
                    baseline.current = n;
                    // clarify only exists for a thin entry; a clear one skips it.
                    setHistory((h) => [...h, 'intensity_in']);
                    if (verdict?.kind === 'clear') {
                      startEcho();
                      setCurrent('acknowledge');
                    } else {
                      setCurrent('clarify');
                    }
                  });
                }}
              />
            </>
          ),
          // The tap IS the answer. A Continue after it is a second press for
          // nothing, the same reasoning as the branch beats below.
          cta: null,
        };

      // The closing reading, merged with "we good?" onto one card: the number
      // she gives IS the answer, and "not yet" is how she asks for something
      // untried. Two pages became one.
      case 'intensity_out':
        return {
          body: (
            <>
              {head(COPY.intensity_out)}
              <ScaleButtons
                value={intensity}
                onChange={(n) => {
                  setIntensity(n);
                  pickThenGo(() => {
                    setIntensity(null);
                    go('intensity_out', 'rated');
                  });
                }}
              />
              <OptionRow
                label={COPY.intensity_out_not_yet}
                onPress={() => go('intensity_out', 'not_yet')}
              />
            </>
          ),
          cta: null,
        };

      case 'options': {
        // She picked "say it to them": the DV line now gets its own screen,
        // after the choice, instead of sitting under the option before it. It
        // reads clearly here (not as a faint aside), and it reaches every woman
        // about to confront someone, which is exactly who it is for.
        if (dvConfirm) {
          return {
            body: (
              <>
                {head(COPY.options_dv_head)}
                <Text style={styles.settles}>{UNIVERSAL_DV_LINE}</Text>
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label="Continue"
                onPress={() => {
                  setDvConfirm(false);
                  go('options', 'picks');
                }}
              />
            ),
          };
        }
        // Only when the opening rating was high AND she chose to act now
        // without the hold. An offer above the acts, never a wall in front of
        // them: she can still pick any act right below it.
        const nudgeHold = skippedHold && (baseline.current ?? 0) >= 4;
        return {
          body: (
            <>
              {head(COPY.options)}
              <WhyLine>{COPY.options_why}</WhyLine>
              {nudgeHold && (
                <View style={styles.holdNudge}>
                  <Text style={styles.holdNudgeText}>
                    {COPY.options_hold_nudge}
                  </Text>
                  <OptionRow
                    label={COPY.options_hold_take}
                    tint={selTint}
                    onPress={() => {
                      // She is no longer skipping it, so the offer does not
                      // follow her back here after the hold loops round.
                      setSkippedHold(false);
                      go('options', 'take_hold');
                    }}
                  />
                </View>
              )}
              <View style={styles.stack}>
                {/* The suppression is an array filter running before anything
                    is ranked or rendered, never a caveat added afterwards. The
                    universal DV line no longer rides under the option; picking
                    "say it to them" opens it on its own screen (above). */}
                {threeRungs(offerableActs(false)).map((a, i) => (
                  <OptionRow
                    key={a.id}
                    label={a.label}
                    index={i}
                    tint={selTint}
                    onPress={() => {
                      if (a.universalLine) {
                        setDvConfirm(true);
                        return;
                      }
                      go('options', 'picks');
                    }}
                  />
                ))}
                <OptionRow
                  label={COPY.options_more}
                  index={3}
                  tint={selTint}
                  onPress={() => go('options', 'show_others')}
                />
                <OptionRow
                  label={COPY.options_none}
                  index={4}
                  tint={selTint}
                  onPress={() => go('options', 'none_possible')}
                />
              </View>
            </>
          ),
          // She advances by choosing, so there is nothing to confirm.
          cta: null,
        };
      }

      // The hold, part one: she picks a thing to do with the twenty minutes.
      // An empty wait is rehearsal, so the wait is filled, not endured. Twelve
      // authored options; the model has no job here.
      case 'high_pick_activity':
        return {
          body: (
            <>
              {head(COPY.high_pick_activity)}
              <WhyLine>{COPY.high_pick_activity_why}</WhyLine>
              <View style={styles.grid}>
                {SETS.activities.map((a, i) => (
                  <ActivityCard
                    key={a.id}
                    icon={a.icon}
                    label={a.label}
                    index={i}
                    hue={bodyHue(lifetimeLight)}
                    tint={selTint}
                    onPress={() => {
                      setActivity(a.id);
                      // Straight edge in the graph: let the table advance it,
                      // never a hardcoded next-beat.
                      go('high_pick_activity');
                    }}
                  />
                ))}
                {/* Rung 1: in-app calm activities for when moving out is too
                    much — colour a picture, or photograph the sky to fill one. */}
                <ActivityCard
                  icon="paintbrush.pointed.fill"
                  label="Colour"
                  index={SETS.activities.length}
                  hue={bodyHue(lifetimeLight)}
                  tint={selTint}
                  onPress={() => router.push('/paint')}
                />
                <ActivityCard
                  icon="camera.fill"
                  label="Sky"
                  index={SETS.activities.length + 1}
                  hue={bodyHue(lifetimeLight)}
                  tint={selTint}
                  onPress={() => router.push('/capture')}
                />
              </View>
            </>
          ),
          cta: null,
        };

      // The hold, part two: the timer runs. The safety guard sits where the
      // question goes, because it is the one instruction that matters here; her
      // chosen thing is named back underneath so the screen is about doing that,
      // not about watching a clock. "i'm ready now" is never greyed and never
      // argued with: the wait is offered, not enforced.
      case 'high_activity_context': {
        const chosen = SETS.activities.find((a) => a.id === activity);
        return {
          body: (
            <>
              <View style={styles.holdGuardBlock}>
                <Text style={styles.holdGuard}>{COPY.hold_guard}</Text>
                <Text style={styles.holdGuardBenefit}>
                  {COPY.hold_guard_benefit}
                </Text>
              </View>
              <HoldTimer
                durationMs={HOLD_MS}
                onComplete={goTimerEnd}
                hue={bodyHue(lifetimeLight)}
                material={moon?.material ?? 'moonstone'}
                brightness={moon?.fullness ?? 1}
              />
              {/* Her chosen thing, as its own card — image slot is a later
                  asset pass; for now a clean title + line. */}
              {chosen && (
                <View style={styles.holdCard}>
                  <Text style={styles.holdCardTitle}>{chosen.label}</Text>
                  <Text style={styles.holdCardDesc}>{chosen.why}</Text>
                </View>
              )}
              <Pressable
                onPress={goTimerEnd}
                hitSlop={10}
                accessibilityRole="button"
                style={styles.breathSkip}
              >
                <Text style={styles.breathSkipText}>{COPY.hold_ready}</Text>
              </Pressable>
            </>
          ),
          cta: null,
        };
      }

      // The hold is done. The one celebration in the app, and it is for a hard
      // act she completed — waiting — never for a feeling or a score.
      case 'high_timer_end':
        return {
          body: <>{head(COPY.hold_done)}</>,
          cta: (
            <BeginButton
              fullWidth
              label="Continue"
              onPress={() => go('high_timer_end')}
            />
          ),
        };

      // After the hold: she rates whether she is in a better place to react.
      // The hold was the intervention; this reads whether it landed, then goes
      // to the act menu. Not the closing delta rating — that is intensity_out.
      case 'arousal_check': {
        // A low rating never blocks her: it surfaces permission to wait, then
        // the act menu follows anyway (where "none feel possible" is the exit).
        if (readyLow) {
          return {
            body: <>{head(COPY.arousal_check_wait)}</>,
            cta: (
              <BeginButton
                fullWidth
                label="Continue"
                onPress={() => {
                  setReadyLow(false);
                  go('arousal_check');
                }}
              />
            ),
          };
        }
        return {
          body: (
            <>
              {head(COPY.arousal_check)}
              <ScaleButtons
                value={intensity}
                lowLabel={COPY.arousal_check_low}
                highLabel={COPY.arousal_check_high}
                onChange={(n) => {
                  setIntensity(n);
                  pickThenGo(() => {
                    setIntensity(null);
                    // Bottom two of five: not in the space to respond. Show the
                    // permission-to-wait line; otherwise straight to the menu.
                    if (n <= 2) {
                      setReadyLow(true);
                      return;
                    }
                    go('arousal_check');
                  });
                }}
              />
            </>
          ),
          cta: null,
        };
      }

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
              {head(SPOKEN[current] ?? `[${current}]`, {
                missing: SPOKEN[current] == null,
              })}
              {b && (
                <View style={styles.stack}>
                  {b.map((edge, i) => (
                    <OptionRow
                      key={edge.when}
                      label={BRANCH_LABEL[edge.when] ?? edge.when}
                      index={i}
                      tint={selTint}
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
            <BeginButton
              fullWidth
              label="Continue"
              onPress={() => go(current)}
            />
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
  ready_reward: COPY.ready_reward,
  unctrl_honor: COPY.unctrl_honor,
  time_it: COPY.time_it,
  today_action: COPY.today_action,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 6,
  },
  // Card header: back (or its spacer) and the three-state map on one row, above
  // the scroll so they hold their place as the beat scrolls.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  backSpacer: { width: 32, height: 32 },
  headerProgress: { flex: 1 },

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
    borderColor: 'rgba(255, 255, 255, 0.16)',
    // A real surface under the glass, so the card reads as a panel floating on
    // the aurora instead of blending into it. This is the "break" the page was
    // missing — the sky above, a defined card below.
    backgroundColor: 'rgba(10, 9, 17, 0.62)',
    overflow: 'hidden',
    // A CAP, not a height: the card is only as tall as its content, so short
    // beats still leave most of the sky showing. Raised from 78% because the
    // long cards were scrolling with Continue below the fold while a third of
    // the screen above sat empty. Growing upward costs nothing on short cards
    // and removes the scroll on nearly every one.
    maxHeight: '92%',
  },
  glass: { borderRadius: 28, borderCurve: 'continuous' },
  // One spacing unit (SP) between blocks, so the rhythm is even down the card.
  // Sections breathe; things that belong together (moon + question in `head`)
  // stay tight.
  cardBody: { padding: 22, paddingTop: 20, paddingBottom: 4, gap: 18 },
  cta: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 20 },

  // TYPE SCALE — four roles, no more (Neha 2026-07-28). Every text on a card is
  // one of these; if a new size is tempting, it is a sign two things want to be
  // one.
  //   H1     the beat's question / heading  → `ask`         (SemiBold 21)
  //   Para   her words, echoes, body        → `saidLine`    (Light 17)
  //   Micro  the why line, captions, labels → controls WhyLine / progress (11-13)
  //   Button an option                      → controls rowText (Medium 16)
  // `settles` and `feelingsAsk` are the old in-between sizes, kept only where a
  // card still stacks two prompts; retire them as those cards simplify.

  // Gives the masked AI text the same row flex the plain Text had, so it wraps
  // to the card width instead of collapsing to its content.
  askFill: { flex: 1 },
  // H1.
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
  // Two-up card grid for the hold activities: 48%-wide cards, space-between
  // gives the column gutter, rowGap the space between rows.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },

  // The breath ball's stage: the moon grown big, centred, the changing line
  // beneath it. Generous vertical room so the ball has space to swell into.
  breathStage: { alignItems: 'center', gap: 22, paddingVertical: 28 },
  breathLine: {
    fontFamily: 'Poppins-Light',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    minHeight: 60,
  },
  // The one quiet exit. Low emphasis: the breath is the point, this is just the
  // way out for anyone already steady.
  breathSkip: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  breathSkipText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },

  // The "still worth twenty minutes" offer above the acts. Set apart with a
  // faint fill so it reads as an aside, not a fourth option in the list.
  holdNudge: {
    gap: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  holdNudgeText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
  },

  // The safety guard, above the timer ball. Clear and centred — the one
  // instruction that matters here — with the benefit a lighter line under it.
  holdGuardBlock: { alignItems: 'center', gap: 4, paddingHorizontal: 8 },
  holdGuard: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  holdGuardBenefit: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: v3.textFaint,
    textAlign: 'center',
  },
  // Her chosen thing, as its own card under the timer: a title and a line, with
  // room for an image once those assets exist.
  holdCard: {
    marginTop: 4,
    padding: 16,
    borderRadius: 18,
    borderCurve: 'continuous',
    backgroundColor: v3.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    gap: 4,
  },
  holdCardTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    color: colors.textPrimary,
  },
  holdCardDesc: {
    fontFamily: 'Poppins-Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSubtitle,
  },

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
  crisisLineLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    color: colors.textPrimary,
  },
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
