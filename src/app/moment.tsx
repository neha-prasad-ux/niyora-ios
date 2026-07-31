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
  Linking,
  Platform,
  Pressable,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { resetActivities, useActivitiesDone } from '@/lib/hold-activities';
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
import { BackButton } from '@/components/BackButton';
import { BeginButton } from '@/components/begin-button';
import { Checklist } from '@/components/checklist';
import { CloseButton } from '@/components/CloseButton';
import { GlassSurface } from '@/components/glass-surface';
import {
  PhaseProgress,
  PHASE_STEPS,
  phaseHue,
  phaseTint,
} from '@/components/moment/phase-progress';
import { MoonText } from '@/components/moment/moon-text';
import { Orb } from '@/components/orb';
import { OptionRow, ScaleButtons, SkeletonRows, ThinkingDots, WhyLine } from '@/components/moment/controls';
import { Chip, FillInTemplate, assemble } from '@/components/moment/fill-in';
import { ScratchCard } from '@/components/moment/scratch-card';
import { addPlannedAction } from '@/store/moment-plan';
import { CRISIS_COPY, openCrisisLine } from '@/lib/crisis-scan';
import {
  analyse,
  FEELING_SET,
  laneFor,
  offerFeelings,
  type Verdict,
} from '@/v3/moment-analyse';
import { echo, pick, composeReadings, draftAct, revise, hasConcreteEvent } from '@/v3/moment-ai';
import { optionPlanFor } from '@/v3/option-plan';
import { getMomentProvider } from '@/lib/moment-gemini';
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
  // Resume: launched with ?resume=1 from Home's "Continue where you left off",
  // she picks up the saved checkpoint. `hydrating` holds the first render blank
  // until it loads, so the entry card never flashes before the saved beat lands.
  const { resume } = useLocalSearchParams<{ resume?: string }>();
  const [hydrating, setHydrating] = useState(resume === '1');
  const [draft, setDraft] = useState('');
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
  const [feelingOrder, setFeelingOrder] = useState<string[] | null>(null);
  const [reframeReadings, setReframeReadings] = useState<string[] | null>(null);
  const [actOrder, setActOrder] = useState<Act[] | null>(null);
  // M3: while the model is ranking/writing, show a skeleton instead of the
  // authored fallback. The fallback still shows if the call settles with nothing
  // (a real failure), so a skeleton never sticks. AI off = no wait, no skeleton.
  const [feelingsLoading, setFeelingsLoading] = useState(false);
  const [reframeLoading, setReframeLoading] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
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
  // The fill-in composer's blanks at the respond step (relational feelings). Her
  // words, so the draft is seeded from these rather than drafted by the model.
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  /** The close celebration's two stages: the wrapped gift, then the scratch
   *  card. `giftOpened` reveals the card; `revealed` is set once she has
   *  scratched enough, which surfaces the "saved to your Soul" line and Done. */
  const [giftOpened, setGiftOpened] = useState(false);
  const [revealed, setRevealed] = useState(false);
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
  // Speak-to-type on the entry: each finished phrase appends to the draft.
  const dictation = useDictation((t) => setDraft((d) => (d.trim() ? d.trim() + ' ' : '') + t));
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
  const carveEcho = verdict?.kind === 'clear' ? verdict.echo : COPY.together;
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
    // earlier one never shows a stale pick or a half-open field. The model
    // orderings clear too, so re-entering a beat re-asks rather than reusing a
    // ranking made against different text.
    setReframePick(null);
    setReframeReadings(null);
    setClarifyMoreContext(false);
    setBodyPrepOpen(false);
    setBodyPrepInList(false);
    setReminderOpen(false);
    setActOrder(null);
    setActDrafting(false);
    setActDraft('');
    setFillValues({});
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
    if (!aiOn) return;
    const her = herText.current.trim();
    if (!her) return;
    // Ask the model to say her words back. echo() vets the reply (grounded, not
    // a self-attack) and returns via 'model' only when it earns the screen;
    // anything else keeps the carve. The stream holds until this settles.
    setEchoResolving(true);
    echo(provider, 'acknowledge', her)
      .then((r) => setModelEcho(r.via === 'model' ? r.text : null))
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

  /** Whether the "now" tap should open a draft rather than act straight away.
   *  Only where there are words to help with: a message to send, or a direct or
   *  preparatory move she has to say or do. A pure self-soothing act gets no
   *  draft, and neither does anything when the provider is off. */
  const wantsDraft = useCallback(
    (a: Act | null) =>
      aiOn && a != null && (a.channel === 'message' || a.rung === 'direct' || a.rung === 'prep'),
    [aiOn],
  );

  /** Open the draft view and ask the moon for a start. Null (or no provider)
   *  leaves the field empty, which reads as "write your own". */
  const openActDraft = useCallback(
    (a: Act) => {
      setActDrafting(true);
      setActDraft('');
      setActDraftLoading(true);
      draftAct(provider, herText.current.trim(), chosenFeeling.current, a.label, pmsActive.current ? CYCLE_NOTE : undefined)
        .then((t) => setActDraft(t ?? ''))
        .catch(() => {})
        .finally(() => setActDraftLoading(false));
    },
    [provider],
  );

  /** Open the draft view seeded with text she composed herself (the fill-in
   *  template), skipping the model draft: these are already her words. */
  const openActDraftWith = useCallback((text: string) => {
    setActDrafting(true);
    setActDraft(text);
    setActDraftLoading(false);
  }, []);

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
  // task). A draft act opens the editor; a self act goes straight to the if-then.
  const beginAct = (a: Act | null) => {
    if (!a) return;
    if (wantsDraft(a)) {
      openActDraft(a);
      go('options', 'picks');
    } else {
      if (a.channel === 'message') Linking.openURL('sms:').catch(() => {});
      setHistory((h) => [...h, 'options']);
      setCurrent('today_action');
    }
  };

  // C10: park the move on Today and, if she picked a time, schedule a local
  // reminder. A denied permission (or no time) just saves it, no reminder.
  const saveForLater = async (date: Date | null) => {
    const a = chosenAct;
    if (a) addPlannedAction(a.label).catch(() => {});
    if (date) {
      const ok = await scheduleActionReminder(
        a ? `You saved "${a.label}" for later.` : 'A response you saved is waiting.',
        date,
      );
      setSnack(ok ? 'Saved, I will remind you' : COPY.added_today);
    } else {
      setSnack(COPY.added_today);
    }
    setReminderOpen(false);
    closeActDraft();
    go('act', 'later');
  };

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
      // M6: for a clear sentence, ask the model in the background whether it holds
      // a concrete event, while she rates. If it says no, the rating card routes
      // her to clarify for context. Null (pending/off/failed) never clarifies.
      eventCheck.current = null;
      if (aiOn && v.kind === 'clear') {
        hasConcreteEvent(provider, text)
          .then((r) => {
            eventCheck.current = r;
          })
          .catch(() => {});
      }
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
      setClarifyMoreContext(false);
      setCurrent('clarify');
    }
  }, [current, draft, startEcho, aiOn, provider]);

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

  // M28: the moon's bloom on the finish. 0 at rest; on Done it eases to 1, a
  // gentle swell and brighten of the moon behind the card.
  const moonBloom = useSharedValue(0);
  const moonBloomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + moonBloom.value * (reduceMotion ? 0 : 0.14) }],
    opacity: 0.8 + moonBloom.value * 0.2,
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

  // Feelings PICK: once the echo is confirmed and the naming shows, ask the
  // model to reorder the closed feeling set. Null keeps the deterministic order.
  useEffect(() => {
    if (!aiOn || !echoOk || current !== 'acknowledge' || feelingOrder) return;
    const her = herText.current.trim();
    if (!her) return;
    let alive = true;
    setFeelingsLoading(true);
    pick(provider, 'feelings', her, FEELING_SET, 3, (f) => f.label)
      .then((r) => {
        if (alive) setFeelingOrder(r.items.map((f) => f.label));
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
    const cycle = pmsActive.current ? `\n${CYCLE_NOTE}` : '';
    const user = `she wrote: "${her}"\nshe feels: ${chosenFeeling.current || 'upset'}${cycle}`;
    let alive = true;
    setReframeLoading(true);
    composeReadings(provider, user)
      .then((r) => {
        if (alive && r) setReframeReadings(r);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setReframeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, current, reframeReadings, provider]);

  // Options PICK: rank the acts, but keep the safety invariant that one direct,
  // one prep and one self are always offered together. The model only sets which
  // act wins each rung and their order; it never removes a rung.
  useEffect(() => {
    if (!aiOn || current !== 'options' || actOrder) return;
    const her = herText.current.trim();
    if (!her) return;
    const pool = offerableActs(false);
    const cycle = pmsActive.current ? `\n${CYCLE_NOTE}` : '';
    let alive = true;
    setOptionsLoading(true);
    pick(provider, 'options', `${her}\nshe feels: ${chosenFeeling.current}${cycle}`, pool, pool.length, (a) => a.label)
      .then((r) => {
        if (!alive) return;
        const firstOf = (rung: Act['rung']) => r.items.find((a) => a.rung === rung);
        const three = [firstOf('direct'), firstOf('prep'), firstOf('self')].filter(
          (a): a is Act => a != null,
        );
        if (three.length === 3) setActOrder(three);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setOptionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, current, actOrder, provider]);

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
  const ui = crisis ? Crisis() : hydrating ? { body: null, cta: null } : Beat();

  return (
    <View style={styles.root}>
      {/* The flow now happens in FRONT of Home: same cosmic sky, and the moon
          behind the card (M28), instead of the old aurora. */}
      <CosmicBackground />
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
      {/* On the finish the sky dims so the moon and confetti carry the moment. */}
      <View style={[styles.scrim, celebrating && styles.scrimDim]} pointerEvents="none" />
      {celebrating && <CelebrationParticles style={styles.confetti} />}

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
              style={styles.scroll}
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
          {/* M1/#3: the card is top-anchored and hugs its content; this spacer
              takes the rest, so the top stays put and the bottom fits the beat. */}
          <View style={styles.spacer} />
        </KeyboardAvoidingView>
      </SafeAreaView>

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
              {/* Speak instead of type: dictation appends each finished phrase. */}
              <Pressable
                onPress={() => {
                  tap();
                  dictation.toggle();
                }}
                style={styles.micBtn}
                accessibilityRole="button"
                accessibilityLabel={dictation.listening ? 'Stop dictation' : 'Speak instead of typing'}
              >
                <SymbolView
                  name={dictation.listening ? 'mic.fill' : 'mic'}
                  size={18}
                  tintColor={dictation.listening ? '#F2A2C0' : 'rgba(255,255,255,0.55)'}
                />
                <Text style={styles.micText}>{dictation.listening ? 'Listening…' : 'Speak instead'}</Text>
              </Pressable>
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
        const reason: ClarifyReason = clarifyMoreContext
          ? 'more-context'
          : verdict?.kind === 'unclear'
            ? verdict.reason
            : 'no-event';
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
                {aiOn && feelingsLoading && !feelingOrder ? (
                  <SkeletonRows count={4} />
                ) : (
                  <>
                {(feelingOrder ?? offerFeelings(herText.current)).map((f, i) => (
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
                    index={(feelingOrder ?? offerFeelings(herText.current)).length}
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
                <Text style={styles.settles}>{COPY.make_safe_care_ask}</Text>
                <Checklist
                  items={MAKE_SAFE_BODY}
                  isChecked={(id) => !!bodyChecks[id]}
                  onToggle={(id) => setBodyChecks((c) => ({ ...c, [id]: !c[id] }))}
                  emphasizeTitle
                />
                <Text style={styles.settles}>{COPY.make_safe_why}</Text>
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
          body: (
            <>
              {head(COPY.make_safe_intro)}
              <Text style={styles.settles}>{COPY.make_safe_why}</Text>
              <View style={styles.stack}>
                {/* "Now" opens the body-prep page (no tint: it opens a page in
                    place, it does not advance the beat). "Wait" is the recommended
                    hold and advances to the settling menu. */}
                <OptionRow
                  label={COPY.make_safe_now}
                  index={0}
                  onPress={() => setBodyPrepOpen(true)}
                />
                <OptionRow
                  label={COPY.make_safe_wait}
                  index={1}
                  recommended
                  tint={selTint}
                  onPress={() => {
                    resetActivities();
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
                  {aiOn && reframeLoading && !reframeReadings ? (
                    <SkeletonRows count={3} />
                  ) : (
                    (reframeReadings ?? SETS.smallReframes).map((r, i) => (
                      <OptionRow
                        key={r}
                        label={r}
                        index={i}
                        hint="Suggested by the moon"
                        tint={selTint}
                        onPress={() => setReframePick(r)}
                      />
                    ))
                  )}
                </View>
                {/* Her own answer, apart from the moon's readings and plainly
                    authored: "none of them are true" is a real answer, and it
                    skips the follow-up because there is no line to ask whether
                    it helped. */}
                <OptionRow
                  label={COPY.reframe_small_none}
                  index={(reframeReadings ?? SETS.smallReframes).length}
                  tint={selTint}
                  onPress={() => go('reframe_small', 'small_no')}
                />
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
              <ScaleButtons
                value={intensity}
                onChange={(n) => {
                  setIntensity(n);
                  pickThenGo(() => {
                    setIntensity(null);
                    baseline.current = n;
                    // clarify fires for a thin entry, or (M6) when her sentence was
                    // clear but the model found no concrete event: ask for context.
                    setHistory((h) => [...h, 'intensity_in']);
                    const vague = verdict?.kind === 'clear' && eventCheck.current === false;
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
        // Relational feelings compose via the fill-in ("I felt __ when __, I need
        // __"), seeded with the feeling. Continue runs the crisis scan on her
        // words, then seeds the draft editor (Edit with Moon + send). The calming
        // act cards stay the path for hot feelings (plan.composer 'cards') and are
        // reachable from the draft's skip.
        if (plan.composer === 'fill' && plan.template && !nudgeHold) {
          const template = plan.template;
          const sayAct = offerableActs(false).find((a) => a.id === 'A');
          if (sayAct) {
            const ready = !!fillValues.trigger?.trim() && !!fillValues.need?.trim();
            return {
              body: (
                <>
                  {head(COPY.options)}
                  <WhyLine>{plan.science}</WhyLine>
                  <FillInTemplate
                    parts={template}
                    values={fillValues}
                    onChange={(k, v) => setFillValues((p) => ({ ...p, [k]: v }))}
                  />
                  <Text style={styles.settles}>{UNIVERSAL_DV_LINE}</Text>
                </>
              ),
              cta: (
                <BeginButton
                  fullWidth
                  label="Continue"
                  disabled={!ready}
                  onPress={() => {
                    const text = assemble(template, fillValues);
                    if (analyse(text).kind === 'crisis') {
                      setCrisis(true);
                      return;
                    }
                    setChosenAct(sayAct);
                    openActDraftWith(text);
                    go('options', 'picks');
                  }}
                />
              ),
            };
          }
        }
        return {
          body: (
            <>
              {head(COPY.options)}
              <WhyLine>{plan.science}</WhyLine>
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
                {(actOrder ?? threeRungs(offerableActs(false))).map((a, i) => (
                  <OptionRow
                    key={a.id}
                    label={a.label}
                    index={i}
                    tint={selTint}
                    // C7: gently steer to the self-directed calming move (it sits
                    // last), so the eye lands there rather than on confronting first.
                    recommended={a.rung === 'self'}
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
                {/* C6: after-fight repair, only when her words point to a conflict. */}
                {CONFLICT_CUES.test(herText.current) && (
                  <OptionRow
                    label="Make up after the fight"
                    index={5}
                    tint={selTint}
                    onPress={() => router.push('/couples-reconnect')}
                  />
                )}
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
                <Text style={styles.settles}>{COPY.make_safe_care_ask}</Text>
                <Checklist
                  items={MAKE_SAFE_BODY}
                  isChecked={(id) => !!bodyChecks[id]}
                  onToggle={(id) => setBodyChecks((c) => ({ ...c, [id]: !c[id] }))}
                  emphasizeTitle
                />
                <Text style={styles.settles}>{COPY.make_safe_why}</Text>
              </>
            ),
            cta: <BeginButton fullWidth label="Done" onPress={() => setBodyPrepInList(false)} />,
          };
        }
        return {
          body: (
            <>
              {head(COPY.activities_intro)}
              <View style={styles.stack}>
                <OptionRow
                  label={COPY.activities_colour}
                  index={0}
                  recommended
                  done={activitiesDone.has('colour')}
                  tint={selTint}
                  onPress={() => router.push('/paint')}
                />
                <OptionRow
                  label={COPY.activities_story}
                  index={1}
                  done={activitiesDone.has('story')}
                  tint={selTint}
                  onPress={() => router.push('/story')}
                />
                <OptionRow
                  label={COPY.activities_move}
                  index={2}
                  done={activitiesDone.has('move')}
                  tint={selTint}
                  onPress={() => router.push('/move')}
                />
                <OptionRow
                  label={COPY.activities_breath}
                  index={3}
                  done={activitiesDone.has('breath')}
                  tint={selTint}
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
                {/* C5: quick regulation, the fast body resets. No tint: they show
                    a how-to line in place, they do not advance the beat. */}
                <OptionRow
                  label="Cold water"
                  index={4}
                  onPress={() => setSnack('Run cold water over your wrists, or splash your face. About 30 seconds.')}
                />
                <OptionRow
                  label="Relax your shoulders"
                  index={5}
                  onPress={() => setSnack('Drop your shoulders down. Unclench your jaw. Three slow breaths.')}
                />
                {/* M8 (wait path): body-prep as a settling item. No tint: it opens
                    the checklist in place rather than advancing the beat. */}
                <OptionRow
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

      // The "when" page: her chosen move at the head, then when to do it. "Now"
      // opens a draft the moon writes for the moves that have words to say (a
      // message, a direct or prep move); she edits it or asks to change it, then
      // sends or does it. For a pure self act, or with AI off, "now" carries it
      // out directly (a message act opens the blank iOS Messages compose). Then
      // the if-then. "Later" steps out to Today. "Another" reopens the menu.
      case 'act': {
        const a = chosenAct;

        // C10: the "when should I remind you" chooser, opened from Do-this-later.
        if (reminderOpen) {
          return {
            body: (
              <>
                {head(a?.label ?? COPY.options)}
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
                {head(a?.label ?? COPY.options)}
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
                {/* M20: no "skip", just Done. "Do this later" opens the C10
                    when-chooser (park on Today, optionally set a reminder). */}
                <Pressable onPress={() => setReminderOpen(true)} style={styles.skipLink}>
                  <Text style={styles.skipLinkText}>{COPY.act_later}</Text>
                </Pressable>
              </>
            ),
            cta: (
              <BeginButton
                fullWidth
                label={a?.channel === 'message' ? COPY.act_draft_send : COPY.act_draft_do}
                disabled={actDraftLoading}
                onPress={() => {
                  const text = actDraft.trim();
                  // Prefill Messages with her draft (no recipient); she still
                  // reads it and taps send herself. Non-message acts just proceed.
                  if (a?.channel === 'message') {
                    const url = text ? `sms:&body=${encodeURIComponent(text)}` : 'sms:';
                    Linking.openURL(url).catch(() => {});
                  }
                  closeActDraft();
                  go('act', 'now');
                }}
              />
            ),
          };
      }

      // Fill in to remember: a coping if-then she keeps for next time, seeded
      // with the move she just chose. She fills only the response; the trigger
      // ("if I feel anxious for this reason") is fixed, never an invented detail.
      case 'today_action':
        return {
          body: (
            <>
              {head(COPY.today_action_head)}
              <WhyLine>{COPY.today_action_why}</WhyLine>
              {/* M21: the if-then as a dashed fill-in. The trigger half is fixed
                  copy; she fills only the response, seeded with the move she
                  just chose. */}
              <FillInTemplate
                parts={[
                  `${COPY.today_action_if} `,
                  { key: 'response', placeholder: chosenAct?.label ?? COPY.today_action_hint },
                ]}
                values={{ response: draft }}
                onChange={(_k, v) => setDraft(v)}
              />
            </>
          ),
          cta: (
            <BeginButton
              fullWidth
              label="Continue"
              onPress={() => {
                setDraft('');
                go('today_action');
              }}
            />
          ),
        };

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
              onPress={() => {
                // M28: the sky dims, the moon blooms and confetti falls, then out.
                tap();
                setCelebrating(true);
                moonBloom.value = withTiming(1, { duration: 900 });
                setTimeout(leave, 1600);
              }}
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
      cta: <BeginButton fullWidth label="Close" onPress={leave} />,
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
  // C4: the low + mixed lanes render generically, so they read from here.
  low_activate: COPY.low_activate,
  low_justone: COPY.low_justone,
  low_reward: COPY.low_reward,
  low_better: COPY.low_better,
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
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 28,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    // A real surface under the glass, so the card reads as a panel floating on
    // the aurora instead of blending into it. This is the "break" the page was
    // missing — the sky above, a defined card below.
    backgroundColor: colors.surfaceOverlay,
    overflow: 'hidden',
    // A CAP, not a height: the card is only as tall as its content, so short
    // beats still leave most of the sky showing. Raised from 78% because the
    // long cards were scrolling with Continue below the fold while a third of
    // the screen above sat empty. Growing upward costs nothing on short cards
    // and removes the scroll on nearly every one.
    maxHeight: '92%',
  },
  // M1: the flow beats share one height so the card and its Continue button stop
  // jumping as content length changes between beats. The extra room falls below
  // the content (short beats just leave space); intro and crisis keep their own
  // content-sized layout (they are exempted at the call site).
  cardFixed: { height: '92%' },
  // With cardFixed giving the card a set height, the scroll fills the space
  // between header and the pinned CTA, so the button sits at the same spot every
  // beat. On the content-sized cards (intro/crisis) it collapses to content.
  // flexShrink (not flex:1): the scroll hugs short content, but still shrinks to
  // scroll inside the card's maxHeight cap on a long beat.
  scroll: { flexShrink: 1 },
  glass: { borderRadius: 28, borderCurve: 'continuous' },
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
    backgroundColor: v3.panel,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    padding: spacing.lg,
    minHeight: 120,
    maxHeight: 200,
  },
  // Speak-instead: a quiet mic row under the entry field.
  micBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', paddingVertical: spacing.sm },
  micText: { fontFamily: fonts.light, fontSize: fontScale.caption, color: colors.textSubtitle },
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
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 25,
    letterSpacing: 0,
    color: colors.textTertiary,
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
  // "Body prep" heading over the self-check list: same size, more weight.
  settlesStrong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    lineHeight: 22,
    color: colors.textPrimary,
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
