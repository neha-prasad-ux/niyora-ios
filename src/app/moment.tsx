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
  Image,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  getActivitiesDone,
  markActivityDone,
  resetActivities,
  subscribeActivities,
  useActivitiesDone,
} from '@/lib/hold-activities';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CosmicBackground } from '@/components/cosmic-background';
import { CelebrationParticles } from '@/components/CelebrationParticles';
import { RingCelebration } from '@/components/RingCelebration';
import { BackButton } from '@/components/BackButton';
import { BeginButton } from '@/components/begin-button';
import { Checklist } from '@/components/checklist';
import { CloseButton } from '@/components/CloseButton';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { glass } from '@/theme/glass';
import {
  PhaseProgress,
  PHASE_STEPS,
  phaseHue,
  phaseTint,
} from '@/components/moment/phase-progress';
import { MoonText } from '@/components/moment/moon-text';
import { Orb } from '@/components/orb';
import { OptionRow, ScaleButtons, SkeletonRows, ThinkingDots, WhyLine } from '@/components/moment/controls';
import { HoldWhisper } from '@/components/moment/hold-clock-bar';
import { ActivityBall } from '@/components/moment/activity-ball';
import { resetHold } from '@/lib/hold-clock';
import { Chip } from '@/components/moment/fill-in';
import { ScratchCard } from '@/components/moment/scratch-card';
import { addPlannedAction } from '@/store/moment-plan';
import { CRISIS_COPY, openCrisisLine, scanForAbuse, DV_RESOURCE, openDvLine } from '@/lib/crisis-scan';
import {
  analyse,
  FEELING_SET,
  laneFor,
  namedFeeling,
  offerFeelings,
  matchFeelings,
  pinFeeling,
  type Verdict,
} from '@/v3/moment-analyse';
import { echo, pick, composeReadings, draftAct, revise, hasConcreteEvent } from '@/v3/moment-ai';
import { optionPlanFor, personalisedLabel } from '@/v3/option-plan';
import { getMomentProvider, classifyCrisis, lastAiTransport, type CrisisType } from '@/lib/moment-gemini';
import { foldLedger } from '@/lib/moon-light';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';
import { getPmsPrefs } from '@/store/pms-prefs';
import { isInPmsWindow } from '@/lib/pms-window';
import { scheduleActionReminder } from '@/lib/notifications';
import { MOON_DRAWINGS } from '@/components/moment/moon-drawings';
import { getRewardCount, bumpRewardCount } from '@/store/reward-progress';
import {
  clearMomentCheckpoint,
  getMomentCheckpoint,
  saveMomentCheckpoint,
} from '@/store/moment-resume';
import { useDictation } from '@/hooks/use-dictation';
import type { MoonState } from '@/lib/moon-light';
import { bodyHue } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';
import { advance, ENTRY, node, type NodeId, type Phase } from '@/v3/moment-flow';
import {
  type Act,
  BREATH_SCRIPT,
  COPY,
  MAKE_SAFE_BODY,
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

/** The breath: in for four, out for six, so the exhale is the longer half. The
 *  app's calm 4:6, the same one steady-break and the home orb pace. */
const BREATH_IN = 4;
const BREATH_OUT = 6;

// Cycle context (C2): appended to the reframe, ranking and draft prompts only
// while she is in her premenstrual window, so the read is gentler and the
// responses lower-stakes. Plain words, no jargon; it steers the model, she never
// sees it.
const CYCLE_NOTE =
  'note: she is likely in her premenstrual days, when feelings run louder than usual. Lean toward a reading like "this is the week talking and it will pass", and prefer calmer, lower-stakes responses (like holding off on big decisions today).';

// Edit with Moon (M19): quick rewrites she taps instead of typing a note. Each
// label's `note` is the instruction handed to revise(); the model rewrites the
// current draft, she still reads and sends it herself.
// C6: when her own words point to a fight with someone close, offer the
// after-fight repair (couples-reconnect) as a next step. Read from what she
// gives, never assumed. Deliberately loose: over-offering a repair path is
// cheaper than missing it.
const CONFLICT_CUES =
  /\b(fight|fought|argu(e|ed|ing|ment)|yell|scream|shout|blew up|snapped at|hung up|my (husband|wife|boyfriend|girlfriend|partner|bf|gf)|with (him|her))\b/i;

// C3: a small nod each step — the moon behind shines and the card gives one of
// these. Short, so the lift is felt without cheering over her.
const STEP_PRAISE = ['Good.', 'Nice.', 'Well done.', 'That is the work.', 'Great job.'];

// C5: the two fast body resets, now guided in-place steps (not a flash of snack
// that vanishes). Each ends on Done, marks itself finished like the other
// settling items, and earns the same shine + praise. [DRAFT] copy — Neha's pass.
const MICRO: Record<'cold' | 'shoulders', { title: string; steps: string[] }> = {
  cold: {
    title: 'Cold water',
    steps: ['Run cold water over your wrists.', 'Or splash your face.', 'Give it about 30 seconds.'],
  },
  shoulders: {
    title: 'Relax your shoulders',
    steps: ['Drop your shoulders down.', 'Unclench your jaw.', 'Take three slow breaths.'],
  },
};

const EDIT_MOVES = [
  { label: 'Shorter', note: 'make it shorter' },
  { label: 'Longer', note: 'make it a little longer' },
  { label: 'Softer', note: 'make it softer and warmer, less confrontational' },
  { label: 'More direct', note: 'make it clearer and more direct' },
] as const;

// C10: the "remind me" choices on Do-this-later. A time in the past rolls to the
// next day so the pick always schedules a future notification.
function atClock(hour: number, minute: number, dayOffset = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
const REMINDER_WHENS: { label: string; at: () => Date }[] = [
  { label: 'In 20 minutes', at: () => new Date(Date.now() + 20 * 60 * 1000) },
  { label: 'This evening', at: () => atClock(19, 0) },
  { label: 'Tomorrow morning', at: () => atClock(9, 0, 1) },
];

export default function Moment() {
  const reduceMotion = useReducedMotion();
  // The card's inner content width: window less the card's side margins (12
  // each) and the body padding (22 each). The scratch card fills it.
  const { width: winW } = useWindowDimensions();
  const cardInnerW = winW - 12 * 2 - 22 * 2;

  const [current, setCurrent] = useState<NodeId>(ENTRY);
  /** The beats she has passed through, so the back button can walk them in
   *  reverse. Routing-only nodes (lane_split) never land here; the node she was
   *  actually looking at does. */
  const [history, setHistory] = useState<NodeId[]>([]);
  const [crisis, setCrisis] = useState(false);
  // Set when the entry beat cannot reach the model while AI is on (v1: any
  // failure, including offline): the flow shows "Moon AI not working" with a
  // retry instead of degrading to authored copy. v1 is AI-required — no offline
  // flow until the authored path is built out. Crisis is handled before this and
  // is unaffected.
  const [aiError, setAiError] = useState(false);
  // The typed crisis read from the model layer, for the crisis page to route the
  // right resource. A ref (not state) because nothing renders from it yet; the
  // page rework reads crisisType.current.
  const crisisType = useRef<CrisisType | null>(null);
  // Physical-abuse disclosure detected (scanForAbuse). Does not stop the flow:
  // it de-fangs the respond menu (no acts aimed at the person) and shows a quiet
  // resource. Once set in a session it stays, so a later beat can't re-offer a
  // confront option. Never auto-reset.
  const [dvDetected, setDvDetected] = useState(false);
  // Resume: launched with ?resume=1 from Home's "Continue where you left off",
  // she picks up the saved checkpoint. `hydrating` holds the first render blank
  // until it loads, so the entry card never flashes before the saved beat lands.
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const [hydrating, setHydrating] = useState(resume === '1');
  const [draft, setDraft] = useState('');
  // One good entry example, picked once per open so it rotates across sessions
  // (partner / family / work) without crowding the screen with all three.
  const [goodExample] = useState(
    () => COPY.raw_entry_examples_good[
      Math.floor(Math.random() * COPY.raw_entry_examples_good.length)
    ],
  );
  const [intensity, setIntensity] = useState<number | null>(null);
  /** What the app decided about her sentence. Drives clarify vs acknowledge. */
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /** M6: the clarify was reached because her entry was a clear sentence but had
   *  no concrete event (the model gate), so ask for context, not "what happened". */
  const [clarifyMoreContext, setClarifyMoreContext] = useState(false);
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
  /** The Gemini provider, resolved once. NO_PROVIDER (authored fallback) unless
   *  the flag and a key are set, so the store build behaves exactly as before. */
  const [provider] = useState(getMomentProvider);
  const aiOn = provider.name !== 'none';
  /** The model's echo line when it earns one (grounded, not blocked); null falls
   *  back to the mechanical carve. `echoResolving` holds the stream while the
   *  request is in flight, so the moon "types" instead of flashing the carve. */
  const [modelEcho, setModelEcho] = useState<string | null>(null);
  const [echoResolving, setEchoResolving] = useState(false);
  /** Model orderings/readings per beat. Each defaults to null → the deterministic
   *  authored value, so nothing here can leave a beat empty. */
  const [reframeReadings, setReframeReadings] = useState<string[] | null>(null);
  /** The model's self-generation prompt, seeded as the placeholder of her own
   *  text box at the reframe so she can reach a reading herself. Empty when none. */
  const [reframeSelfPrompt, setReframeSelfPrompt] = useState('');
  /** The FULL ranked act pool from the model (null → authored order). The menu
   *  shows one-per-rung from this; `showAllActs` expands it to the rest when she
   *  taps "Show me other options". */
  const [actOrder, setActOrder] = useState<Act[] | null>(null);
  const [showAllActs, setShowAllActs] = useState(false);
  // M3: while the model is ranking/writing, show a skeleton instead of the
  // authored fallback. The fallback still shows if the call settles with nothing
  // (a real failure), so a skeleton never sticks. AI off = no wait, no skeleton.
  const [reframeLoading, setReframeLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  // The model's ranking of the feeling set (null → the deterministic offerFeelings
  // order). The AI orders the list; it never asserts one as the answer.
  const [feelingOrder, setFeelingOrder] = useState<string[] | null>(null);
  const [feelingsLoading, setFeelingsLoading] = useState(false);
  /** The reading she chose at the reframe, before we ask whether it helped. */
  const [reframePick, setReframePick] = useState<string | null>(null);
  /** Index into BREATH_SCRIPT. The guided breath walks it while she is on the
   *  breathe beat; past the end, the flow moves on. */
  const [breathStep, setBreathStep] = useState(0);
  /** Body-prep checklist on the challenge screen: which items she has ticked.
   *  A soft self-check, it does not gate the buttons below. */
  const [bodyChecks, setBodyChecks] = useState<Record<string, boolean>>({});
  // M8: body-prep is no longer a gate on the make_safe choice. When she chooses
  // to respond now, this opens the body-prep page before she goes on.
  const [bodyPrepOpen, setBodyPrepOpen] = useState(false);
  // M8: body-prep as one item in the 20-min settling list (the "wait" path).
  const [bodyPrepInList, setBodyPrepInList] = useState(false);
  // C10: "Do this later" opens a when-chooser; a pick schedules a local reminder.
  const [reminderOpen, setReminderOpen] = useState(false);
  // After she saves a move for later: a short "Nicely done" confirmation, so the
  // save is acknowledged instead of the chooser just vanishing.
  const [savedLater, setSavedLater] = useState(false);
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
  // Which settling activities she has finished, so the menu can show the checks
  // and re-render the instant an activity marks itself done.
  const activitiesDone = useActivitiesDone();
  /** The act she picked from the menu, carried to the "when" page (its label and
   *  whether "now" opens Messages). */
  const [chosenAct, setChosenAct] = useState<Act | null>(null);
  /** The draft step on the "when" page: the moon writes a start she can edit or
   *  ask to change, then sends (message act) or carries out. `actDrafting` shows
   *  the view; `actDraft` is the current, editable text; loading/revising gate
   *  the two model calls. Empty draft with no provider just never opens. */
  const [actDrafting, setActDrafting] = useState(false);
  const [actDraft, setActDraft] = useState('');
  const [actDraftLoading, setActDraftLoading] = useState(false);
  const [revising, setRevising] = useState(false);
  /** The close celebration's two stages: the wrapped gift, then the scratch
   *  card. `giftOpened` reveals the card; `revealed` is set once she has
   *  scratched enough, which surfaces the "saved to your Soul" line and Done. */
  const [giftOpened, setGiftOpened] = useState(false);
  const [revealed, setRevealed] = useState(false);
  /** The in-place guided card for a fast body reset (cold water / shoulders),
   *  opened from the settling menu; null when the menu list is showing. */
  const [microStep, setMicroStep] = useState<'cold' | 'shoulders' | null>(null);
  /** A brief bottom toast ("Added to today"), floated over the flow. */
  const [snack, setSnack] = useState<string | null>(null);
  useEffect(() => {
    if (!snack) return;
    const id = setTimeout(() => setSnack(null), 1900);
    return () => clearTimeout(id);
  }, [snack]);

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
  /** Whether today is inside her premenstrual window (C2). Loaded once on mount;
   *  gates the CYCLE_NOTE added to the reframe/ranking/draft prompts. */
  const pmsActive = useRef(false);
  /** M6: the model's read of whether her entry named a concrete event. Kicked off
   *  at raw_entry, read at the clarify decision. null = pending/unknown (never
   *  over-clarifies); false = only a mood, so ask for context. */
  const eventCheck = useRef<boolean | null>(null);
  /** The in-flight concrete-event check, so the rating step can await it rather
   *  than reading a still-pending null and waving a vague entry through. */
  const eventCheckPromise = useRef<Promise<boolean | null> | null>(null);
  // C3: counts forward steps, to rotate the per-step praise line.
  const stepN = useRef(0);
  // M9-14 reward: the gift-scratch drawings are awarded one by one IN ORDER. The
  // next index is loaded from the persisted count on mount; the reveal bumps it
  // so the next session earns the next drawing. `rewardBumped` guards a single
  // increment per session.
  const [rewardIdx, setRewardIdx] = useState(0);
  const rewardBumped = useRef(false);
  // M28: on Done the sky dims and the moon behind the card blooms + confetti.
  const [celebrating, setCelebrating] = useState(false);
  // Speak-to-type on the entry: each finished phrase appends to the draft. The
  // suppress ref lets `send` fold the in-progress phrase itself (so she can send
  // mid-dictation without stopping the mic first) and drop the duplicate final
  // result the recognizer emits when we stop it on that send.
  const dictationSuppress = useRef(false);
  const dictation = useDictation((t) => {
    if (dictationSuppress.current) {
      dictationSuppress.current = false;
      return;
    }
    setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t);
  });
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
  // A clear verdict with an empty echo is the `rephrase` case: she said plenty,
  // there is no carve, so the authored line stands unless the model earns one.
  const carveEcho = (verdict?.kind === 'clear' && verdict.echo) || COPY.together;
  const echoText = modelEcho ?? carveEcho;
  const echoAi = echoText !== COPY.together;

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
    // C3: a small lift each step — the moon behind shines and the card nods.
    stepN.current += 1;
    moonBloom.value = withSequence(withTiming(0.45, { duration: 220 }), withTiming(0, { duration: 720 }));
    setSnack(STEP_PRAISE[stepN.current % STEP_PRAISE.length]);
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
    // In-place second screens on the settling menu: a micro reset (cold water /
    // shoulders), the body-prep checklist (either entry point), or the reminder
    // chooser. Back closes the sub-screen and stays on the beat — without these
    // guards it fell through and popped a whole beat too, jumping two screens.
    if (microStep) {
      setMicroStep(null);
      return;
    }
    if (bodyPrepOpen) {
      setBodyPrepOpen(false);
      return;
    }
    if (bodyPrepInList) {
      setBodyPrepInList(false);
      return;
    }
    if (reminderOpen) {
      setReminderOpen(false);
      return;
    }
    // The celebration's stages are second screens on the close beat: back
    // unwinds the scratch card to the gift before leaving the beat.
    if (current === 'close' && giftOpened) {
      setRevealed(false);
      setGiftOpened(false);
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
    setReframeReadings(null);
    setReframeSelfPrompt('');
    setClarifyMoreContext(false);
    setBodyPrepOpen(false);
    setBodyPrepInList(false);
    setMicroStep(null);
    setReminderOpen(false);
    setSavedLater(false);
    // NOT actOrder: the ranked options are kept, so stepping back to the menu
    // shows the SAME three in the same order, not a fresh model shuffle. It is
    // reset only when the feeling it is ranked on actually changes (chooseFeeling).
    // The expand DOES collapse, so the menu returns to its three.
    setShowAllActs(false);
    setActDrafting(false);
    setActDraft('');
    setOtherOpen(false);
    setDraft('');
    setCurrent(prev);
  };

  /** Arm the echo beat: fresh, unconfirmed, and "typing". Called whenever she
   *  arrives at acknowledge (or re-submits a correction). */
  const startEcho = useCallback(() => {
    setEchoOk(false);
    setEchoFixing(false);
    setStreamLen(0);
    setModelEcho(null);
    setFeelingOrder(null);
    setAiError(false);
    if (!aiOn) return;
    const her = herText.current.trim();
    if (!her) return;
    // Ask the model to say her words back. echo() vets the reply (grounded, not
    // a self-attack) and returns via 'model' only when it earns the screen;
    // anything else keeps the carve. The stream holds until this settles.
    setEchoResolving(true);
    echo(provider, 'acknowledge', her)
      .then((r) => {
        setModelEcho(r.via === 'model' ? r.text : null);
        // AI health gate at the entry beat. v1 is AI-required: if the model could
        // not be reached AT ALL — timeout, HTTP error, empty, OR offline — show the
        // "Moon AI not working" state and let her retry, rather than degrading to
        // authored copy. (Transport 'ok' but a line rejected for grounding is NOT a
        // failure: the model worked, we just used the safe carve.) The offline
        // floor comes back when the authored path is built out; until then, no
        // offline flow.
        const t = lastAiTransport();
        if (t === 'fail' || t === 'offline') setAiError(true);
      })
      .catch(() => {})
      .finally(() => setEchoResolving(false));
  }, [aiOn, provider]);

  // Resume, once, on mount: restore the carried state and land on the saved
  // beat. Only the narrative state is restored; per-beat UI re-arms itself (an
  // acknowledge landing re-runs the echo). Nothing saved → just render fresh.
  useEffect(() => {
    if (resume !== '1') return;
    let alive = true;
    getMomentCheckpoint()
      .then((cp) => {
        if (!alive || !cp) return;
        herText.current = cp.herText;
        // Re-derive the abuse flag from her saved text, so resuming into the
        // respond step never loses the suppression (the flag itself isn't stored).
        if (scanForAbuse(cp.herText)) setDvDetected(true);
        chosenFeeling.current = cp.chosenFeeling;
        baseline.current = cp.baseline;
        setVerdict(cp.verdict);
        setChosenAct(cp.chosenAct);
        setSkippedHold(cp.skippedHold);
        setReadyLow(cp.readyLow);
        setHistory(cp.history);
        setCurrent(cp.current);
        if (cp.current === 'acknowledge') startEcho();
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrating(false);
      });
    return () => {
      alive = false;
    };
  }, [resume, startEcho]);

  // Persist a resume checkpoint as she moves through the flow, so leaving mid-way
  // can be picked up from Home. Entry and the ended states never save: there is
  // nothing to resume before she has spoken, and a finished or crisis session
  // must not offer one. This is the one thing the otherwise-ephemeral flow keeps,
  // and only until the session ends.
  useEffect(() => {
    if (hydrating) return;
    if (crisis || node(current).terminal) {
      clearMomentCheckpoint().catch(() => {});
      return;
    }
    if (current === ENTRY) return;
    saveMomentCheckpoint({
      current,
      history,
      herText: herText.current,
      chosenFeeling: chosenFeeling.current,
      baseline: baseline.current,
      verdict,
      chosenAct,
      skippedHold,
      readyLow,
    }).catch(() => {});
  }, [current, history, crisis, verdict, chosenAct, skippedHold, readyLow, hydrating]);

  /** Whether picking this act opens a personalised "what to do" draft. EVERY act
   *  now gets one when the model is on (Neha 2026-08-01: every option should
   *  explain what to do, including a self / let-it-go move). With no provider,
   *  only a message act opens the (blank) draft to share; the rest have nothing to
   *  compose and go straight on. */
  const wantsDraft = useCallback(
    (a: Act | null) => a != null && (aiOn || a.channel === 'message'),
    [aiOn],
  );

  /** Open the draft view and ask the moon for a start. Null (or no provider)
   *  leaves the field empty, which reads as "write your own". */
  const openActDraft = useCallback(
    (a: Act) => {
      setActDrafting(true);
      setActDraft('');
      setActDraftLoading(true);
      draftAct(provider, herText.current.trim(), chosenFeeling.current, personalisedLabel(a, herText.current), pmsActive.current ? CYCLE_NOTE : undefined)
        .then((t) => setActDraft(t ?? ''))
        .catch(() => {})
        .finally(() => setActDraftLoading(false));
    },
    [provider],
  );

  /** Edit with Moon: hand the current draft and a tapped instruction (shorter,
   *  softer...) back for a rewrite. */
  const reviseActDraft = useCallback(
    (note: string) => {
      if (!note.trim() || !actDraft.trim() || revising) return;
      tap();
      setRevising(true);
      revise(provider, actDraft, note)
        .then((t) => {
          if (t) setActDraft(t);
        })
        .catch(() => {})
        .finally(() => setRevising(false));
    },
    [provider, actDraft, revising],
  );

  /** Leave the draft view, clearing its state, without advancing the beat. */
  const closeActDraft = useCallback(() => {
    setActDrafting(false);
    setActDraft('');
  }, []);

  // M18/M25: picking a response goes straight into doing it, no Now/Later/Try-
  // another page in between (you cannot judge now-vs-later before you see the
  // task). It opens the personalised "what to do" editor; only a no-provider
  // act with nothing to compose skips to the closing rating.
  const beginAct = (a: Act | null) => {
    if (!a) return;
    if (wantsDraft(a)) {
      openActDraft(a);
      go('options', 'picks');
    } else {
      // No provider and nothing to compose: straight to the sendoff.
      setHistory((h) => [...h, 'options']);
      setCurrent('sendoff');
    }
  };

  // C10: park the move on Today and, if she picked a time, schedule a local
  // reminder. A denied permission (or no time) just saves it, no reminder.
  const saveForLater = async (date: Date | null) => {
    const a = chosenAct;
    // Keep the drafted text with the parked move, so the home list can reopen the
    // exact task she saved, not just its label.
    const text = actDraft.trim();
    if (a) addPlannedAction(a.label, text || undefined).catch(() => {});
    if (date) {
      await scheduleActionReminder(
        a ? `You saved "${a.label}" for later.` : 'A response you saved is waiting.',
        date,
      );
    }
    setReminderOpen(false);
    closeActDraft();
    // Show the "Nicely done" confirmation in place; Continue advances the flow.
    setSavedLater(true);
  };

  const send = useCallback(() => {
    // Fold any in-progress dictation into the text and stop the mic, so she can
    // send in one tap without turning the speaker off first (Neha 2026-08-02).
    // Suppress the duplicate final phrase the recognizer emits on that stop.
    const spoken = dictation.partial.trim();
    const live =
      dictation.listening && spoken ? (draft.trim() ? draft.trim() + ' ' : '') + spoken : draft;
    const text = live.trim();
    if (!text) return;
    if (dictation.listening) {
      dictationSuppress.current = spoken.length > 0;
      dictation.toggle();
    }
    tap();

    // One call decides all three routes. The crisis scan runs inside it, on her
    // raw text, before anything else touches the string.
    const v = analyse(text);
    if (v.kind === 'crisis') {
      setCrisis(true);
      return;
    }

    // Physical-abuse disclosure: does NOT stop the flow (she keeps the reflect/
    // regulate help), but from here the respond menu drops every act aimed at the
    // person and a quiet resource is shown. Runs on her raw text, before any model
    // call. Latches on: once true in a session it never flips back.
    if (scanForAbuse(text)) setDvDetected(true);

    // Model crisis layer, behind the keyword floor above. Escalate-only and async
    // so it never blocks her send: if it catches what the keywords missed, it
    // pulls her to the crisis screen a beat later. classifyCrisis is a no-op when
    // AI is off, and only an ACUTE read stops the flow (a historical disclosure
    // continues). Recall-first: on any doubt the model returns crisis.
    classifyCrisis(text)
      .then((r) => {
        if (r?.isCrisisMode && r.acuity === 'acute') {
          crisisType.current = r.crisisType;
          setCrisis(true);
        }
      })
      .catch(() => {});

    // Her latest event text, kept for the feeling suggestions and the echo
    // correction prefill.
    herText.current = text;
    setVerdict(v);
    setDraft('');

    // She should only say how big it feels once we understand what happened, so
    // a thin entry clarifies BEFORE the rating (Neha 2026-08-01). A clear entry
    // rates straight away; the rating stays BEFORE acknowledge, which is the beat
    // being measured, so the in-to-out delta still means something.
    if (current === 'raw_entry') {
      setHistory((h) => [...h, 'raw_entry']);
      if (v.kind !== 'clear') {
        setClarifyMoreContext(false);
        setCurrent('clarify');
        return;
      }
      // M6: for a clear sentence, ask the model in the background whether it holds
      // a concrete event, while she rates. If it says no, the rating card routes
      // her to clarify for context. Null (pending/off/failed) never clarifies.
      // SKIP it for the rephrase case (empty echo): she already wrote plenty, so
      // "no concrete event" must not send her back to "what happened".
      eventCheck.current = null;
      eventCheckPromise.current = null;
      if (aiOn && v.echo) {
        const p = hasConcreteEvent(provider, text);
        eventCheckPromise.current = p;
        p.then((r) => {
          eventCheck.current = r;
        }).catch(() => {});
      }
      setCurrent('intensity_in');
      return;
    }

    // From clarify. She has given the context now, so the rating comes next —
    // unless she has already rated (the M6 path clarifies AFTER rating), in which
    // case go straight to the echo. Still nothing concrete: ask once more.
    setHistory((h) => [...h, 'clarify']);
    if (v.kind !== 'clear') {
      setClarifyMoreContext(false);
      setCurrent('clarify');
    } else if (baseline.current == null) {
      setCurrent('intensity_in');
    } else {
      startEcho();
      setCurrent('acknowledge');
    }
  }, [current, draft, startEcho, aiOn, provider, dictation]);

  const leave = useCallback(() => {
    tap();
    resetHold(); // don't leak an expired hold clock into the next moment
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

  // M28: the moon's bloom on the finish. 0 at rest; on Done it eases to 1, a
  // gentle swell and brighten of the moon behind the card.
  const moonBloom = useSharedValue(0);
  const moonBloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + moonBloom.value * (reduceMotion ? 0 : 0.14) }],
    opacity: 0.8 + moonBloom.value * 0.2,
  }));

  // The reward beat: the moon behind the card swells and brightens, and a short
  // line of praise floats up. Fired on every forward step (in `go`) and, via the
  // listener below, on every settling activity she finishes.
  const rewardShine = useCallback(
    (msg: string) => {
      moonBloom.value = withSequence(withTiming(0.45, { duration: 220 }), withTiming(0, { duration: 720 }));
      setSnack(msg);
    },
    [moonBloom],
  );

  // The finish: sky dims, moon blooms, burst fires, then out. Fired ONLY by the
  // final reward "Done" (Neha 2026-08-02: the celebration is earned by finishing;
  // closing early via the X never celebrates).
  const finishAndLeave = useCallback(() => {
    tap();
    setCelebrating(true);
    moonBloom.value = withTiming(1, { duration: 900 });
    setTimeout(leave, 1600);
  }, [leave, moonBloom]);

  // C5: reward each completed settling activity, not just beat advances. The
  // done-set lives outside React (an activity screen marks itself done on its own
  // route), so we listen to it and shine the instant it grows — "I don't see a
  // reward for finishing an action" (Neha). Set-state is in the emitted callback,
  // not the effect body, so it never runs on mount.
  useEffect(() => {
    let prev = getActivitiesDone().size;
    return subscribeActivities(() => {
      const n = getActivitiesDone().size;
      if (n > prev) rewardShine('Nicely done.');
      prev = n;
    });
  }, [rewardShine]);

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
    // Hold at zero while the model is still answering, so she sees the moon
    // gathering rather than the carve streaming and then being replaced.
    if (echoResolving) return;
    if (streamLen >= echoText.length) return;
    const first = streamLen === 0;
    const id = setTimeout(
      () => setStreamLen((n) => Math.min(n + 1, echoText.length)),
      first ? 350 : 22,
    );
    return () => clearTimeout(id);
  }, [current, echoOk, echoFixing, reduceMotion, streamLen, echoText, echoResolving]);

  // Feelings PICK: the model RANKS the closed feeling set for her text (most
  // likely first), but it never asserts one as the answer — the screen stays a
  // neutral "which feeling is strongest?" picker she chooses from (Neha
  // 2026-08-01). Null keeps the deterministic offerFeelings order.
  useEffect(() => {
    if (!aiOn || !echoOk || current !== 'acknowledge' || feelingOrder) return;
    const her = herText.current.trim();
    if (!her) return;
    let alive = true;
    setFeelingsLoading(true);
    pick(provider, 'feelings', her, FEELING_SET, 3, (f) => f.label)
      .then((r) => {
        // Pin a feeling she named outright back to the top: the model reorder is
        // free to rank the rest, never to bury the word she actually wrote.
        if (alive) setFeelingOrder(pinFeeling(namedFeeling(her), r.items.map((f) => f.label)));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setFeelingsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, echoOk, current, feelingOrder, provider]);

  // M9-14: load which reward drawing is next (persisted order) on mount.
  useEffect(() => {
    let alive = true;
    getRewardCount()
      .then((n) => {
        if (alive) setRewardIdx(n);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Cycle context (C2): read her PMS window once on mount. A gentler reframe and
  // lower-stakes options fit while she is premenstrual; off otherwise.
  useEffect(() => {
    let alive = true;
    getPmsPrefs()
      .then((p) => {
        if (alive) {
          pmsActive.current = p.pmsMode && isInPmsWindow(p.lastPeriodStart, p.cycleLength, new Date());
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Reframe COMPOSE: gentle readings of the same situation. Null → authored
  // smallReframes. This is a draft she rules true or false, so it may add words.
  useEffect(() => {
    if (!aiOn || current !== 'reframe_small' || reframeReadings) return;
    const her = herText.current.trim();
    if (!her) return;
    // No CYCLE_NOTE here, on purpose. It steers options and drafts toward
    // lower-stakes moves, which is fine — but as a REFRAME reading ("this is the
    // week talking") it becomes a claim she is asked to endorse, and against a
    // real grievance that reads as "it's just your hormones". The cycle steer
    // stays on the act beats; the reframe never explains her feeling away.
    const user = `she wrote: "${her}"\nshe feels: ${chosenFeeling.current || 'upset'}`;
    let alive = true;
    setReframeLoading(true);
    composeReadings(provider, user)
      .then((r) => {
        if (!alive || !r) return; // null = failure → authored smallReframes stand
        if (r.readings.length === 0) {
          // The model deliberately offered nothing to loosen: a real fear, grief,
          // harm, or diffuse mood. Skip the reframe rather than show generic
          // small-reframes that would trivialise a serious moment. small_no routes
          // to the breath, which is the right move for a real worry.
          go('reframe_small', 'small_no');
          return;
        }
        setReframeReadings(r.readings);
        setReframeSelfPrompt(r.selfPrompt);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReframeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, current, reframeReadings, provider, go]);

  // Options PICK: rank the acts, but keep the safety invariant that one direct,
  // one prep and one self are always offered together. The model only sets which
  // act wins each rung and their order; it never removes a rung.
  useEffect(() => {
    if (!aiOn || current !== 'options' || actOrder) return;
    const her = herText.current.trim();
    if (!her) return;
    const pool = offerableActs(dvDetected);
    const cycle = pmsActive.current ? `\n${CYCLE_NOTE}` : '';
    let alive = true;
    setOptionsLoading(true);
    pick(provider, 'options', `${her}\nshe feels: ${chosenFeeling.current}${cycle}`, pool, pool.length, (a) => a.label)
      .then((r) => {
        if (!alive) return;
        // Store the FULL ranked pool; the menu shows one per rung (threeRungs)
        // and "show other options" reveals the rest. Only accept a ranking that
        // still yields the one-direct/one-prep/one-self triad, else keep authored.
        if (threeRungs(r.items).length === 3) setActOrder(r.items);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setOptionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, current, actOrder, provider, dvDetected]);

  /**
   * The head of every card: her moon beside the phase and the question, on one
   * line. Never mirrors her — it shows the state of the session, not a
   * judgement of her, and its job is to be the steady thing in the frame while
   * she is not steady. Always full.
   */
  const head = (
    question: string,
    opts: { missing?: boolean; tone?: 'ask' | 'said'; ai?: boolean; thinking?: boolean } = {},
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
          {opts.thinking ? (
            // The moon is gathering her words: three dots beside it, so the wait
            // reads as the model working, not a blank card.
            <View style={styles.askFill}>
              <ThinkingDots />
            </View>
          ) : opts.ai ? (
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

  /**
   * The chat-style composer used by every typing beat: a rounded dark field with
   * the controls docked in a bottom bar inside it — an optional mic on the left,
   * a small circular send arrow on the right (violet when there is text, muted
   * when empty). This replaces the full-width "Continue" button, which read as a
   * wall across the card; a corner send icon is the pattern from any chat app and
   * keeps the field itself the focus. Like `head`, this is CALLED inline (not a
   * <Component/>), so the TextInput is never torn down between keystrokes.
   */
  const entryField = (opts: {
    placeholder: string;
    onSend: () => void;
    withMic?: boolean;
    a11yLabel?: string;
    // Whether to raise the keyboard on mount. On for the beats whose whole job is
    // typing (entry, clarify); OFF where the field is a secondary option that
    // shouldn't cover the screen until she taps it (the reframe "your own read").
    autoFocus?: boolean;
  }) => {
    // Enabled while she is still speaking too, so she never has to tap the mic
    // off before she can send (Neha 2026-08-02).
    const canSend =
      draft.trim().length > 0 ||
      (!!opts.withMic && dictation.listening && dictation.partial.trim().length > 0);
    return (
      <View style={styles.composer}>
        <TextInput
          style={styles.composerInput}
          // While dictating, show the live interim words appended to what she has
          // so far, so text appears AS she speaks (proof the mic is on). On a
          // final phrase the hook commits it to `draft` and clears the partial.
          value={
            opts.withMic && dictation.listening && dictation.partial
              ? (draft.trim() ? draft.trim() + ' ' : '') + dictation.partial
              : draft
          }
          onChangeText={setDraft}
          // While the mic is live the field is read-only: dictation owns the
          // buffer, so a stray keyboard tap can't write the live text back in and
          // compound it. Tap the mic to stop, then type. (End users will do both.)
          editable={!(opts.withMic && dictation.listening)}
          placeholder={opts.placeholder}
          placeholderTextColor="rgba(255,255,255,0.30)"
          selectionColor="rgba(196, 178, 255, 0.9)"
          multiline
          textAlignVertical="top"
          autoFocus={opts.autoFocus ?? true}
          inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
          accessibilityLabel={opts.a11yLabel ?? 'What happened'}
        />
        <View style={styles.composerBar}>
          {opts.withMic ? (
            <Pressable
              onPress={() => {
                tap();
                // Starting to listen: drop the keyboard so she isn't tempted to
                // type into a field the mic now owns, and clear any stale suppress
                // flag so a fresh dictation's first phrase isn't swallowed.
                if (!dictation.listening) {
                  dictationSuppress.current = false;
                  Keyboard.dismiss();
                }
                dictation.toggle();
              }}
              hitSlop={8}
              style={styles.composerMic}
              accessibilityRole="button"
              accessibilityLabel={dictation.listening ? 'Stop dictation' : 'Speak instead of typing'}
            >
              <SymbolView
                name={dictation.listening ? 'mic.fill' : 'mic'}
                size={22}
                tintColor={dictation.listening ? '#F2A2C0' : 'rgba(255,255,255,0.55)'}
              />
            </Pressable>
          ) : null}
          <View style={styles.composerSpace} />
          <Pressable
            onPress={() => {
              if (!canSend) return;
              opts.onSend();
            }}
            disabled={!canSend}
            style={[styles.sendBtn, !canSend && styles.sendBtnOff]}
            accessibilityRole="button"
            accessibilityLabel="Send"
            accessibilityState={{ disabled: !canSend }}
          >
            <SymbolView
              name="arrow.up"
              size={20}
              weight="semibold"
              tintColor={canSend ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  // CALLED, not rendered as <Beat />. Declaring a component inside the render
  // body makes a NEW component type every render, so React unmounts and
  // remounts the whole subtree on each state change — which with a TextInput
  // inside meant every keystroke tore down the field and dismissed the
  // keyboard. Calling it inlines the JSX with no component boundary.
  const ui = crisis ? Crisis() : hydrating ? { body: null, cta: null } : Beat();

  // A "composer beat" is a typing screen whose chat-style field lives in the
  // pinned CTA slot (raw_entry / clarify / the acknowledge correction). On these
  // the scroll GROWS so the composer sticks to the bottom like a chat bar, with
  // the speaker/question at the top. Every other beat lets the scroll HUG its
  // content, so the body and its button stay grouped together instead of the
  // button being pinned a whole screen away below.
  const composerBeat =
    !crisis && (current === 'raw_entry' || current === 'clarify' || (current === 'acknowledge' && echoFixing));

  return (
    <View style={styles.root}>
      {/* The flow now happens in FRONT of Home: same cosmic sky, and the moon
          behind the card (M28), instead of the old aurora. */}
      <CosmicBackground />
      {/* The moon sits BEHIND the full-screen frosted card, so it always reads
          as a soft blurred glow through the glass — never the raw sharp moon
          exposed on bare sky. The card filling the screen is what keeps it
          covered; that (not hiding the moon) is what fixed the earlier "big raw
          moon below a short card". It blooms brighter on the finish. */}
      <View style={styles.moonLayer} pointerEvents="none">
        <Animated.View style={moonBloomStyle}>
          <Orb
            size={260}
            still
            warmHalo
            hue={bodyHue(lifetimeLight)}
            brightness={moon?.fullness ?? 1}
            illum={moon?.fullness ?? 1}
            material={moon?.material ?? 'moonstone'}
          />
        </Animated.View>
      </View>
      {/* On the finish the sky dims so the moon and the burst carry the moment. */}
      <View style={[styles.scrim, celebrating && styles.scrimDim]} pointerEvents="none" />
      {/* SMALL TASKS: a brief snow flurry while the "nice / well done" toast is up
          (each step, each finished settling activity). Lighter than the finish
          burst, never at the same time as it. */}
      {!!snack && !celebrating && <CelebrationParticles style={styles.confetti} />}

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* Close only. Back lives inside the card, next to the beat it steps
            back from. */}
        <View style={styles.header}>
          <CloseButton onPress={leave} />
        </View>

        {/* The keyboard "Done" bar, mounted ONCE for the whole screen: every
            composer's multiline field references this ACCESSORY_ID, and its
            return key inserts a newline, so this is the only way to dismiss the
            keyboard. Hoisted here rather than per-beat so two fields never
            register the same nativeID during a beat crossfade. */}
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

        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Zero, not insets.top. This view already sits below the safe-area
          // header, so adding the top inset again pushed the card a whole
          // notch-height clear of the keyboard.
          keyboardVerticalOffset={0}
        >
          {/* The card is ONE persistent surface. The glass panel and the
              progress header never remount as the beat changes, so they hold
              steady instead of blinking, and the bar fills continuously rather
              than resetting. `layout` eases the card's height and position as
              the content grows or shrinks, so pages resize INTO each other
              instead of snapping. Only the body and the button crossfade
              (below) — a dissolve, not a slide: the card is continuous and only
              what it says changes. */}
          <Animated.View
            style={styles.card}
            layout={
              reduceMotion
                ? undefined
                : LinearTransition.duration(300).easing(Easing.inOut(Easing.quad))
            }
          >
            {/* The SAME glass as Home (now.tsx), not the shared GlassSurface:
                an expo-blur frost, a light neutral-charcoal tint (NOT an opaque
                fill), and a top-left gloss sheen. The moon behind refracts
                through, so a session reads with Home's exact texture instead of
                the purpler liquid-glass look. Clipped to the card's rounded
                corners by its overflow:hidden; never takes touches. */}
            <BlurView intensity={30} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={styles.glassTint} />
            <LinearGradient
              colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'transparent']}
              locations={[0, 0.28, 0.62]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            {/* Card header: back and the three-state map share one row, so they
                sit on the same line and read as one piece of chrome. Back shows
                only when there is somewhere to go back to; a spacer holds the
                map's position steady when it does not. Hidden on the crisis
                screen, which has its own single way out. Pinned above the scroll
                so it stays put as the body scrolls. Hidden on the intro too:
                the three preview cards ARE the phase map there, so the thin bar
                would only repeat them. */}
            {!crisis && current !== 'intro' && (
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
              style={[styles.scroll, composerBeat && styles.scrollGrow]}
              contentContainerStyle={styles.cardBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Only the beat's own content crossfades. Keyed on the beat, so
                  the old words dissolve out as the new ones dissolve in over the
                  same, still panel. */}
              <Animated.View
                key={crisis ? 'crisis' : current}
                // The card body's gap lives HERE now, not on the scroll
                // container: this wrapper is the scroll's only child, so the
                // gap between the moon/question, the why line and the options
                // has to be on the wrapper or every block collapses together.
                style={styles.beatBody}
                entering={
                  reduceMotion ? undefined : FadeIn.duration(240).easing(Easing.out(Easing.quad))
                }
                exiting={
                  reduceMotion ? undefined : FadeOut.duration(160).easing(Easing.in(Easing.quad))
                }
              >
                {ui.body}
              </Animated.View>
            </ScrollView>
            {/* Pinned, never inside the scroll. It was scrolling out of reach
                under the keyboard, which on the entry card meant the only way
                forward was hidden. Crossfades with the body so the button does
                not pop while the words dissolve. */}
            <View style={styles.cta}>
              <Animated.View
                key={(crisis ? 'crisis' : current) + '-cta'}
                entering={
                  reduceMotion ? undefined : FadeIn.duration(240).easing(Easing.out(Easing.quad))
                }
              >
                {ui.cta}
              </Animated.View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* THE FINISH: a big one-shot burst — bloom + sunburst + sparks flying out
          from the moon, in her moon's hue. Painted ABOVE the frosted card (not
          behind it), so the glass never mutes the payoff. pointerEvents:none via
          its own absoluteFill root, so the card underneath stays tappable. */}
      {celebrating && (
        <RingCelebration hue={bodyHue(lifetimeLight)} originYFraction={0.32} />
      )}

      {/* A brief confirmation toast, floated at the bottom over the flow. Non-
          interactive: it says what happened, it is not a control. */}
      {snack && (
        <Animated.View
          style={styles.snackbarWrap}
          pointerEvents="none"
          entering={reduceMotion ? undefined : FadeInDown.duration(220)}
          exiting={reduceMotion ? undefined : FadeOut.duration(260)}
        >
          <View style={styles.snackbar}>
            <SymbolView name="checkmark.circle.fill" size={17} tintColor={v3.accent} />
            <Text style={styles.snackText}>{snack}</Text>
          </View>
        </Animated.View>
      )}
    </View>
  );

  function Beat() {
    // Body-prep gate: all three self-checks ticked before the challenge proceeds.
    const bodyReady = MAKE_SAFE_BODY.every((it) => bodyChecks[it.id]);
    switch (current) {
      // The welcome: the three states as cards in their own flow colours, so she
      // sees the shape before the first question — three known chapters, not an
      // open-ended chat. Signed "with Moon AI"; "Think with me" opens the flow.
      case 'intro':
        return {
          body: (
            <View style={styles.introWrap}>
              <View style={styles.introLead}>
                <Text style={styles.introHead}>{COPY.intro_head}</Text>
                <Text style={styles.introSub}>{COPY.intro_lead}</Text>
              </View>

              {/* The three states as a connected stepper. A faint spine runs
                  behind the nodes; each step drops in one after another, so the
                  path appears to build rather than arrive all at once. Colours
                  are the flow's own — the same three the progress bar uses. */}
              <View style={styles.introSteps}>
                <View style={styles.introSpine} pointerEvents="none" />
                {PHASE_STEPS.map((s, i) => {
                  const tint = phaseTint(s.phase);
                  const hue = phaseHue(s.phase);
                  return (
                    <Animated.View
                      key={s.phase}
                      style={styles.introRow}
                      entering={
                        reduceMotion
                          ? undefined
                          : FadeInDown.delay(140 + i * 160)
                              .duration(360)
                              .easing(Easing.out(Easing.quad))
                      }
                    >
                      <View style={styles.introRail}>
                        <View
                          style={[styles.introDot, { backgroundColor: hue, borderColor: hue }]}
                        >
                          <SymbolView name={INTRO_ICON[i]} size={14} tintColor="#FFFFFF" />
                        </View>
                      </View>
                      <View
                        style={[
                          styles.introStep,
                          {
                            backgroundColor: tint.backgroundColor,
                            borderColor: tint.borderColor,
                          },
                        ]}
                      >
                        <Text style={[styles.introStepTitle, { color: hue }]}>{s.label}</Text>
                        <Text style={styles.introStepSub}>{INTRO_SUB[i]}</Text>
                      </View>
                    </Animated.View>
                  );
                })}
              </View>

              <View style={styles.introBrand}>
                <Orb
                  size={16}
                  tierRingCount={0}
                  still
                  hue={bodyHue(lifetimeLight)}
                  brightness={moon?.fullness ?? 1}
                  material={moon?.material ?? 'moonstone'}
                  illum={1}
                />
                <Text style={styles.introBrandText}>{COPY.intro_brand}</Text>
              </View>
            </View>
          ),
          cta: (
            <BeginButton fullWidth label={COPY.intro_cta} onPress={() => go('intro')} />
          ),
        };

      // The entry and the baseline rating share a card. The rating has to be
      // taken BEFORE the echo and the feeling word, because both of those are
      // interventions and the in-to-out delta is the only evidence the flow
      // works. On its own it was a cold second screen asking her to rate a
      // thing she had not named yet; attached to the sentence she just wrote,
      // it is one thought.
      case 'raw_entry':
        return {
          // Speaker/question sticky at the top (body); the chat composer sticky
          // at the bottom (cta), like any messaging screen. A good-vs-bad pair
          // under the question teaches how to write to Moon (Neha 2026-08-02):
          // faint x / brand check, never alarm red, so it guides without judging.
          body: (
            <View style={styles.entryHead}>
              {head(COPY.raw_entry)}
              <WhyLine>{COPY.raw_entry_why}</WhyLine>
              {/* The example is guidance for an empty field: once she starts
                  typing (or dictating), it fades out so it never lingers next to
                  her own words (Neha 2026-08-02). GOOD comes first: with the
                  keyboard up the card is short and the list can clip to one line,
                  so the teaching example must survive, never the "bad" one alone. */}
              {!draft.trim() && !dictation.listening && (
                <Animated.View
                  style={styles.entryExamples}
                  entering={reduceMotion ? undefined : FadeIn.duration(220)}
                  exiting={reduceMotion ? undefined : FadeOut.duration(200)}
                >
                  <View style={styles.entryExampleRow}>
                    <SymbolView
                      name="checkmark"
                      tintColor={v3.accent}
                      size={13}
                      weight="semibold"
                      style={styles.entryExampleMark}
                    />
                    <Text style={styles.entryExampleGood}>{goodExample}</Text>
                  </View>
                  <View style={styles.entryExampleRow}>
                    <SymbolView
                      name="xmark"
                      tintColor={colors.textTagline}
                      size={13}
                      weight="semibold"
                      style={styles.entryExampleMark}
                    />
                    <Text style={styles.entryExampleBad}>{COPY.raw_entry_example_bad}</Text>
                  </View>
                </Animated.View>
              )}
            </View>
          ),
          cta: entryField({
            placeholder: COPY.raw_entry_placeholder,
            onSend: send,
            withMic: true,
          }),
        };

      // She wrote something, but not a thing that happened. Ask for the event,
      // and say which part is missing rather than just asking again.
      case 'clarify': {
        const reason: ClarifyReason = clarifyMoreContext
          ? 'more-context'
          : verdict?.kind === 'unclear'
            ? verdict.reason
            : 'no-event';
        return {
          body: head(CLARIFY_ASK[reason]),
          cta: entryField({
            placeholder: CLARIFY_HINT[reason],
            onSend: send,
            withMic: true,
            a11yLabel: 'Tell me more about what happened',
          }),
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

        // Moon could not be reached at the entry beat (timeout/HTTP/empty, while
        // AI is on and she is not offline). Say so and let her retry, rather than
        // proceeding on a hollow scripted reflection. Crisis is handled before
        // here; offline never reaches this (it keeps the authored floor).
        if (aiError) {
          return {
            body: (
              <>
                {head(COPY.ai_not_responding)}
                <Text style={styles.settles}>{COPY.ai_not_responding_sub}</Text>
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label={COPY.ai_retry}
                onPress={() => {
                  tap();
                  startEcho();
                }}
              />
            ),
          };
        }

        // She said it was wrong: a field to say it again, then re-echo.
        if (echoFixing) {
          return {
            body: head(COPY.ack_fix),
            cta: entryField({
              placeholder: COPY.raw_entry_placeholder,
              onSend: () => {
                const t = draft.trim();
                tap();
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
              },
            }),
          };
        }

        // The reply streams in; once it lands, she confirms it is right before
        // the naming appears. The confirm question and its options hold back
        // until the stream finishes, so she reads the whole line first.
        if (!echoOk) {
          // "Did I get that right?" only makes sense over an actual reflection of
          // her words. When the line is the generic authored fallback (the model
          // gave nothing to say back — e.g. a feeling-dump), there is nothing to
          // confirm; show a plain Continue instead of a nonsensical yes/no.
          const isReflection = echoAi;
          const settled = streamDone && !echoResolving;
          return {
            body: (
              <>
                {head(revealed, { tone: 'said', ai: echoAi, thinking: echoResolving })}
                {settled && <WhyLine>{COPY.ack_why}</WhyLine>}
                {isReflection && settled && (
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
            cta:
              !isReflection && settled ? (
                <BeginButton fullWidth label="Continue" onPress={() => setEchoOk(true)} />
              ) : null,
          };
        }

        // Name the emotion — SHE names it, the app does not (Neha 2026-08-01). A
        // neutral "which feeling is strongest?" list she picks from: the moon no
        // longer guesses and asserts a feeling ("Feeling guilty?") with a "Yes,
        // that's it" confirm. The AI still RANKS the list (most likely first) via
        // feelingOrder; it just never states the answer. offerFeelings is the
        // deterministic fallback until the ranking lands.
        const ranked = feelingOrder ?? offerFeelings(herText.current);
        const loadingFeelings = aiOn && feelingsLoading && !feelingOrder;
        const chooseFeeling = (f: string) => {
          // The options are ranked on the feeling. Drop a stale ranking only when
          // she actually changes it, so the menu is re-fetched for the new feeling
          // but stays put on a plain step-back.
          if (f !== chosenFeeling.current) {
            setActOrder(null);
            setShowAllActs(false);
          }
          chosenFeeling.current = f;
          setHistory((h) => [...h, 'acknowledge']);
          setCurrent('reframe_small');
        };
        return {
          body: (
            <>
              {head(COPY.feelings_ask)}
              <WhyLine>{COPY.feelings_why}</WhyLine>
              <View style={styles.stack}>
                {loadingFeelings ? (
                  <SkeletonRows count={4} />
                ) : (
                  <>
                {ranked.map((f, i) => (
                  <OptionRow
                    key={f}
                    label={f}
                    index={i}
                    tint={selTint}
                    onPress={() => chooseFeeling(f)}
                  />
                ))}
                {/* The field stays hidden until she asks for it. Shown always, it
                    puts a keyboard-shaped decision in front of answers that are one
                    tap each. No tint: this opens a field in place rather than
                    advancing a beat. */}
                {!otherOpen ? (
                  <OptionRow
                    label={COPY.feelings_other}
                    index={ranked.length}
                    onPress={() => setOtherOpen(true)}
                  />
                ) : (
                  <>
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
                    {/* She types, we fill: matching feeling words she can tap
                        instead of writing from scratch. Nothing matches → no
                        rows, and Continue still takes her verbatim word. */}
                    {matchFeelings(draft).map((f, i) => (
                      <OptionRow
                        key={f}
                        label={f}
                        index={i}
                        tint={selTint}
                        onPress={() => {
                          setDraft('');
                          setOtherOpen(false);
                          chooseFeeling(f);
                        }}
                      />
                    ))}
                  </>
                )}
                  </>
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
      case 'make_safe': {
        // M8 (Neha's rule a): body-prep is no longer a gate on this choice. She
        // picks wait or now; choosing "now" opens a dedicated body-prep page
        // before she responds. On "wait", body-prep rides the 20-min list.
        if (bodyPrepOpen) {
          return {
            body: (
              <>
                <Text style={styles.settlesStrong}>{COPY.make_safe_care_intro}</Text>
                <Checklist
                  items={MAKE_SAFE_BODY}
                  isChecked={(id) => !!bodyChecks[id]}
                  onToggle={(id) => setBodyChecks((c) => ({ ...c, [id]: !c[id] }))}
                  emphasizeTitle
                />
                {/* Only while she cannot honestly tick all three: the honest way out. */}
                {!bodyReady && (
                  <Pressable onPress={leave} accessibilityRole="button" style={styles.breathSkip}>
                    <Text style={styles.breathSkipText}>{COPY.make_safe_care_defer}</Text>
                  </Pressable>
                )}
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label={COPY.make_safe_now}
                disabled={!bodyReady}
                onPress={() => {
                  setBodyPrepOpen(false);
                  setSkippedHold(true);
                  go('make_safe', 'now');
                }}
              />
            ),
          };
        }
        return {
          // Both choices sit together under the question rather than the hero
          // button docking at the screen bottom with a big gap above it (Neha
          // 2026-08-02, "the gradient button ends up at the lower end, move it
          // up"). "Now" opens the body-prep page in place; "Wait" is the
          // recommended hold — hero gradient, so the encouraged path leads.
          body: (
            <>
              {head(COPY.make_safe_intro)}
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.make_safe_now}
                  index={0}
                  onPress={() => setBodyPrepOpen(true)}
                />
                <BeginButton
                  hero
                  fullWidth
                  label={COPY.make_safe_wait}
                  onPress={() => {
                    resetActivities();
                    resetHold(); // fresh 20:00 for this hold (also clears any stale clock)
                    go('make_safe', 'wait');
                  }}
                />
              </View>
            </>
          ),
          cta: null,
        };
      }

      // The reframe, small moments only. Big ones never reach here: a gentler
      // reading lands on a clear head and fails on a flooded one, so they go
      // straight to the body and the thinking happens later.
      case 'reframe_small': {
        // Before she picks: three readings to choose from. A PICK over a closed
        // authored set, not one line delivered at her — she decides which is
        // true, and the app does not get to assert any of them.
        if (reframePick == null) {
          // While the model is still writing the readings, show ONLY the
          // skeletons. "None of these are true" must not appear before them, or
          // she taps it as the one loaded option and skips the reframe entirely.
          // It arrives together with the readings once they land.
          const loadingReadings = aiOn && reframeLoading && !reframeReadings;
          const readings = reframeReadings ?? SETS.smallReframes;
          return {
            body: (
              <>
                {/* "Wait, let's think. Is any of this true?" plus a quiet label
                    naming the readings as angles to weigh, not claims (Neha,
                    2026-07-29). The word "true" in the ask keeps her the judge. */}
                <View style={styles.askGroup}>
                  {head(COPY.reframe_small_ask)}
                  <Text style={styles.settles}>{COPY.reframe_small_angles}</Text>
                </View>
                {/* The AI-written readings. The "the moon's read" label was
                    pulled 2026-07-28 (it did not sit well); the signal now rides
                    the stream-in and the per-option "suggested by the moon"
                    VoiceOver hint. Authored placeholders today, Gemini-written
                    soon. */}
                <View style={styles.stack}>
                  {loadingReadings ? (
                    <SkeletonRows count={3} />
                  ) : (
                    <>
                      {readings.map((r, i) => (
                        <OptionRow
                          key={r}
                          label={r}
                          index={i}
                          hint="Suggested by the moon"
                          tint={selTint}
                          onPress={() => setReframePick(r)}
                        />
                      ))}
                      {/* Her own answer, apart from the moon's readings and
                          plainly authored: "none of them are true" is a real
                          answer, and it skips the follow-up because there is no
                          line to ask whether it helped. Only shown once the
                          readings are here, so it never loads alone. */}
                      <OptionRow
                        label={COPY.reframe_small_none}
                        index={readings.length}
                        tint={selTint}
                        onPress={() => go('reframe_small', 'small_no')}
                      />
                    </>
                  )}
                </View>
                {/* Her own read: a self-generation on-ramp seeded with the model's
                    open question as the placeholder. Self-generated reappraisals
                    stick better than served ones, so the field sits below the
                    tappable readings, not instead of them. Only shown once the
                    readings (and the question) have landed. */}
                {!loadingReadings && reframeSelfPrompt ? (
                  <View style={styles.stack}>
                    <Text style={styles.settles}>{COPY.reframe_small_own}</Text>
                    {entryField({
                      placeholder: reframeSelfPrompt,
                      a11yLabel: 'Your own read',
                      // Don't raise the keyboard on the "Wait, let's think" page:
                      // the readings are the point; the field waits for a tap
                      // (Neha 2026-08-02).
                      autoFocus: false,
                      onSend: () => {
                        const t = draft.trim();
                        if (!t) return;
                        setReframePick(t);
                        setDraft('');
                      },
                    })}
                  </View>
                ) : null}
              </>
            ),
            cta: null,
          };
        }

        // After she picks: the line she chose, then whether it helped. Three
        // answers (Neha, 2026-07-29): "a little bit" is the middle so she is never
        // cornered into claiming it helped or that it did nothing. "yes" and "a
        // little" both land (the closing rating reads the delta); "not really"
        // takes the breath. The old "it's bigger than that" exit was dropped: it
        // routed to the same breath as "not really", and page one's "none of these
        // are true" already carries the honest out.
        return {
          body: (
            <>
              {head(reframePick, { tone: 'said' })}
              <View style={styles.askGroup}>
                <Text style={styles.feelingsAsk}>{COPY.reframe_small_check}</Text>
                <Text style={styles.settles}>{COPY.reframe_small_why}</Text>
              </View>
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.reframe_small_yes}
                  index={0}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_lands')}
                />
                <OptionRow
                  label={COPY.reframe_small_little}
                  index={1}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_lands')}
                />
                <OptionRow
                  label={COPY.reframe_small_no}
                  index={2}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_no')}
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
              <WhyLine>{COPY.intensity_why}</WhyLine>
              <ScaleButtons
                value={intensity}
                onChange={(n) => {
                  setIntensity(n);
                  pickThenGo(async () => {
                    setIntensity(null);
                    baseline.current = n;
                    // clarify fires for a thin entry, or (M6) when her sentence was
                    // clear but the model found no concrete event: ask for context.
                    setHistory((h) => [...h, 'intensity_in']);
                    // Wait out a still-pending event check rather than reading its
                    // null and letting a vague entry through to feelings. Only a
                    // resolved "no" clarifies; a failed/off check (null) proceeds.
                    let ev = eventCheck.current;
                    if (verdict?.kind === 'clear' && ev === null && eventCheckPromise.current) {
                      // Bounded: give the check up to 1.5s to land, then proceed on
                      // whatever we have. Never hang the tapped rating card.
                      ev = await Promise.race([
                        eventCheckPromise.current.catch(() => null),
                        new Promise<boolean | null>((res) => setTimeout(() => res(eventCheck.current), 1500)),
                      ]);
                    }
                    const vague = verdict?.kind === 'clear' && ev === false;
                    if (verdict?.kind === 'clear' && !vague) {
                      startEcho();
                      setCurrent('acknowledge');
                    } else {
                      setClarifyMoreContext(vague);
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

      // The warm ending (Neha 2026-08-01), replacing the closing "And now?" 0-10
      // rating: name the three phases done and hand her evening back — no more
      // "how do you feel", which pulls her into monitoring right when she should
      // disengage. Then the reward.
      case 'sendoff':
        return {
          body: (
            <>
              {head(COPY.sendoff_head)}
              <Text style={styles.settles}>{COPY.sendoff_body}</Text>
            </>
          ),
          cta: (
            <BeginButton fullWidth label={COPY.sendoff_cta} onPress={() => go('sendoff')} />
          ),
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
                  beginAct(chosenAct);
                }}
              />
            ),
          };
        }
        // Only when the opening rating was high AND she chose to act now
        // without the hold. An offer above the acts, never a wall in front of
        // them: she can still pick any act right below it.
        const nudgeHold = skippedHold && (baseline.current ?? 0) >= 4;
        // The respond step, tailored to the feeling she named: one earned science
        // line for this feeling (C8), instead of the generic options why.
        const plan = optionPlanFor(chosenFeeling.current);
        // The ranked pool (model, else authored). The menu shows one per rung;
        // "Show me other options" expands to the rest. Labels get her own person
        // filled in (personalisedLabel), grounded so it can never invent one.
        const ranked = actOrder ?? offerableActs(dvDetected);
        const visibleActs = showAllActs ? ranked : threeRungs(ranked);
        const hasMore = ranked.length > visibleActs.length;
        return {
          body: (
            <>
              {head(COPY.options)}
              <WhyLine>{plan.science}</WhyLine>
              {/* A divider below the intro (Neha 2026-08-02: "line" = divider). */}
              <View style={styles.divider} />
              {/* Abuse in the picture: the confront/self-blame options are gone
                  from the menu (offerableActs), and this quiet, NON-DIAGNOSTIC
                  resource sits above what remains. General wording ("if someone
                  is") so a shared device never reveals a conclusion about her. */}
              {dvDetected && (
                <View style={styles.holdNudge}>
                  <Text style={styles.settles}>{UNIVERSAL_DV_LINE}</Text>
                  <Text style={styles.holdNudgeText}>{DV_RESOURCE.intro}</Text>
                  <OptionRow
                    label={DV_RESOURCE.label}
                    tint={selTint}
                    onPress={() => {
                      tap();
                      openDvLine();
                    }}
                  />
                </View>
              )}
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
                      // follow her back here after the hold loops round. Same
                      // entry as "wait": the settling menu.
                      setSkippedHold(false);
                      resetActivities();
                      resetHold(); // fresh 20:00 for this hold
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
                {aiOn && optionsLoading && !actOrder ? (
                  <SkeletonRows count={3} />
                ) : (
                  <>
                {visibleActs.map((a, i) => (
                  <OptionRow
                    key={a.id}
                    label={personalisedLabel(a, herText.current)}
                    index={i}
                    tint={selTint}
                    // No recommended chip: the moves are offered flat, none singled
                    // out (Neha 2026-08-01). We present, she chooses.
                    onPress={() => {
                      setChosenAct(a);
                      if (a.universalLine) {
                        setDvConfirm(true);
                        return;
                      }
                      beginAct(a);
                    }}
                  />
                ))}
                {/* C6: after-fight repair, only when her words point to a conflict. */}
                {CONFLICT_CUES.test(herText.current) && (
                  <OptionRow
                    label="Make up after the fight"
                    index={visibleActs.length}
                    tint={selTint}
                    onPress={() => router.push('/couples-reconnect')}
                  />
                )}
                {/* The two meta-choices sit apart from the responses as quiet
                    links, not filled option rows: they are not answers to
                    "which response", they are ways out of the list. "Show me
                    other options" expands the menu in place (no navigation);
                    it hides once everything is shown. */}
                {/* A divider sets the two meta-links apart from the responses
                    (Neha 2026-08-02: "line" = divider). */}
                <View style={styles.divider} />
                <View style={styles.metaLinks}>
                  {hasMore && !showAllActs && (
                    <Pressable
                      onPress={() => {
                        tap();
                        setShowAllActs(true);
                      }}
                      style={styles.skipLink}
                      accessibilityRole="button"
                    >
                      <Text style={styles.skipLinkText}>{COPY.options_more}</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => go('options', 'none_possible')}
                    style={styles.skipLink}
                    accessibilityRole="button"
                  >
                    <Text style={styles.skipLinkText}>{COPY.options_none}</Text>
                  </Pressable>
                </View>
                  </>
                )}
              </View>
            </>
          ),
          // She advances by choosing, so there is nothing to confirm.
          cta: null,
        };
      }

      // The settling menu (Neha 2026-07-29): four ways to fill the wait, each a
      // full-screen route she does and marks done; she can do as many as she
      // likes. Colour is the flagship (recommended). "I am ready to respond" is
      // the cta — always there, un-shamed, and it is what advances the flow.
      case 'activities': {
        // M8 (wait path): body-prep as one item in the settling list. Tapping it
        // opens the same checklist; Done returns to the list.
        if (bodyPrepInList) {
          return {
            body: (
              <>
                <Text style={styles.settlesStrong}>{COPY.make_safe_care_intro}</Text>
                <Checklist
                  items={MAKE_SAFE_BODY}
                  isChecked={(id) => !!bodyChecks[id]}
                  onToggle={(id) => setBodyChecks((c) => ({ ...c, [id]: !c[id] }))}
                  emphasizeTitle
                />
              </>
            ),
            cta: <BeginButton fullWidth label="Done" onPress={() => setBodyPrepInList(false)} />,
          };
        }

        // C5: a fast body reset (cold water / shoulders) as a guided in-place
        // step. Done marks it finished, which fires the shine + praise and shows
        // the check back on the list — a real little flow, not a vanishing snack.
        if (microStep) {
          const m = MICRO[microStep];
          return {
            body: (
              <>
                <Text style={styles.microTitle}>{m.title}</Text>
                {m.steps.map((s) => (
                  <Text key={s} style={styles.microStep}>{s}</Text>
                ))}
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label="Done"
                onPress={() => {
                  markActivityDone(microStep);
                  setMicroStep(null);
                }}
              />
            ),
          };
        }
        return {
          body: (
            <>
              {/* Soft, permission-to-wait timer in the corner; the rationale
                  ("wait before you react") sits under the heading. */}
              <HoldWhisper />
              {head(COPY.activities_intro)}
              <WhyLine>{COPY.make_safe_why}</WhyLine>
              {/* The settling activities as magic balls: a 2-col grid, each a
                  glowing orb that clears + lights up once done (activity-ball). */}
              <View style={styles.activityGrid}>
                <ActivityBall
                  kind="colour"
                  label={COPY.activities_colour}
                  index={0}
                  active
                  done={activitiesDone.has('colour')}
                  onPress={() => router.push('/paint')}
                />
                <ActivityBall
                  kind="story"
                  label={COPY.activities_story}
                  index={1}
                  done={activitiesDone.has('story')}
                  onPress={() => router.push('/story')}
                />
                <ActivityBall
                  kind="move"
                  label={COPY.activities_move}
                  index={2}
                  done={activitiesDone.has('move')}
                  onPress={() => router.push('/move')}
                />
                <ActivityBall
                  kind="wind"
                  label={COPY.activities_breath}
                  index={3}
                  done={activitiesDone.has('breath')}
                  // The real guided Wind Down (voice + captions), the same
                  // /session exercise as in the calm library; `hold` tells it to
                  // mark this activity done when she finishes.
                  onPress={() =>
                    router.push({
                      pathname: '/session',
                      params: { id: 'wind-down', hold: 'breath' },
                    })
                  }
                />
                {/* C5: quick regulation, the fast body resets. Each opens a short
                    guided step in place, then marks done and earns the shine. */}
                <ActivityBall
                  kind="cold"
                  label={MICRO.cold.title}
                  index={4}
                  done={activitiesDone.has('cold')}
                  onPress={() => setMicroStep('cold')}
                />
                <ActivityBall
                  kind="aurora"
                  label={MICRO.shoulders.title}
                  index={5}
                  done={activitiesDone.has('shoulders')}
                  onPress={() => setMicroStep('shoulders')}
                />
                {/* M8 (wait path): body-prep as a settling item, opens the
                    checklist in place rather than advancing the beat. */}
                <ActivityBall
                  kind="sprout"
                  label={COPY.make_safe_care_intro}
                  index={6}
                  done={bodyReady}
                  onPress={() => setBodyPrepInList(true)}
                />
              </View>
            </>
          ),
          cta: (
            <BeginButton fullWidth label={COPY.activities_ready} onPress={() => go('activities')} />
          ),
        };
      }

      // After the hold: she rates whether she is in a better place to react.
      // The hold was the intervention; this reads whether it landed, then goes
      // to the act menu. There is no closing rating any more (removed 2026-08-01).
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

      // The "when" page: her chosen move at the head, then when to do it. "Now"
      // opens a draft the moon writes for the moves that have words to say (a
      // message, a direct or prep move); she edits it or asks to change it, then
      // sends or does it. For a pure self act, or with AI off, "now" carries it
      // out directly (a message act opens the blank iOS Messages compose). Then
      // the if-then. "Later" steps out to Today. "Another" reopens the menu.
      case 'act': {
        const a = chosenAct;

        // She saved the move for later: a short "Nicely done" so the save lands as
        // a real moment, not the chooser silently vanishing. Continue moves on.
        if (savedLater) {
          return {
            body: (
              <View style={styles.celebrate}>
                <Text style={styles.congrats}>Nicely done.</Text>
                <Text style={styles.giftSub}>Saved to Today. I&apos;ll bring it back when you&apos;re ready.</Text>
              </View>
            ),
            cta: (
              <BeginButton
                fullWidth
                label="Continue"
                onPress={() => {
                  setSavedLater(false);
                  go('act', 'later');
                }}
              />
            ),
          };
        }

        // C10: the "when should I remind you" chooser, opened from Do-this-later.
        if (reminderOpen) {
          return {
            body: (
              <>
                {head(a ? personalisedLabel(a, herText.current) : COPY.options)}
                <Text style={styles.settles}>When should I remind you?</Text>
                <View style={styles.stack}>
                  {REMINDER_WHENS.map((w, i) => (
                    <OptionRow key={w.label} label={w.label} index={i} onPress={() => saveForLater(w.at())} />
                  ))}
                  <OptionRow
                    label="Just save it, no reminder"
                    index={REMINDER_WHENS.length}
                    onPress={() => saveForLater(null)}
                  />
                </View>
              </>
            ),
            cta: null,
          };
        }

        // The draft editor: her chosen response as a start she edits, quick
        // rewrites (Edit with Moon), then send or do. Reached directly now that
        // picking a response opens it, with no Now/Later page first (M18).
        return {
            body: (
              <>
                {head(a ? personalisedLabel(a, herText.current) : COPY.options)}
                <View style={styles.divider} />
                <Text style={styles.settles}>{COPY.act_draft_hint}</Text>
                {actDraftLoading ? (
                  // M2: the generation gap reads as working, not broken.
                  <View style={styles.input}>
                    <ThinkingDots label={COPY.act_draft_loading} />
                  </View>
                ) : (
                  <TextInput
                    style={styles.input}
                    value={actDraft}
                    onChangeText={setActDraft}
                    placeholderTextColor="rgba(255,255,255,0.30)"
                    selectionColor="rgba(196, 178, 255, 0.9)"
                    multiline
                    textAlignVertical="top"
                    inputAccessoryViewID={Platform.OS === 'ios' ? ACCESSORY_ID : undefined}
                    accessibilityLabel="Your draft"
                  />
                )}
                {!actDraftLoading && (
                  <View style={styles.editWithMoon}>
                    <Text style={styles.editWithMoonLabel}>{COPY.act_draft_change}</Text>
                    <View style={styles.editWithMoonChips}>
                      {EDIT_MOVES.map((m) => (
                        <Chip key={m.label} label={m.label} onPress={() => reviseActDraft(m.note)} />
                      ))}
                    </View>
                  </View>
                )}
                {/* A divider before the secondary action, so "Save for later"
                    reads as a distinct choice from editing the draft (Neha
                    2026-08-02). */}
                <View style={styles.divider} />
                {/* M20: no "skip". "Save for later" (secondary, bordered) opens
                    the C10 when-chooser; the primary "Share" sits in the footer. */}
                <Pressable
                  onPress={() => setReminderOpen(true)}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryBtnText}>{COPY.act_later}</Text>
                </Pressable>
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label={COPY.act_draft_send}
                disabled={actDraftLoading}
                onPress={() => {
                  const text = actDraft.trim();
                  // Primary is always "Share": hand her draft to the iOS share
                  // sheet so she picks how to send it (Messages, WhatsApp, Mail).
                  if (text) {
                    Share.share({ message: text }).catch(() => {});
                  }
                  closeActDraft();
                  go('act', 'now');
                }}
              />
            ),
          };
      }

      // The if-then "Fill in to remember" beat (today_action) was removed
      // 2026-08-01 (Neha): confusing right after she had already chosen and done
      // a response. Picking an act now goes act -> closing rating -> close.

      // The one celebration in the app, and it is for a hard act she completed.
      // A wrapped gift opens into a scratch card she rubs to reveal an earned
      // character, saved to her Soul. Two stages: the gift, then the card.
      case 'close': {
        if (!giftOpened) {
          return {
            body: (
              <View style={styles.celebrate}>
                <Text style={styles.congrats}>{COPY.close_congrats}</Text>
                <Text style={styles.giftSub}>{COPY.close_gift}</Text>
                <Pressable
                  onPress={() => {
                    tap();
                    setGiftOpened(true);
                  }}
                  style={styles.gift}
                  accessibilityRole="button"
                  accessibilityLabel={COPY.close_gift_cta}
                >
                  <Text style={styles.giftGlyph}>🎁</Text>
                </Pressable>
              </View>
            ),
            cta: (
              <BeginButton
                fullWidth
                label={COPY.close_gift_cta}
                onPress={() => {
                  tap();
                  setGiftOpened(true);
                }}
              />
            ),
          };
        }
        return {
          body: (
            <View style={styles.celebrate}>
              <ScratchCard
                width={cardInnerW}
                height={190}
                hint={COPY.close_scratch}
                onReveal={() => {
                  setRevealed(true);
                  // Earned: advance the order so the next session gets the next.
                  if (!rewardBumped.current) {
                    rewardBumped.current = true;
                    bumpRewardCount().catch(() => {});
                  }
                }}
              >
                <View style={styles.prize}>
                  <Image
                    source={MOON_DRAWINGS[rewardIdx % MOON_DRAWINGS.length].src}
                    style={styles.prizeImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                  <Text style={styles.badgeName}>
                    {MOON_DRAWINGS[rewardIdx % MOON_DRAWINGS.length].caption}
                  </Text>
                </View>
              </ScratchCard>
              {revealed && (
                <Animated.View
                  entering={reduceMotion ? undefined : FadeIn.duration(400)}
                  style={styles.reveal}
                >
                  <Text style={styles.badgeWhy}>{COPY.close_badge_why}</Text>
                  <Text style={styles.saved}>{COPY.close_saved}</Text>
                </Animated.View>
              )}
            </View>
          ),
          cta: revealed ? (
            <BeginButton
              fullWidth
              label={COPY.close_done}
              onPress={finishAndLeave}
            />
          ) : null,
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
      // "No am good, let me rephrase" returns her to her own words (setCrisis
      // false) instead of exiting the moment — her draft is intact, so she can
      // edit and resend (Neha 2026-08-02). Resources stay one send away.
      cta: <BeginButton fullWidth label={CRISIS_COPY.back} onPress={() => setCrisis(false)} />,
    };
  }
}

/** What each beat asks. Beats not listed fall back to their id, which is a
 *  visible reminder that the copy is not written yet. */
// The intro cards' sub-lines and node icons, in PHASE_STEPS order (reflect,
// regulate, react). Icons are SF Symbols: notice, settle, respond.
const INTRO_SUB = [COPY.intro_reflect, COPY.intro_regulate, COPY.intro_respond];
const INTRO_ICON = ['sparkles', 'wind', 'paperplane.fill'] as const;

const SPOKEN: Partial<Record<NodeId, string>> = {
  together: COPY.together,
  naming_science: COPY.naming_science,
  feelings: COPY.feelings_ask,
  ready_reward: COPY.ready_reward,
  unctrl_honor: COPY.unctrl_honor,
  // C4: the mixed lane renders generically, so it reads from here. (The low lane
  // now reuses the `activities` menu; its old text beats were removed 2026-08-01.)
  mixed_name_swing: COPY.mixed_name_swing,
  mixed_validate: COPY.mixed_validate,
  mixed_check_read: COPY.mixed_check_read,
  mixed_swing_real: COPY.mixed_swing_real,
  mixed_real: COPY.mixed_real,
  mixed_anchor: COPY.mixed_anchor,
};

/**
 * What to ask when her entry was not a thing that happened. Naming the missing
 * part matters: asking the same question again reads as the app not having
 * listened, which is the opposite of what this beat is for.
 */
type ClarifyReason = 'too-short' | 'no-event' | 'nothing-to-echo' | 'more-context';

const CLARIFY_ASK: Record<ClarifyReason, string> = {
  'too-short': 'A bit more. What actually happened?',
  'no-event': 'And what happened, to bring that on?',
  // She wrote what she thinks he meant, or something hard about herself.
  // Neither can be said back to her, so ask for the event underneath it.
  'nothing-to-echo': 'What happened, just the part you saw or heard?',
  // M6: a clear sentence with no concrete event. Ask for the details that make
  // the reframe and the response actually fit.
  'more-context': 'Can you give a bit more, like who did what, and where and how? It helps.',
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
  'more-context': 'Who was there, what they did, where and how it happened.',
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
  // Overlaps the card's top edge, so the moon reads as in front of it.

  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(8, 6, 14, 0.06)',
  },
  // M28: the finish dims the sky so the moon and confetti carry the moment.
  scrimDim: { backgroundColor: 'rgba(4, 3, 10, 0.78)' },
  // The moon behind the card: centred, upper third, behind everything.
  moonLayer: {
    position: 'absolute',
    top: '18%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // "The situation" is a label sitting above; the moon and the question below
  // it are one unit, so the gap here is what separates label from speech.
  // No scrim of its own — the whole-card dark tint (glassTint) keeps the speaker
  // + question legible, so the head is just spacing.
  head: { gap: spacing.sm },
  // The moon sits ON the question's first line, not above the whole block, so
  // it stays put when the question wraps to two lines.
  askRow: { flexDirection: 'row', alignItems: 'flex-start' },
  // The Orb's box is 1.8x its sphere, so it carries ~6pt of empty halo on each
  // side. The left margin pulls that back so the sphere lines up with the
  // card's text edge; the right leaves a real gap between moon and words.
  moonMark: { marginLeft: -6, marginRight: spacing.xs },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  // Card header: back (or its spacer) and the three-state map on one row, above
  // the scroll so they hold their place as the beat scrolls.
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
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
    // FILLS the screen (flex:1, no maxHeight cap) so the frosted glass covers
    // the whole area and there is no exposed sky/moon below a short beat. The
    // moon is hidden during the session, so behind the empty glass is only the
    // plain starfield — a full frosted surface, not a small card floating over a
    // big moon.
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
    // Frosted glass, not an opaque panel: blur + the light `glassTint` over it.
    // The readable zones carry their own darker fills (the composer well, option
    // rows, buttons); the empty stretches stay just-blurred.
    overflow: 'hidden',
  },
  // M1: the flow beats share one height so the card and its Continue button stop
  // jumping as content length changes between beats. The extra room falls below
  // the content (short beats just leave space); intro and crisis keep their own
  // content-sized layout (they are exempted at the call site).
  cardFixed: { height: '92%' },
  // Default: the scroll HUGS its content (grow 0), so the body and its CTA stay
  // grouped near the top of the full-screen card instead of the button being
  // pinned a screen away at the bottom. flexShrink lets a long beat still scroll.
  scroll: { flexShrink: 1 },
  // Composer beats only: grow to fill, pushing the chat-style field (in the CTA
  // slot) down to the bottom edge like a messaging bar.
  scrollGrow: { flexGrow: 1 },
  // A light frost darkening over the blur — Home's exact value, kept translucent
  // so the moon's halo and the cosmic sky glow through the glass.
  // The whole-card dark tint. Per-element tints (a well behind each button, a
  // scrim behind the head) read patchy — the bright moon showed through the gaps
  // between them. So the tint lives HERE, over the entire frosted card, and
  // everything sits on one uniform dark surface. The moon still shows, now as a
  // soft dim glow rather than a legibility problem.
  glassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,8,16,0.50)',
  },
  // One spacing unit (SP) between blocks, so the rhythm is even down the card.
  // Sections breathe; things that belong together (moon + question in `head`)
  // stay tight.
  cardBody: { padding: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xs, gap: spacing.lg },
  // The per-beat block rhythm. It moved off `cardBody` onto the crossfade
  // wrapper (the scroll's single child), so the gap falls between the beat's
  // own blocks again rather than doing nothing between one lone wrapper.
  beatBody: { gap: spacing.lg },
  cta: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.xl },

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
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  input: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 25,
    color: colors.textOnDark.primary,
    // A dark, mostly-opaque well — darker than the card's frost tint (0.20), so
    // the field reads as a recessed surface and light text stays legible over
    // the moon glowing through the translucent card behind it.
    backgroundColor: 'rgba(10,8,16,0.55)',
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    padding: spacing.lg,
    minHeight: 180,
    maxHeight: 300,
  },
  // The chat-style composer (entryField): a rounded dark well holding the text
  // and a bottom bar of controls, so the send action is a corner icon rather
  // than a full-width button walling off the card.
  composer: {
    backgroundColor: 'rgba(10,8,16,0.55)',
    borderRadius: radius.card,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    padding: spacing.md,
    gap: spacing.sm,
  },
  // The text itself sits transparent over the well; the composer paints the fill.
  composerInput: {
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 25,
    color: colors.textOnDark.primary,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    // FIXED height, not min/max: the field must never grow with the text, or it
    // eats upward and pushes the speaker off the top. At a fixed height the
    // speaker stays pinned above and the send button below — both always in
    // place — and a long entry scrolls INSIDE the field instead.
    height: 150,
  },
  // Controls docked along the bottom of the field: mic on the left, send on the
  // right, the spacer pushing them apart.
  composerBar: { flexDirection: 'row', alignItems: 'center' },
  composerMic: { padding: spacing.xs },
  composerSpace: { flex: 1 },
  // The send arrow: a small circle, violet (brand) when there is text to send,
  // muted when the field is empty. The chat-app affordance.
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySolid,
  },
  sendBtnOff: { backgroundColor: 'rgba(255,255,255,0.10)' },
  todo: {
    fontFamily: fonts.light,
    fontSize: fontScale.tagline,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: v3.activated,
  },
  accessory: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceOverlay,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  accessoryDone: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    color: v3.accent,
    letterSpacing: 0.3,
  },
  // Her own words, repeated back. Lighter than a question, and slightly
  // smaller: the app is not making a point here, it is showing it listened.
  saidLine: {
    // The moon's spoken line. SAME SIZE as the question now (it only layers over
    // `ask`, so dropping the size override lets it inherit the title size —
    // Moon's voice is one consistent size, Neha 2026-08-02). It still reads
    // lighter than the SemiBold question through WEIGHT (medium), not size or
    // dimness. Medium + primary (0.95) white keeps it legible over the moon glow;
    // the gradient echo (MoonText) inherits this weight too.
    fontFamily: fonts.medium,
    letterSpacing: 0,
    color: colors.textOnDark.primary,
  },
  // Closes the moon's line off, so what follows reads as a new thought rather
  // than more of the same sentence.
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: v3.panelBorder,
    marginTop: spacing.md,
  },
  settles: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textSubtitle,
  },
  // The good-vs-bad example under the entry question. Fainter and smaller than a
  // said line, so it reads as a quiet hint she can glance at, not an instruction.
  // entryHead keeps it tight to the question (sm), not the wider beatBody gap, so
  // the whole block stays short when the keyboard shrinks the card.
  entryHead: { gap: spacing.sm },
  entryExamples: { gap: spacing.xs },
  entryExampleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  entryExampleMark: { marginTop: 3 },
  entryExampleBad: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textTagline,
  },
  entryExampleGood: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
  },
  // "Body prep" heading over the self-check list: same size, more weight.
  settlesStrong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  // The guided micro reset (cold water / relax shoulders): the shared `settles`
  // subtitle read too small here. Its own larger, brighter type — a real
  // instruction to follow, not fine print.
  microTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 26,
    color: colors.textPrimary,
  },
  microStep: {
    fontFamily: fonts.regular,
    fontSize: fontScale.emphasis,
    lineHeight: 24,
    color: colors.textOnDark.primary,
  },
  feelingsAsk: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    lineHeight: 23,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  inputSmall: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    color: colors.textOnDark.primary,
    backgroundColor: v3.panel,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  stack: { gap: spacing.sm },
  // Magic-ball settling grid: two orbs per row (activity-ball tiles).
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaLinks: { gap: spacing.sm },
  // A subtle full-width divider line (Neha 2026-08-02, "line" = a divider).
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  // Secondary action, bordered (sibling to the primary's rounded shape) — e.g.
  // "Save for later" on the draft screen.
  secondaryBtn: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  secondaryBtnText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  // A question and its one-line description are ONE group: they sit tight (6),
  // while the card's 18 gap falls between groups (the description and the
  // options below). Proximity, so the line reads as belonging to the question
  // above it, not floating between it and the answers.
  askGroup: { gap: spacing.sm },
  // Edit with Moon (M19): a quiet label over a wrap of quick-rewrite chips,
  // sitting under the draft. Kept lighter than the draft so the message stays
  // the hero and the edits read as tools, not another thing to read.
  editWithMoon: { gap: spacing.sm, marginTop: spacing.xs },
  editWithMoonLabel: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textSubtitle,
    paddingHorizontal: spacing.xs,
  },
  editWithMoonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // The "change it" affordance under the revise field, and the quiet "skip"
  // under the draft: a right-aligned action and a centred way out.
  changeLink: { alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  changeLinkText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: 'rgba(196, 178, 255, 0.9)',
  },
  skipLink: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  skipLinkText: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    color: colors.textSubtitle,
  },
  // Two-up card grid for the hold activities: 48%-wide cards, space-between
  // gives the column gutter, rowGap the space between rows.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },

  // The breath ball's stage: the moon grown big, centred, the changing line
  // beneath it. Generous vertical room so the ball has space to swell into.
  breathStage: { alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xxxl },
  breathLine: {
    fontFamily: fonts.light,
    fontSize: fontScale.technique,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.2,
    minHeight: 60,
  },
  // The one quiet exit. Low emphasis: the breath is the point, this is just the
  // way out for anyone already steady.
  breathSkip: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  breathSkipText: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    color: colors.textTagline,
    letterSpacing: 0.2,
  },

  // The "still worth twenty minutes" offer above the acts. Set apart with a
  // faint fill so it reads as an aside, not a fourth option in the list.
  holdNudge: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.button,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  holdNudgeText: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
  },

  // The safety guard, above the timer ball. Clear and centred — the one
  // instruction that matters here — with the benefit a lighter line under it.
  holdGuardBlock: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  holdGuard: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 27,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  holdGuardBenefit: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 19,
    color: v3.textFaint,
    textAlign: 'center',
  },
  // Her chosen thing, as its own card under the timer: a title and a line, with
  // room for an image once those assets exist.
  holdCard: {
    marginTop: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    backgroundColor: v3.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    gap: spacing.xs,
  },
  holdCardTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    color: colors.textPrimary,
  },
  holdCardDesc: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 20,
    color: colors.textSubtitle,
  },

  // The welcome: an encouraging lead, then the three states as a connected
  // stepper in their own flow colours, then the "with Moon AI" signature.
  // Generous spacing — it is the calm front door.
  introWrap: { gap: spacing.lg, paddingVertical: spacing.xs },
  introLead: { gap: spacing.xs, alignItems: 'center', paddingHorizontal: spacing.sm },
  introHead: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 28,
    color: colors.textPrimary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  introSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  // The stepper: rows of node + card, with a faint spine behind the nodes.
  introSteps: { position: 'relative', gap: spacing.md },
  // The vertical line the nodes sit on, from the first node's centre to the
  // last. Behind the dots, which are opaque, so it reads as segments between
  // them. Approximate endpoints (rows are even height); tune if content grows.
  introSpine: {
    position: 'absolute',
    left: 12,
    top: 34,
    bottom: 34,
    width: 2,
    borderRadius: 1,
    backgroundColor: colors.fill.strong,
  },
  introRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  introRail: { width: 26, alignItems: 'center' },
  introDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  introStep: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.button,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  introStepTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.cardTitle,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  introStepSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
  },
  introBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  introBrandText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.3,
    color: colors.textTagline,
  },

  // The close celebration: the gift, then the scratch card, centred with room
  // to breathe. This is the one page in the flow that is allowed to feel like a
  // reward, so it is generous where the rest is spare.
  celebrate: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.sm },
  congrats: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.technique,
    lineHeight: 29,
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  giftSub: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  gift: { paddingVertical: spacing.md },
  giftGlyph: { fontSize: 96, textAlign: 'center' },
  // The prize under the foil: her moon and the earned name. Centred to fill the
  // scratch card behind it, so wherever she rubs, something shows.
  prize: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(18, 15, 28, 0.55)',
  },
  // The uncovered drawing. Fits inside the 190-tall card with room for the name.
  prizeImage: { width: 132, height: 132 },
  badgeName: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 26,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  reveal: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  badgeWhy: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  saved: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.3,
    color: v3.accent,
  },

  // The "Added to today" toast: a pill at the bottom, over the flow. The wrap
  // spans the width and centres the pill; the pill sizes to its content.
  snackbarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 46,
    alignItems: 'center',
  },
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceOverlay,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  snackText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },

  crisisBody: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
  },
  crisisLine: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
  },
  crisisLineLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    color: colors.textPrimary,
  },
  crisisLineDetail: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  crisisEmergency: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 18,
    color: colors.textTertiary,
  },
});
