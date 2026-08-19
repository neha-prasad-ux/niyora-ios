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

import { type ComponentProps, useCallback, useEffect, useRef, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import { CRISIS_COPY, scanForAbuse, DV_RESOURCE, openDvLine, openDvIntlLine } from '@/lib/crisis-scan';
import { runAiCrisisGuard } from '@/lib/crisis-guard';
import { CrisisSheet } from '@/components/CrisisSheet';
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
import {
  pick,
  draftAct,
  revise,
  hasConcreteEvent,
  reflectCard,
  factSort,
  factSortAdvise,
  reflectChat,
  ruleBreakdown,
  type MomentProvider,
  type RuleBreakdown,
} from '@/v3/moment-ai';
import {
  AI_THINKING,
  FACTSORT,
  FACTSORT_CARDS,
  FEELING_GUESS,
  PMS_NOTE,
  REFLECT_CARDS,
  REFLECT_CYCLE_NOTE,
  RULE_LABELS,
  SETTLE,
  detectSignals,
  routeCards,
  secondLensFor,
  lensForText,
  type Claim,
  type ReflectCardId,
} from '@/v3/reflect-cards';
import { optionPlanFor, personalisedLabel } from '@/v3/option-plan';
import {
  reactionAt,
  reactionKey,
  feedbackClause,
  type PointReactions,
  type Reaction,
} from '@/v3/reflect-feedback';
import { getMomentProvider, type CrisisType } from '@/lib/moment-gemini';
import { getMoonConsent, setMoonConsent } from '@/store/moon-consent';
import { MeetMoonConsent } from '@/app/onboarding-v3';
import { foldLedger } from '@/lib/moon-light';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';
import { getPmsPrefs } from '@/store/pms-prefs';
import { isInPmsWindow } from '@/lib/pms-window';
import { scheduleActionReminder } from '@/lib/notifications';
import { MOON_DRAWINGS } from '@/components/moment/moon-drawings';
import {
  addMoment,
  badgeFor,
  updateLatestMomentResponse,
  getMoments,
  type Badge,
  latestForSubject,
  recentSubjects,
  subjectCount,
  type MomentRecord,
} from '@/store/moment-history';
import { pickSubject, subjectOf } from '@/lib/moment-subject';
import {
  clearMomentCheckpoint,
  getMomentCheckpoint,
  saveMomentCheckpoint,
} from '@/store/moment-resume';
import { useDictation } from '@/hooks/use-dictation';
import type { MoonState } from '@/lib/moon-light';
import { bodyHue } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { moon } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
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
// PMS deliberately no longer changes tone, reads, or responses (Neha 2026-08-11).
// The ONLY PMS behaviour is the auto heads-up note (PMS_NOTE) — the app must never
// dismiss her feeling as hormonal ("the week talking / it will pass"). Kept as an
// empty string so the `pmsActive.current ? CYCLE_NOTE : ...` prompt sites inject
// nothing. Do NOT re-populate — the PMS tone dose was removed on purpose.
const CYCLE_NOTE = '';

// The AI content for a reflect card. draft/guess cards go through a per-card
// gemini slot (REFLECT_CARDS[id].slot); question cards need no AI.
export type ReflectContent = { line?: string; options?: string[] };

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
  // The "Let's work through this together" intro is a first-run orientation, not a
  // gate to sit through every time. On a normal start, skip straight to the entry
  // once she has seen it. Resume has its own start, so it needs no check.
  const [draft, setDraft] = useState('');
  // One good entry example, picked once per open so it rotates across sessions
  // (partner / family / work) without crowding the screen with all three.
  const [goodExample] = useState(
    () => COPY.raw_entry_examples_good[
      Math.floor(Math.random() * COPY.raw_entry_examples_good.length)
    ],
  );
  const [intensity, setIntensity] = useState<number | null>(null);
  /** What the app decided about her sentence. Drives clarify vs the feeling guess. */
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  /** M6: the clarify was reached because her entry was a clear sentence but had
   *  no concrete event (the model gate), so ask for context, not "what happened". */
  const [clarifyMoreContext, setClarifyMoreContext] = useState(false);
  /** She chose to name it herself, so the field is showing. */
  const [otherOpen, setOtherOpen] = useState(false);
  /** The Gemini provider, resolved once. NO_PROVIDER (authored fallback) unless
   *  the flag and a key are set, so the store build behaves exactly as before. */
  const [provider] = useState(getMomentProvider);
  // Consent backstop (Apple 5.1.2(i)): the now.tsx modal gates the Home entry,
  // but /moment is also reachable from the prep card, a today-action, and a PMS
  // notification. This is the one gate that covers every route: null = still
  // loading (never fire AI in this window), false = must agree first, true = go.
  const [consentGranted, setConsentGranted] = useState<boolean | null>(null);
  useEffect(() => {
    getMoonConsent().then(setConsentGranted);
  }, []);
  // aiOn is the single lever every AI send already checks (`if (!aiOn) return`),
  // so ANDing consent here blocks all reflection-text egress until she agrees.
  const aiOn = provider.name !== 'none' && consentGranted === true;
  // --- Reflect cards (Reflect → Regulate → Respond spine, 2026-08-09) ---------
  /** The routed card ids for this thought (detectSignals + routeCards). Null
   *  until she enters the reflect beat; re-derived from herText on resume. */
  const [reflectCards, setReflectCards] = useState<ReflectCardId[] | null>(null);
  /** Which card she is on. An additive "no" walks this forward. */
  const [reflectIdx, setReflectIdx] = useState(0);
  /** AI content per card id (draft line / guess options). Missing → the card
   *  renders its authored fallback, so a cold or unwired slot never blocks her. */
  const [cardContent, setCardContent] = useState<Record<string, ReflectContent>>({});
  const [cardLoading, setCardLoading] = useState(false);
  /** The active card's AI fetch returned nothing (timeout / empty / HTTP). Drives
   *  the "Moon isn't responding, try again" state on every reflect card instead of
   *  a silent authored fallback (Neha 2026-08-10). Reset per card; retry bumps
   *  `reflectRetry` to refetch. */
  const [cardFailed, setCardFailed] = useState(false);
  const [reflectRetry, setReflectRetry] = useState(0);
  /** Per-read reactions across the reflect flow (2026-08-12): heart = resonates,
   *  cross = not this, absent = neutral. Keyed by (scope + index) with the read's
   *  text stored in the value; see reflect-feedback.ts. Lives here beside
   *  cardContent so it survives card re-renders. Fed to the AI via feedbackClause
   *  through reactionsRef below (2026-08-13). */
  const [reactions, setReactions] = useState<PointReactions>({});
  /** A ref mirror of `reactions`, so the fetch effects can fold her latest
   *  heart/cross history into the prompt at generation time WITHOUT listing
   *  `reactions` in their deps (which would refetch the card on every tap). */
  const reactionsRef = useRef<PointReactions>({});
  useEffect(() => {
    reactionsRef.current = reactions;
  }, [reactions]);
  /** Keyboard is up (a field is focused). While typing, the primary action(s) hide
   *  so a tap meant for send never lands on "Respond"/a chip sitting just above the
   *  field (Neha 2026-08-11). */
  const [keyboardUp, setKeyboardUp] = useState(false);
  /** The "we could also see it like this" second lens (Neha 2026-08-10): when the
   *  context she adds surfaces a NEW frame, its card id is set here and its reads
   *  render inline below the current card. Null = the context only sharpened the
   *  same thread. Its content lives in `cardContent[secondLensId]`. Reset per card. */
  const [secondLensId, setSecondLensId] = useState<ReflectCardId | null>(null);
  const [secondLensLoading, setSecondLensLoading] = useState(false);
  /** A guess card's "none of these" is open: show-me-others + an optional
   *  "add more context" field that re-runs the same slot with her steer. */
  const [steerOpen, setSteerOpen] = useState(false);
  /** Fact-sort cards (fact_or_fear, know_or_guess): her thought split into
   *  claims she sorts fact-vs-read. null = not fetched, [] = declined (falls back
   *  to the plain question echo). `factStage` walks sort → result. */
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [factStage, setFactStage] = useState<'sort' | 'result'>('sort');
  const [factAdvise, setFactAdvise] = useState<{ reads: string[]; help: string } | null>(null);
  /** The `rule` special card: her moment as a chain (event → the hidden rule →
   *  where it lands) plus the reactable tests. null = not fetched / cleared for a
   *  re-roll; the rule fetch effect refetches whenever it is null on that card. */
  const [ruleChain, setRuleChain] = useState<RuleBreakdown | null>(null);
  const [factLoading, setFactLoading] = useState(false);
  /** The PMS heads-up banner has been dismissed ("Got it") for this moment. */
  const [pmsDismissed, setPmsDismissed] = useState(false);
  /** The bounded reflective chat on the fact-sort result: her turns and Moon's,
   *  crisis-guarded per message, gently landed after a few turns. */
  const [chatLog, setChatLog] = useState<ChatTurn[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  /** The general "keep reflecting" chat, opened when she picks "Let's reflect more"
   *  but the routed cards are used up. Same bounded chat as the fact-sort result. */
  const [chatOpen, setChatOpen] = useState(false);
  /** A draft card's edit field is open (she is taking the words as her own). */
  const [reflectEditing, setReflectEditing] = useState(false);
  /** A reality card's "no": we back off and validate, and never reframe again. */
  const [reflectValidated, setReflectValidated] = useState(false);
  /** The pullable cycle note (PMS_NOTE) is expanded. Pull-only, never auto. */
  const [pmsOpen, setPmsOpen] = useState(false);
  /** The FULL ranked act pool from the model (null → authored order). The menu
   *  shows one-per-rung from this; `showAllActs` expands it to the rest when she
   *  taps "Show me other options". */
  const [actOrder, setActOrder] = useState<Act[] | null>(null);
  const [showAllActs, setShowAllActs] = useState(false);
  // M3: while the model is ranking/writing, show a skeleton instead of the
  // authored fallback. The fallback still shows if the call settles with nothing
  // (a real failure), so a skeleton never sticks. AI off = no wait, no skeleton.
  const [optionsLoading, setOptionsLoading] = useState(false);
  // The model's ranking of the feeling set (null → the deterministic offerFeelings
  // order). The AI orders the list; it never asserts one as the answer.
  const [feelingOrder, setFeelingOrder] = useState<string[] | null>(null);
  const [feelingsLoading, setFeelingsLoading] = useState(false);
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
  /** The word she settled on, hers or ours. */
  const chosenFeeling = useRef('');
  /** Whether today is inside her premenstrual window (C2). Loaded once on mount;
   *  gates the CYCLE_NOTE added to the reframe/ranking/draft prompts. */
  const pmsActive = useRef(false);
  /** The FIRST reflect card's AI content, warmed at send() so the ~3-5s compose
   *  runs during the echo + feeling-guess beats and the card lands instantly when
   *  she reaches Reflect, rather than making her wait. Only for a draft/guess
   *  first card; a question-mode first card needs no AI (stays null). */
  const reflectPrefetch = useRef<Promise<ReflectContent> | null>(null);
  /** Once-per-session guard so the moment is saved to My Soul exactly once. It used
   *  to save only at the final gift scratch, so any session that didn't complete
   *  the whole arc never appeared in My Soul (Neha 2026-08-15). Now it saves when
   *  she finishes reflecting. */
  const momentSaved = useRef(false);
  /** M6 context gate: the AI "is there a concrete event here?" check, fired at
   *  send() so it runs during the echo + feeling-guess beats and is settled by the
   *  time she reaches the first reflect card. Consumed once under that card's
   *  spinner; a confident `false` reroutes her to clarify, anything else proceeds. */
  const eventGate = useRef<Promise<boolean | null> | null>(null);
  /** Extra context she typed on a guess card, appended to the slot prompt on the
   *  next re-roll. Empty = a blind "show me others". Reset per card. */
  const reflectSteer = useRef('');
  /** Re-rolls used on the current guess card. Capped so it never becomes a slot
   *  machine — past the cap, "none of these" advances instead of re-rolling. */
  const rerolls = useRef(0);
  // C3: counts forward steps, to rotate the per-step praise line.
  const stepN = useRef(0);
  // The reward badge for THIS moment: the constellation of the feeling she just
  // worked through (Neha 2026-08-19). A new constellation claims the next drawing;
  // a repeat re-shows the drawing she already has with one more golden star. Loaded
  // from history when she reaches the close, so the star count includes this one.
  const [badge, setBadge] = useState<Badge | null>(null);
  const rewardBumped = useRef(false);
  // M28: on Done the sky dims and the moon behind the card blooms + confetti.
  const [celebrating, setCelebrating] = useState(false);
  // Speak-to-type on the entry: each finished phrase appends to the draft. The
  // suppress ref lets `send` fold the in-progress phrase itself (so she can send
  // mid-dictation without stopping the mic first) and drop the duplicate final
  // result the recognizer emits when we stop it on that send.
  const dictationSuppress = useRef(false);
  /** The prior moment on the same thread she is continuing (mom / work / ...),
   *  loaded async at send() from on-device history. Set → its entry/feeling/
   *  response become context so Moon builds on it instead of starting cold. Reset
   *  per submission. */
  const priorThread = useRef<MomentRecord | null>(null);
  /** Whether this entry's subject has been worked through 2+ times before — flips
   *  the `pattern` reflect card on. Loaded async at send() alongside priorThread. */
  const recurring = useRef(false);
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
    // The keep-reflecting chat: step back onto the card behind it.
    if (chatOpen) {
      setChatOpen(false);
      return;
    }
    // Reflect sub-screens: unwind the validate back-off, the draft edit field, an
    // open PMS note, then walk back through the routed cards, each in place.
    if (reflectValidated) {
      setReflectValidated(false);
      return;
    }
    if (reflectEditing) {
      setReflectEditing(false);
      setDraft('');
      return;
    }
    if (pmsOpen) {
      setPmsOpen(false);
      return;
    }
    if (current === 'reflect' && reflectIdx > 0) {
      setReflectIdx((n) => n - 1);
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
    // earlier one never shows a stale pick or a half-open field. Reflect state is
    // re-derived on re-entry (routeCards is deterministic), so drop it here.
    setReflectValidated(false);
    setReflectEditing(false);
    setPmsOpen(false);
    if (prev !== 'reflect') {
      setReflectCards(null);
      setReflectIdx(0);
    }
    reflectPrefetch.current = null; // drop a warmed card tied to the old text
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
    // Restore her entry text when stepping back onto the entry beat, so hitting
    // back never wipes what she wrote (Neha 2026-08-13). Other beats start clean.
    setDraft(prev === 'raw_entry' ? herText.current : '');
    setCurrent(prev);
  };

  /** Leave naming for the reflect-card system: route her thought and land on the
   *  first card. Called from the feeling guess, or straight from send() when she
   *  already named a feeling in her text (the guess is skipped then). */
  const enterReflect = (feeling: string, from: NodeId = 'feelings') => {
    chosenFeeling.current = feeling;
    setReflectCards(routeCards(detectSignals(herText.current, recurring.current)));
    setReflectIdx(0);
    setReflectEditing(false);
    setReflectValidated(false);
    setChatOpen(false);
    setSteerOpen(false);
    reflectSteer.current = '';
    rerolls.current = 0;
    momentSaved.current = false; // fresh moment → save it again when she finishes
    setPmsOpen(false);
    setCardContent({});
    setOtherOpen(false);
    setDraft('');
    setHistory((h) => [...h, from]);
    setCurrent('reflect');
  };

  /** Thread pickup + recurrence, from on-device history (Neha 2026-08-11). Fired
   *  fire-and-forget at send() so it never blocks her: by the time she reaches
   *  Reflect (a few beats later, via the feeling guess) both refs are usually set.
   *  priorThread → Moon continues the thread; recurring → the `pattern` card fires. */
  const loadThread = useCallback(async (text: string) => {
    try {
      const moments = await getMoments();
      const subject = pickSubject(text, recentSubjects(moments));
      priorThread.current = subject ? latestForSubject(moments, subject) : null;
      const named = subjectOf(text);
      recurring.current = named ? subjectCount(moments, named) >= 2 : false;
    } catch {
      priorThread.current = null;
      recurring.current = false;
    }
  }, []);

  /** The continuation preamble folded into the AI prompts when a prior thread is
   *  loaded, so Moon builds on the last time rather than starting cold. Empty when
   *  there is no thread to continue. */
  const threadPreamble = () => {
    const p = priorThread.current;
    if (!p) return '';
    const resp = p.response ? `, and her response was "${p.response}"` : '';
    return (
      `earlier she worked through this same thing. she wrote "${p.entry}", felt ` +
      `${p.feeling}${resp}. This is a continuation, so build on it, do not treat it ` +
      `as brand new. Never use dashes of any kind in your reply.\n`
    );
  };

  /** She took a card (accepted the reading, or owned it by editing): reflection is
   *  done, on to regulate. */
  /** Save this moment to My Soul, once per session. Called when she finishes
   *  reflecting (not only at the final gift), so a named-and-worked-through feeling
   *  reliably lands in My Soul even if she never reaches the celebration. Response
   *  is included when it already exists (a completed act). */
  const persistMoment = () => {
    if (momentSaved.current) return;
    const feeling = chosenFeeling.current;
    if (!herText.current.trim() || !feeling) return;
    momentSaved.current = true;
    addMoment({
      entry: herText.current,
      feeling,
      constellation: FEELING_SET.find((f) => f.label === feeling)?.constellation ?? '',
      subject: subjectOf(herText.current) ?? undefined,
      response: actDraft || undefined,
    }).catch(() => {});
  };

  const acceptReflect = () => {
    tap();
    setReflectEditing(false);
    setChatOpen(false);
    persistMoment(); // she worked the feeling through → it belongs in My Soul now
    go('reflect'); // "Yes, ready to regulate" → make_safe (the SETTLE gate)
  };

  /** An additive "no": walk to the next routed card, or to regulate if the set is
   *  exhausted. routeCards always leaves safe defaults at the tail, so this never
   *  dead-ends. */
  const advanceCard = () => {
    tap();
    setReflectEditing(false);
    setSteerOpen(false);
    reflectSteer.current = '';
    rerolls.current = 0;
    setDraft('');
    if (reflectCards && reflectIdx + 1 < reflectCards.length) {
      setReflectIdx((n) => n + 1);
    } else {
      setChatOpen(true); // cards used up → keep reflecting in the bounded chat
    }
  };

  const [moreLoading, setMoreLoading] = useState(false);
  /** Guess cards are the rephrasing: the calm comes from reading MORE angles, not
   *  picking one. This APPENDS fresh reads to the growing list (never replaces),
   *  optionally steered by `note`. The prompt is told what she has already seen so
   *  the new ones are genuinely different. */
  const moreReads = (note = '') => {
    if (!reflectCards || !aiOn || moreLoading) return;
    const id = reflectCards[reflectIdx];
    const card = REFLECT_CARDS[id];
    if (!card.slot) return;
    tap();
    const already = cardContent[id]?.options ?? [];
    const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
    const steer = note ? `\nmore context she added: "${note}"` : '';
    setMoreLoading(true);
    reflectCard(
      provider,
      card.slot,
      `${threadPreamble()}she wrote: "${herText.current.trim()}"\nshe feels: ${
        chosenFeeling.current || 'upset'
      }\nalready offered: ${JSON.stringify(already)}${steer}${cycle}${feedbackClause(reactionsRef.current)}`,
    )
      .then((r) => {
        if (r.options?.length) {
          setCardContent((c) => ({
            ...c,
            [id]: { options: [...(c[id]?.options ?? []), ...(r.options ?? [])] },
          }));
        }
      })
      .catch(() => {})
      .finally(() => setMoreLoading(false));
  };

  /** Record a per-read reaction. Heart/cross toggle: tapping the lit one again
   *  clears back to neutral. The read's text is stored so it stays queryable even
   *  after the list re-rolls. Returns true when this tap NEWLY rejects a read (so
   *  the caller can trigger the re-roll); like/neutral return false. */
  const recordReaction = (
    scope: string,
    index: number,
    text: string,
    next: Reaction,
  ): boolean => {
    tap();
    const key = reactionKey(scope, index);
    const cur = reactions[key]?.reaction;
    setReactions((m) => {
      const n = { ...m };
      if (cur === next) delete n[key]; // toggle off -> neutral
      else n[key] = { text, reaction: next };
      return n;
    });
    return next === 'reject' && cur !== 'reject';
  };

  /** Cross on the current reflect card: swap the rejected read for a fresh one via
   *  the EXISTING re-roll path — no new network call. Guess cards append a fresh
   *  read (moreReads); a draft's single line is refetched through the reflectRetry
   *  path (its generation scope bumps, so the crossed line's reaction is preserved,
   *  not inherited by the new line). The crossed read stays marked in `reactions`
   *  so it is still queryable. */
  const rerollRejectedRead = () => {
    if (!reflectCards) return;
    const id = reflectCards[reflectIdx];
    const card = REFLECT_CARDS[id];
    if (card.mode === 'draft') {
      setCardContent((c) => {
        const n = { ...c };
        delete n[id];
        return n;
      });
      setReflectRetry((k) => k + 1);
    } else {
      moreReads(); // guess: append a genuinely-different read (already-offered aware)
    }
  };

  // Resume, once, on mount: restore the carried state and land on the saved
  // beat. Only the narrative state is restored; per-beat UI re-derives itself
  // (the feeling guess re-ranks from her text). Nothing saved → render fresh.
  useEffect(() => {
    if (resume !== '1') return;
    let alive = true;
    getMomentCheckpoint()
      .then(async (cp) => {
        if (!alive || !cp) return;
        herText.current = cp.herText;
        // Re-derive the abuse flag from her saved text, so resuming into the
        // respond step never loses the suppression (the flag itself isn't stored).
        if (scanForAbuse(cp.herText)) setDvDetected(true);
        chosenFeeling.current = cp.chosenFeeling;
        setVerdict(cp.verdict);
        setChosenAct(cp.chosenAct);
        setSkippedHold(cp.skippedHold);
        setReadyLow(cp.readyLow);
        setHistory(cp.history);
        // A checkpoint written before the echo beat was removed points at the old
        // 'acknowledge' node; land it on the feeling guess so a mid-flow resume
        // never strands on a beat that no longer exists.
        setCurrent((cp.current as string) === 'acknowledge' ? 'feelings' : cp.current);
        // The card list is deterministic from her text, so a resume into Reflect
        // re-derives it and lands on the saved card index. Re-load the thread refs
        // first so the recovered route still reflects recurrence + continuation.
        if (cp.current === 'reflect') {
          await loadThread(cp.herText);
          if (!alive) return;
          setReflectCards(routeCards(detectSignals(cp.herText, recurring.current)));
          setReflectIdx(cp.reflectIdx);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setHydrating(false);
      });
    return () => {
      alive = false;
    };
  }, [resume, loadThread]);

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
    // The intro (ENTRY) and the entry card save nothing: there is nothing to
    // resume before she has actually spoken.
    if (current === ENTRY || current === 'raw_entry') return;
    saveMomentCheckpoint({
      current,
      history,
      herText: herText.current,
      chosenFeeling: chosenFeeling.current,
      reflectIdx,
      verdict,
      chosenAct,
      skippedHold,
      readyLow,
    }).catch(() => {});
  }, [current, history, crisis, verdict, chosenAct, skippedHold, readyLow, reflectIdx, hydrating]);

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
      draftAct(provider, herText.current.trim(), chosenFeeling.current, personalisedLabel(a, herText.current), [pmsActive.current ? CYCLE_NOTE : '', threadPreamble().trim()].filter(Boolean).join('\n') || undefined)
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
    // Save the chosen reminder time onto the plan record too, not only the OS
    // notification — otherwise the Today list never shows the time she picked.
    if (a) addPlannedAction(a.label, text || undefined, date?.toISOString()).catch(() => {});
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

    // The AI-recall + abuse half of the guard (shared crisis-guard.ts, used by
    // every free-text surface so coverage can't drift). Abuse does NOT stop the
    // flow here: she keeps the reflect/regulate help, but the respond menu drops
    // every act aimed at the person and a quiet resource is shown (latches on).
    // The model crisis layer is escalate-only and async, so it never blocks her
    // send; only an ACUTE read pulls her to the crisis screen a beat later.
    runAiCrisisGuard(text, {
      onAbuse: () => setDvDetected(true),
      onEscalate: (type) => {
        crisisType.current = type;
        setCrisis(true);
      },
    });

    // Her latest event text, kept for the feeling suggestions and the echo
    // correction prefill.
    herText.current = text;
    // Reset the thread refs for this submission, then load them async from history
    // (fire-and-forget, never blocks send). By the time she reaches Reflect they
    // are usually set; if not, the beat just lands without the continuation.
    priorThread.current = null;
    recurring.current = false;
    void loadThread(text);
    setVerdict(v);
    setDraft('');

    // A thin entry clarifies first; a clear one goes straight to the feeling guess
    // (the upfront 0-10 rating was cut 2026-08-09). Reflect is warmed here so its
    // first card lands instantly when she reaches it, a few beats later.
    // The echo beat (say her words back, then "Did I get that right?") was removed
    // 2026-08-13: it repeated her words without helping. A clear entry now opens on
    // the useful part, the feeling guess (or Reflect itself when she already named
    // the feeling). A thin entry still clarifies first.
    if (current === 'raw_entry') {
      if (v.kind !== 'clear') {
        setHistory((h) => [...h, 'raw_entry']);
        setClarifyMoreContext(false);
        setCurrent('clarify');
        return;
      }
      warmReflect(text);
      // M6 context gate, fired here so it settles during the beats before Reflect.
      // Only from raw_entry: a send from clarify means she has already been asked
      // for the event, so it must never re-clarify her into a loop.
      eventGate.current = aiOn ? hasConcreteEvent(provider, text) : null;
      const named = namedFeeling(text);
      if (named) {
        enterReflect(named, 'raw_entry');
      } else {
        setHistory((h) => [...h, 'raw_entry']);
        setCurrent('feelings');
      }
      return;
    }

    // From clarify. She has given the context now: same routing straight to the
    // feeling guess, or into Reflect when she already named a feeling.
    if (v.kind !== 'clear') {
      setHistory((h) => [...h, 'clarify']);
      setClarifyMoreContext(false);
      setCurrent('clarify');
      return;
    }
    warmReflect(text);
    const named = namedFeeling(text);
    if (named) {
      enterReflect(named, 'clarify');
    } else {
      setHistory((h) => [...h, 'clarify']);
      setCurrent('feelings');
    }
  }, [current, draft, aiOn, provider, dictation, loadThread]);

  /** Warm the FIRST routed reflect card at send-time, so it lands instantly when
   *  she reaches Reflect (kept from the old reframe prefetch). routeCards is a
   *  pure lexical read of her text, so the first card is known before the feeling
   *  is even named. A question-mode first card needs no AI. */
  const warmReflect = useCallback(
    (text: string) => {
      const first = routeCards(detectSignals(text))[0];
      const card = first ? REFLECT_CARDS[first] : null;
      const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
      reflectPrefetch.current =
        aiOn && card && card.slot && card.mode !== 'question' && card.id !== 'rule'
          ? reflectCard(provider, card.slot, `she wrote: "${text}"${cycle}`)
          : null;
    },
    [aiOn, provider],
  );

  // Track the keyboard so the primary action can hide while she types (see keyboardUp).
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  // Feelings PICK: the model RANKS the closed feeling set for her text (most
  // likely first), but it never asserts one as the answer — the screen stays a
  // neutral "which feeling is strongest?" picker she chooses from (Neha
  // 2026-08-01). Null keeps the deterministic offerFeelings order.
  useEffect(() => {
    if (!aiOn || current !== 'feelings' || feelingOrder) return;
    const her = herText.current.trim();
    if (!her) return;
    let alive = true;
    setFeelingsLoading(true);
    pick(provider, 'feelings', her, FEELING_SET, 3, (f) => f.label)
      .then((r) => {
        // Trust ONLY a real model ranking. On any AI failure (timeout, rate limit,
        // HTTP), pick returns the authored HEAD of the set — always Dismissed / Not
        // taken seriously / Angry, the "same three every time" she sees. Leaving
        // feelingOrder null in that case lets the render fall to the text-seeded
        // offerFeelings, which varies with her words.
        if (!alive || r.via !== 'model') return;
        // Pin a feeling she named outright back to the top: the model reorder is
        // free to rank the rest, never to bury the word she actually wrote.
        setFeelingOrder(pinFeeling(namedFeeling(her), r.items.map((f) => f.label)));
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setFeelingsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [aiOn, current, feelingOrder, provider]);

  // Work out the badge when she lands on the close step: by then the moment is
  // saved (persistMoment runs at accept), so history already counts this one.
  useEffect(() => {
    if (current !== 'close') return;
    let alive = true;
    const feeling = chosenFeeling.current;
    const constellation = FEELING_SET.find((f) => f.label === feeling)?.constellation ?? '';
    if (!constellation) return;
    getMoments()
      .then((all) => {
        if (alive) setBadge(badgeFor(all, constellation, MOON_DRAWINGS.length, feeling));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [current]);

  // Cycle context (C2): read her PMS window once on mount. A gentler reframe and
  // lower-stakes options fit while she is premenstrual; off otherwise.
  useEffect(() => {
    let alive = true;
    getPmsPrefs()
      .then((p) => {
        if (alive) {
          // The visible pull note only appears when she has actually added period
          // data, so require lastPeriodStart explicitly (not just pmsMode + window).
          pmsActive.current =
            p.pmsMode &&
            p.lastPeriodStart != null &&
            isInPmsWindow(p.lastPeriodStart, p.cycleLength, new Date());
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Reflect card CONTENT: fetch the AI line/options for the current draft/guess
  // card. question cards need no AI (they echo her words). The first card reuses
  // the send-time prefetch so it lands instantly; later cards fetch on arrival.
  // Missing content → the card renders its authored fallback, so a cold or
  // unwired slot never blocks the flow.
  //
  // Cycle context (REFLECT_CYCLE_NOTE) is added only when the PMS gate holds, and
  // only as a TONE dose: it warms the wording, it never names the cycle or uses it
  // as a reason. This is NOT the act-beat CYCLE_NOTE — that one could turn a reading
  // into "it's just your hormones" against a real grievance, which the reflect note
  // plus REFLECT_SAFETY explicitly forbid. Reflect offers gentler, never explains
  // her feeling away.
  useEffect(() => {
    if (current !== 'reflect' || !reflectCards) return;
    const id = reflectCards[reflectIdx];
    const card = REFLECT_CARDS[id];
    if (card.mode === 'question' || !card.slot) return; // no AI content
    if (id === 'rule') return; // special card, its own fetch (structured chain, not options)
    if (cardContent[id]) return; // already have it
    if (!aiOn) return; // authored fallback stands
    let alive = true;
    setCardLoading(true);
    const steer = reflectSteer.current
      ? `\nshe has now ADDED this to what she first wrote: "${reflectSteer.current}". Read the whole picture together, her first words AND this addition, and come back with richer reads that hold both. Do not just reword or re-tone the earlier reads.`
      : '';
    const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
    const user = `${threadPreamble()}she wrote: "${herText.current.trim()}"\nshe feels: ${chosenFeeling.current || 'upset'}${steer}${cycle}${feedbackClause(reactionsRef.current)}`;
    // The send-time prefetch is cold: it warmed card 0 for the NON-thread route
    // (recurring/priorThread aren't loaded yet at send). So skip reusing it when
    // either is now active — recurring makes `pattern` the new card 0, and a
    // prior thread needs the continuation folded in — and refetch instead.
    const pending =
      reflectIdx === 0 && reflectPrefetch.current && !steer && !priorThread.current && !recurring.current
        ? reflectPrefetch.current
        : reflectCard(provider, card.slot, user);
    pending
      .then((r) => {
        if (!alive) return;
        // Real content clears any prior failure; an empty reply IS a failure now
        // (it used to fall silently to authored reads).
        if (r.line || r.options?.length) {
          setCardContent((c) => ({ ...c, [id]: r }));
          setCardFailed(false);
        } else {
          setCardFailed(true);
        }
      })
      .catch(() => {
        if (alive) setCardFailed(true);
      })
      .finally(() => {
        if (alive) setCardLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [current, reflectCards, reflectIdx, cardContent, aiOn, provider, reflectRetry]);

  // Second lens fetch (Neha 2026-08-10): when adding context surfaced a new frame,
  // fetch that card's reads so they can render inline under the current ones,
  // steered by the same added context. Independent of the current-card fetch so
  // both land together. Silent on failure — the "also" block just doesn't appear.
  useEffect(() => {
    if (current !== 'reflect' || !secondLensId || !aiOn) return;
    if (cardContent[secondLensId]) return; // already have it
    const card = REFLECT_CARDS[secondLensId];
    if (!card.slot) return;
    let alive = true;
    setSecondLensLoading(true);
    const steer = reflectSteer.current
      ? `\nshe has now ADDED this to what she first wrote: "${reflectSteer.current}". Read the whole picture together, her first words AND this addition, and come back with richer reads that hold both.`
      : '';
    const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
    const user = `${threadPreamble()}she wrote: "${herText.current.trim()}"\nshe feels: ${chosenFeeling.current || 'upset'}${steer}${cycle}${feedbackClause(reactionsRef.current)}`;
    reflectCard(provider, card.slot, user)
      .then((r) => {
        if (alive && (r.line || r.options?.length)) {
          setCardContent((c) => ({ ...c, [secondLensId]: r }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setSecondLensLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [current, secondLensId, cardContent, aiOn, provider]);

  // M6 context gate: consume the send-time hasConcreteEvent check under the first
  // reflect card's spinner. A confident `false` means her entry read as an event
  // to the lexical analyse() but the model sees only a mood, so route her back to
  // clarify for the detail the reads and response need. Anything else — yes, null,
  // timeout, AI-off, or no pending gate — proceeds untouched. Cancelled the moment
  // she advances past the first card or engages it (validates / edits), via the
  // cleanup alive-flag, so a late reply can never yank her backward.
  useEffect(() => {
    if (current !== 'reflect' || reflectIdx !== 0) return;
    const gate = eventGate.current;
    if (!gate) return;
    eventGate.current = null; // consume once; a reroute + return never re-gates
    let alive = true;
    gate
      .then((ok) => {
        if (!alive || ok !== false) return;
        setClarifyMoreContext(true);
        setHistory((h) => [...h, 'reflect']);
        setCurrent('clarify');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [current, reflectIdx, reflectValidated, reflectEditing]);

  // Fact-sort: reset per card, then fetch the split when the active card is a
  // fact-sort one. claims stays null while loading, becomes [] on decline (the
  // card then falls back to the plain question echo).
  useEffect(() => {
    setCardFailed(false);
    setSecondLensId(null);
    setSecondLensLoading(false);
    setClaims(null);
    setRuleChain(null);
    setFactStage('sort');
    setFactAdvise(null);
    setChatLog([]);
    setChatBusy(false);
  }, [current, reflectIdx]);
  useEffect(() => {
    if (current !== 'reflect' || !reflectCards) return;
    const id = reflectCards[reflectIdx];
    if (!FACTSORT_CARDS.includes(id)) return;
    if (claims !== null) return; // fetched (or attempted) already
    if (!aiOn) return; // no AI → the plain question echo stands
    let alive = true;
    setFactLoading(true);
    const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
    factSort(provider, `she wrote: "${herText.current.trim()}"${cycle}`)
      .then((c) => {
        if (alive) setClaims(c);
      })
      .catch(() => {
        if (alive) setClaims([]);
      })
      .finally(() => {
        if (alive) setFactLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [current, reflectCards, reflectIdx, claims, aiOn, provider]);

  // The rule card (2026-08-13): fetch the chain + tests when it is the active card
  // and we have none yet. Runs whenever ruleChain is null on the rule card, so a
  // re-roll (which clears ruleChain) refetches. null result → cardFailed → aiDown.
  useEffect(() => {
    if (current !== 'reflect' || !reflectCards) return;
    const id = reflectCards[reflectIdx];
    if (id !== 'rule') return;
    if (ruleChain !== null) return; // already have it
    if (!aiOn) return; // AI off → the render shows aiDown
    let alive = true;
    setCardLoading(true);
    const steer = reflectSteer.current
      ? `\nshe has now ADDED this to what she first wrote: "${reflectSteer.current}". Read the whole picture together and break down the rule that fits it now.`
      : '';
    const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
    const user = `${threadPreamble()}she wrote: "${herText.current.trim()}"\nshe feels: ${chosenFeeling.current || 'upset'}${steer}${cycle}${feedbackClause(reactionsRef.current)}`;
    ruleBreakdown(provider, user)
      .then((r) => {
        if (!alive) return;
        if (r) {
          setRuleChain(r);
          setCardFailed(false);
        } else {
          setCardFailed(true);
        }
      })
      .catch(() => {
        if (alive) setCardFailed(true);
      })
      .finally(() => {
        if (alive) setCardLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [current, reflectCards, reflectIdx, ruleChain, aiOn, provider]);

  /** Set one claim to fact or feeling (the two-button choice). */
  const setClaimFact = (i: number, fact: boolean) => {
    tap();
    setClaims((cs) => (cs ? cs.map((c, idx) => (idx === i ? { ...c, fact } : c)) : cs));
  };

  /** From the sort stage: fetch the per-read softening + the facts help line, then
   *  show the result. AI-off returns empty advice, so the result still shows her
   *  sorted lines, just without the softening. */
  const factContinue = () => {
    tap();
    if (!claims) return;
    const reads = claims.filter((c) => !c.fact).map((c) => c.text);
    const facts = claims.filter((c) => c.fact).map((c) => c.text);
    setFactStage('result');
    if (!aiOn) return;
    setFactLoading(true);
    factSortAdvise(
      provider,
      `reads: ${JSON.stringify(reads)}\nfacts: ${JSON.stringify(facts)}`,
    )
      .then((a) => setFactAdvise(a))
      .catch(() => setFactAdvise({ reads: [], help: '' }))
      .finally(() => setFactLoading(false));
  };

  /** The bounded reflective chat on the result stage. Every message is crisis-
   *  guarded exactly like the entry text before it reaches the model. Moon replies
   *  one short reflecting turn; after a few turns the slot gently lands it. */
  const sendChat = () => {
    const msg = draft.trim();
    if (!msg) return;
    if (analyse(msg).kind === 'crisis') {
      setCrisis(true);
      return;
    }
    runAiCrisisGuard(msg, {
      onAbuse: () => setDvDetected(true),
      onEscalate: (type) => {
        crisisType.current = type;
        setCrisis(true);
      },
    });
    setDraft('');
    const nextLog: ChatTurn[] = [...chatLog, { role: 'you' as const, text: msg }];
    setChatLog(nextLog);
    if (!aiOn) return;

    // The short scope-guarded reflective reply (a plain line, or an off-topic
    // decline). Used on the fact-sort chat, and as the open chat's fallback when
    // her message fits no lens. Defined here so the lens path can fall back to it.
    const runReflectChat = () => {
      const reads = claims ? claims.filter((c) => !c.fact).map((c) => c.text) : [];
      const facts = claims ? claims.filter((c) => c.fact).map((c) => c.text) : [];
      const turns = nextLog.filter((m) => m.role === 'you').length;
      const convo = nextLog
        .map((m) => `${m.role === 'you' ? 'her' : 'moon'}: ${chatTurnText(m)}`)
        .join('\n');
      setChatBusy(true);
      reflectChat(
        provider,
        `she wrote: "${herText.current.trim()}"\nfacts: ${JSON.stringify(facts)}\nher reads: ${JSON.stringify(
          reads,
        )}\nturn: ${turns}\nconversation:\n${convo}`,
      )
        .then((line) => {
          if (line) setChatLog((l) => [...l, { role: 'moon' as const, text: line }]);
        })
        .catch(() => {})
        .finally(() => setChatBusy(false));
    };

    // Open chat (no fact-sort claims): answer in the reflect framework (points),
    // not a chatbot line. lensForText is a shallow regex that misses a lot, so when
    // it finds no specific lens we DEFAULT to `signal` (applies to almost any real
    // moment) rather than dropping to a plain line — item H, Neha device test
    // 2026-08-13. If that lens still comes back empty (genuinely off-topic, e.g.
    // trivia), the `pts.length` check below falls to runReflectChat, which declines.
    const lens = claims === null ? lensForText(msg) ?? 'signal' : null;
    if (lens) {
      const card = REFLECT_CARDS[lens];
      const cycle = pmsActive.current ? REFLECT_CYCLE_NOTE : '';
      setChatBusy(true);
      reflectCard(provider, card.slot!, `${threadPreamble()}she wrote: "${msg}"\nshe feels: ${chosenFeeling.current || 'upset'}${cycle}${feedbackClause(reactionsRef.current)}`)
        .then((r) => {
          const pts = r.options?.length ? r.options : r.line ? [r.line] : [];
          if (pts.length) {
            setChatLog((l) => [...l, { role: 'moon' as const, title: card.title, reads: pts }]);
            setChatBusy(false);
          } else {
            runReflectChat(); // lens produced nothing → a plain reflective line
          }
        })
        .catch(() => runReflectChat());
      return;
    }
    runReflectChat();
  };

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
    // A slim chat-bar height instead of the tall journal well: for the secondary
    // "add context" field that sits sticky in the footer.
    compact?: boolean;
  }) => {
    // Every field carries the mic now (Neha 2026-08-11, "every text field should
    // have the speaker") — opt OUT only, never in.
    const withMic = opts.withMic ?? true;
    // Enabled while she is still speaking too, so she never has to tap the mic
    // off before she can send (Neha 2026-08-02).
    const canSend =
      draft.trim().length > 0 ||
      (withMic && dictation.listening && dictation.partial.trim().length > 0);
    return (
      <View style={[styles.composer, opts.compact && styles.composerCompact]}>
        <TextInput
          style={[styles.composerInput, opts.compact && styles.composerInputCompact]}
          // While dictating, show the live interim words appended to what she has
          // so far, so text appears AS she speaks (proof the mic is on). On a
          // final phrase the hook commits it to `draft` and clears the partial.
          value={
            withMic && dictation.listening && dictation.partial
              ? (draft.trim() ? draft.trim() + ' ' : '') + dictation.partial
              : draft
          }
          onChangeText={setDraft}
          // While the mic is live the field is read-only: dictation owns the
          // buffer, so a stray keyboard tap can't write the live text back in and
          // compound it. Tap the mic to stop, then type. (End users will do both.)
          editable={!(withMic && dictation.listening)}
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
          {withMic ? (
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
          {/* The flex spacer collapses the row-layout input's width, so it's only
              in the full composer, never the slim inline one. */}
          {!opts.compact && <View style={styles.composerSpace} />}
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
  const ui =
    crisis ? Crisis() : hydrating ? { body: null, cta: null } : Beat();

  // A "composer beat" is a typing screen whose chat-style field lives in the
  // pinned CTA slot (raw_entry / clarify). On these
  // the scroll GROWS so the composer sticks to the bottom like a chat bar, with
  // the speaker/question at the top. Every other beat lets the scroll HUG its
  // content, so the body and its button stay grouped together instead of the
  // button being pinned a whole screen away below.
  // Guess cards carry a sticky chat-style context field in the footer, so they
  // grow the scroll like the composer beats to pin that field to the bottom.
  // Every reflect card pins its action(s) to the bottom, so the scroll grows to
  // push the footer down consistently across guess / draft / question.
  const guessCardActive =
    current === 'reflect' &&
    !!reflectCards &&
    ['guess', 'draft', 'question'].includes(REFLECT_CARDS[reflectCards[reflectIdx]]?.mode);
  // The fact-sort result stage also carries a sticky context field in its footer.
  const factResultActive =
    current === 'reflect' &&
    !!reflectCards &&
    FACTSORT_CARDS.includes(reflectCards[reflectIdx]) &&
    factStage === 'result';
  const composerBeat =
    !crisis &&
    (current === 'raw_entry' ||
      current === 'clarify' ||
      current === 'make_safe' || // pins the settle buttons to the bottom
      guessCardActive ||
      factResultActive ||
      (current === 'reflect' && chatOpen));

  return (
    <View style={styles.root}>
      {/* Consent backstop: if she reached /moment without agreeing (any route
          other than Home's gated CTA), the "Meet Moon" screen must come first.
          aiOn is already false here, so nothing has been sent to the AI yet.
          "I agree" persists and drops her into the flow; ✕ leaves /moment. */}
      <Modal
        visible={consentGranted === false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => router.back()}
      >
        <MeetMoonConsent
          onAgree={() => {
            setMoonConsent()
              .catch(() => {})
              .finally(() => setConsentGranted(true));
          }}
          onClose={() => router.back()}
        />
      </Modal>
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
        {/* Close only, and NOT on reflect: that screen is full-page and uses the
            back chevron in the card header instead of an X (Neha 2026-08-10).
            Back lives inside the card, next to the beat it steps back from. */}
        <View style={styles.header}>
          {current !== 'reflect' && <CloseButton onPress={leave} />}
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
            <BlurView intensity={72} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
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
              style={[styles.scroll, composerBeat && styles.scrollGrow]}
              contentContainerStyle={styles.cardBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
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
      // The entry card: her free-text "what happened". The upfront 0-10 rating
      // that used to share this card was cut 2026-08-09 (it felt arbitrary and
      // boring, and rating a thing she had not named yet was a cold step). A clear
      // entry now goes straight to the echo.
      case 'raw_entry':
        return {
          // Speaker/question sticky at the top (body); the chat composer sticky
          // at the bottom (cta), like any messaging screen. A good-vs-bad pair
          // under the question teaches how to write to Moon (Neha 2026-08-02):
          // faint x / brand check, never alarm red, so it guides without judging.
          body: (
            <View style={styles.entryHead}>
              {head(COPY.raw_entry)}
              {/* One quiet guiding example for the empty field; it fades out once
                  she starts typing. The why-line and the "bad" example were cut
                  2026-08-10 — the entry page was too text-heavy. */}
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

      // The feeling guess: the OPENER of the flow (Neha 2026-08-13). The echo beat
      // that said her words back first was removed (repeating her sentence did not
      // help), so the flow opens straight on this guess. Moon PROPOSES a few feeling
      // words, she confirms one or swaps (2026-08-09). Skipped entirely when she
      // already named a feeling in her text (send routes straight to Reflect) —
      // affect labeling without the chore. The AI RANKS the closed set
      // (feelingOrder); it never writes one, and offerFeelings is the deterministic
      // fallback. Capped to FEELING_GUESS.count so it reads as a guess, not a menu.
      case 'feelings': {
        const ranked = (feelingOrder ?? offerFeelings(herText.current)).slice(0, FEELING_GUESS.count);
        const loadingFeelings = aiOn && feelingsLoading && !feelingOrder;
        const chooseFeeling = (f: string) => {
          // The respond menu is ranked on the feeling: drop a stale ranking only
          // when she actually changes it.
          if (f !== chosenFeeling.current) {
            setActOrder(null);
            setShowAllActs(false);
          }
          enterReflect(f);
        };
        return {
          body: (
            <>
              {head(FEELING_GUESS.title)}
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
                    label={FEELING_GUESS.other}
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
              onPress={() => enterReflect(draft.trim())}
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
            </>
          ),
          // The skip is a secondary button pinned in the footer (thumb area), not a
          // mid-screen text link she has to reach up for (Neha 2026-08-11).
          cta: (
            <Pressable
              onPress={() => {
                tap();
                go('breathe');
              }}
              accessibilityRole="button"
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>{COPY.breathe_skip}</Text>
            </Pressable>
          ),
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
          // The SETTLE gate (2026-08-09): regulate is optional and tied to
          // responding — "want a moment to settle before you respond?". "Yes"
          // (settle) takes the breath + settling menu; "No, respond now" opens the
          // body-prep page in place. "Yes" is the hero, so the encouraged path
          // leads. Reflect was for everyone; this she only takes if she chooses.
          body: (
            <>
              {head(SETTLE.title)}
              <WhyLine>{SETTLE.why}</WhyLine>
            </>
          ),
          // Buttons pinned at the bottom, not floating under the short title.
          cta: (
            <View style={styles.stack}>
              <OptionRow label={SETTLE.no} index={0} onPress={() => setBodyPrepOpen(true)} />
              <BeginButton
                hero
                fullWidth
                label={SETTLE.yes}
                onPress={() => {
                  resetActivities();
                  resetHold(); // fresh 20:00 for this hold (also clears any stale clock)
                  go('make_safe', 'wait');
                }}
              />
            </View>
          ),
        };
      }

      // The reflect-card system (2026-08-09): one routed card at a time, the
      // FIRST thing after naming, not the fifth screen. Every card ADDS a
      // possibility and none subtracts her feeling; every "no" either walks to
      // the next card or backs off and validates — it never invalidates her.
      case 'reflect': {
        if (!reflectCards || reflectCards.length === 0) {
          // routeCards always returns safe defaults, so this is defensive only.
          return {
            body: head(SETS.smallReframes[0]),
            cta: <BeginButton fullWidth label="Continue" onPress={() => go('reflect')} />,
          };
        }
        const id = reflectCards[reflectIdx];
        const card = REFLECT_CARDS[id];
        const content = cardContent[id] ?? {};

        // Moon is down on a card that needs it (timeout / empty / HTTP, or AI off).
        // Honest, with a retry, AND a quiet way forward — an outage must never trap
        // her, since Regulate and Respond run on authored copy (Neha 2026-08-10).
        // `onRetry` is the per-card-type refetch.
        const aiDown = (onRetry: () => void) => ({
          body: (
            <>
              {head(COPY.ai_not_responding)}
              <Text style={styles.settles}>{COPY.ai_not_responding_sub}</Text>
            </>
          ),
          cta: (
            <View style={styles.stack}>
              <BeginButton
                fullWidth
                label={COPY.ai_retry}
                onPress={() => {
                  tap();
                  onRetry();
                }}
              />
              {/* No canned no-AI reflection — a real human instead. Opens her mail
                  app to Neha (no auto-send); the address already ships in the app
                  (Neha 2026-08-10). */}
              <Pressable
                onPress={() => {
                  tap();
                  Linking.openURL(
                    `mailto:neha@niyora.com?subject=${encodeURIComponent('Niyora — I could use a hand')}`,
                  ).catch(() => {});
                }}
                style={styles.differentWay}
                accessibilityRole="button"
              >
                <Text style={styles.skipLinkText}>Reach out to Neha</Text>
              </Pressable>
            </View>
          ),
        });

        // "Let's reflect more" with the cards used up: the bounded reflective chat,
        // now as a standalone screen. "Ready to respond" always exits.
        if (chatOpen) {
          return {
            body: (
              <>
                {chatLog.length === 0 ? head('What else is on your mind about this?') : null}
                <ChatTurns log={chatLog} react={{ reactions, onReact: recordReaction }} />
                {chatBusy ? (
                  <View style={[styles.chatMoon, styles.chatThinking]}>
                    <ThinkingDots />
                  </View>
                ) : null}
              </>
            ),
            cta: (
              <View style={styles.stack}>
                {entryField({
                  placeholder: 'Say more, or ask Moon to look again',
                  a11yLabel: 'Reflect with Moon',
                  onSend: sendChat,
                  autoFocus: false,
                  compact: true,
                })}
                {!keyboardUp && (
                  <BeginButton fullWidth label="Respond" onPress={() => acceptReflect()} />
                )}
              </View>
            ),
          };
        }

        // Fact-sort cards (fact_or_fear, know_or_guess): split her thought into
        // claims, she sorts each fact-vs-read, then reads are softened and the
        // facts get one helping line. Falls back to the plain question echo below
        // when the split is still loading is handled here; an empty split ([])
        // falls through to that echo.
        if (FACTSORT_CARDS.includes(id)) {
          if (claims === null && aiOn) {
            return {
              body: (
                <>
                  <Text style={[styles.l3Prompt, styles.reflectTitle]}>{FACTSORT.title}</Text>
                  <View style={styles.reflectStage}>
                    <ThinkingDots label={AI_THINKING} />
                  </View>
                </>
              ),
              cta: null,
            };
          }
          if (claims && claims.length > 0) {
            if (factStage === 'sort') {
              return {
                body: (
                  <>
                    <Text style={[styles.l3Prompt, styles.reflectTitle]}>{FACTSORT.title}</Text>
                    <View>
                      {claims.map((c, i) => (
                        <View key={i}>
                          {i > 0 ? <View style={styles.readDivider} /> : null}
                          <View style={styles.factRowFlat}>
                            <Text style={styles.factText}>{c.text}</Text>
                            <View style={styles.factChoices}>
                            <Pressable
                              style={[styles.factChoice, c.fact && styles.factChoiceOnFact]}
                              onPress={() => setClaimFact(i, true)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: c.fact }}
                              accessibilityLabel={`${c.text}. ${FACTSORT.fact}`}
                            >
                              <Text style={[styles.factChoiceText, c.fact && styles.factChoiceTextOn]}>
                                {FACTSORT.fact}
                              </Text>
                            </Pressable>
                            <Pressable
                              style={[styles.factChoice, !c.fact && styles.factChoiceOnFeeling]}
                              onPress={() => setClaimFact(i, false)}
                              accessibilityRole="button"
                              accessibilityState={{ selected: !c.fact }}
                              accessibilityLabel={`${c.text}. ${FACTSORT.feeling}`}
                            >
                              <Text style={[styles.factChoiceText, !c.fact && styles.factChoiceTextOn]}>
                                {FACTSORT.feeling}
                              </Text>
                            </Pressable>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </>
                ),
                cta: <BeginButton fullWidth label={FACTSORT.cta} onPress={factContinue} />,
              };
            }
            // result stage — only the NEW, helpful content. Her own words were
            // already on the sort stage, so we never repeat them here.
            const reads = (factAdvise?.reads ?? []).filter(Boolean);
            return {
              body: (
                <>
                  {factLoading ? (
                    <View style={styles.reflectStage}>
                      <ThinkingDots label={AI_THINKING} />
                    </View>
                  ) : (
                    <>
                      {reads.length > 0 && (
                        <>
                          <Text style={[styles.factHead, styles.factHeadLeft]}>
                            {FACTSORT.feelingsHead}
                          </Text>
                          <ReadPoints items={reads} />
                        </>
                      )}
                      {/* The takeaway: Moon helping her act on the facts, the closer. */}
                      {factAdvise?.help ? (
                        <Text style={styles.factTakeaway}>{factAdvise.help}</Text>
                      ) : null}
                      {/* The bounded reflective chat: her turns right, Moon's left. */}
                      <ChatTurns log={chatLog} react={{ reactions, onReact: recordReaction }} />
                      {chatBusy ? (
                        <View style={[styles.chatMoon, styles.chatThinking]}>
                          <ThinkingDots />
                        </View>
                      ) : null}
                      {chatLog.filter((m) => m.role === 'you').length >= 3 ? (
                        <Text style={styles.factHead}>Want to sit with this?</Text>
                      ) : null}
                    </>
                  )}
                </>
              ),
              // Sticky footer: the chat field (a clickable chat bar) above Continue.
              // In the body it sat under the pinned footer and ate the taps.
              cta: (
                <View style={styles.stack}>
                  {entryField({
                    placeholder: 'Say more, or ask Moon to look again',
                    a11yLabel: 'Reflect with Moon',
                    onSend: sendChat,
                    autoFocus: false,
                    compact: true,
                  })}
                  {!keyboardUp && (
                    <BeginButton fullWidth label="Respond" onPress={() => acceptReflect()} />
                  )}
                </View>
              ),
            };
          }
          // Any other case (AI off, or an empty / failed split): Moon isn't
          // responding. NEVER the old plain-echo + two-button card. Retry clears
          // claims so the split effect refetches; "Respond anyway" moves on.
          return aiDown(() => setClaims(null));
        }

        // The rule card (2026-08-13): the REBT chain made visible. What happened →
        // the hidden rule → where it lands, then the "Is any of it true?" tests.
        // The chain parts she gave carry no reaction; only the RULE (Moon's guess)
        // and the tests do. Any cross re-rolls the WHOLE breakdown, because the
        // tests are built off the rule and move with it (Neha 2026-08-13).
        if (id === 'rule') {
          const rerollRule = () => {
            setCardFailed(false);
            setRuleChain(null); // the rule fetch effect refetches
            setReflectRetry((n) => n + 1); // fresh reaction generation for the new chain
          };
          if (!ruleChain) {
            if (cardFailed || !aiOn) return aiDown(rerollRule);
            return {
              body: (
                <>
                  <Text style={[styles.l3Prompt, styles.reflectTitle]}>{card.title}</Text>
                  <View style={styles.reflectStage}>
                    <ThinkingDots label={AI_THINKING} />
                  </View>
                </>
              ),
              cta: null,
            };
          }
          const testScope = `rule:${reflectRetry}`;
          const demandScope = `rule-demand:${reflectRetry}`;
          // Adding context re-breaks-down the rule on the full picture (first words
          // + the addition), same crisis guard as the entry beat.
          const submitRuleContext = () => {
            const text = draft.trim();
            if (!text) return;
            if (analyse(text).kind === 'crisis') {
              setCrisis(true);
              return;
            }
            runAiCrisisGuard(text, {
              onAbuse: () => setDvDetected(true),
              onEscalate: (type) => {
                crisisType.current = type;
                setCrisis(true);
              },
            });
            setDraft('');
            Keyboard.dismiss();
            reflectSteer.current = text;
            rerollRule();
          };
          return {
            body: (
              <>
                <Text style={[styles.l3Prompt, styles.reflectTitle]}>{card.title}</Text>
                {ruleChain.event ? (
                  <View style={styles.ruleBlock}>
                    <Text style={[styles.factHead, styles.factHeadLeft]}>{RULE_LABELS.event}</Text>
                    <Text style={styles.factText}>{ruleChain.event}</Text>
                  </View>
                ) : null}
                {/* The rule is Moon's guess, so it reacts: cross = wrong rule → re-roll. */}
                <View style={styles.ruleBlock}>
                  <Text style={[styles.factHead, styles.factHeadLeft]}>{RULE_LABELS.rule}</Text>
                  <Text style={styles.factText}>{ruleChain.rule}</Text>
                  <PointReaction
                    reaction={reactionAt(reactions, demandScope, 0)}
                    onReact={(next) => {
                      if (recordReaction(demandScope, 0, ruleChain.rule, next)) rerollRule();
                    }}
                  />
                </View>
                {ruleChain.consequence ? (
                  <View style={styles.ruleBlock}>
                    <Text style={[styles.factHead, styles.factHeadLeft]}>
                      {RULE_LABELS.consequence}
                    </Text>
                    <Text style={styles.factText}>{ruleChain.consequence}</Text>
                  </View>
                ) : null}
                <View style={styles.ruleBlock}>
                  <Text style={[styles.factHead, styles.factHeadLeft]}>{RULE_LABELS.testsHead}</Text>
                  <ReadPoints
                    items={ruleChain.tests}
                    react={{
                      scope: testScope,
                      reactions,
                      onReact: (index, text, next) => {
                        if (recordReaction(testScope, index, text, next)) rerollRule();
                      },
                    }}
                  />
                </View>
                {!keyboardUp ? (
                  <View style={styles.chipRow}>
                    <Pressable
                      onPress={() => advanceCard()}
                      style={styles.chip}
                      accessibilityRole="button"
                    >
                      <Text style={styles.chipText}>Reflect more</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => acceptReflect()}
                      style={[styles.chip, styles.chipPrimary]}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.chipText, styles.chipPrimaryText]}>Respond</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ),
            cta: (
              <View style={styles.stack}>
                {entryField({
                  placeholder: 'Add anything, or ask Moon to look again',
                  a11yLabel: 'Add context',
                  onSend: submitRuleContext,
                  autoFocus: false,
                  compact: true,
                })}
              </View>
            ),
          };
        }

        // A reality ("question") card's "no": respect that it's real and STOP —
        // a warm validation, never another reframe. Then straight to regulate.
        if (reflectValidated) {
          return {
            body: <>{head(COPY.mixed_real, { tone: 'said' })}</>,
            cta: (
              <BeginButton
                fullWidth
                label="Continue"
                onPress={() => {
                  setReflectValidated(false);
                  acceptReflect();
                }}
              />
            ),
          };
        }

        // A draft card's edit field: she takes the line as her own words. Sending
        // it (owned) counts as accepting the reflection.
        if (reflectEditing) {
          return {
            body: head(COPY.reframe_small_own),
            cta: entryField({
              placeholder: content.line ?? '',
              a11yLabel: 'Your own read',
              autoFocus: true,
              onSend: () => {
                if (!draft.trim()) return;
                setDraft('');
                acceptReflect();
              },
            }),
          };
        }

        // A reading card that needs AI and has no content yet. `loading` is
        // content-based (not the cardLoading flag) so there is no flash of an empty
        // state between paint and the fetch effect: it stays true until content
        // lands OR the fetch fails (cardFailed), which routes to aiDown below.
        const needsAi = card.mode !== 'question' && !!card.slot;
        const noContent = !content.line && !content.options?.length;
        const loading = aiOn && needsAi && noContent && !cardFailed;
        // Moon down on a reading card: honest retry + a way forward, never the old
        // silent authored-read fallback (Neha 2026-08-10). AI off lands here too.
        if (needsAi && noContent && (cardFailed || !aiOn)) {
          return aiDown(() => {
            setCardFailed(false);
            setReflectRetry((n) => n + 1);
          });
        }
        // question cards echo HER OWN words — the carved clause when we have one,
        // else her raw text. No AI call, so nothing to invent.
        const herClause =
          verdict?.kind === 'clear' && verdict.echo ? verdict.echo : herText.current;
        // The pullable cycle note: only after reflection has something on screen,
        // only when her cycle data holds, never on crisis, never auto-shown.
        const showPms = pmsActive.current && !crisis && !loading;

        // Per-read reactions for this card (2026-08-12). Scope folds in reflectRetry
        // so a fully-replaced set (draft re-roll / retry) starts a fresh generation
        // and never inherits a crossed read's reaction at the same index. Cross
        // re-rolls via the existing path; heart/neutral just record.
        const readScope = `${id}:${reflectRetry}`;
        const reflectReact: ReadReactProps = {
          scope: readScope,
          reactions,
          onReact: (index, text, next) => {
            if (recordReaction(readScope, index, text, next)) rerollRejectedRead();
          },
        };

        // The card's "second" button behaviour, by contract. A guess card's "no"
        // opens the steer panel (show-others / add-context) instead of jumping
        // straight to the next card; draft edits, reality validates.
        const onSecond = () => {
          if (card.secondAction === 'edit') {
            setDraft(content.line ?? '');
            setReflectEditing(true);
          } else if (card.secondAction === 'validate') {
            tap();
            setReflectValidated(true);
          } else {
            advanceCard(); // 'another'
          }
        };

        // Her typed context is free text, so it runs the SAME crisis guard as the
        // entry beat before it reaches the model, then appends more steered reads.
        const submitMoreContext = () => {
          const text = draft.trim();
          if (!text) return;
          if (analyse(text).kind === 'crisis') {
            setCrisis(true);
            return;
          }
          runAiCrisisGuard(text, {
            onAbuse: () => setDvDetected(true),
            onEscalate: (type) => {
              crisisType.current = type;
              setCrisis(true);
            },
          });
          setDraft('');
          Keyboard.dismiss(); // drop the keyboard so the new reads + chips show
          // Adding context PIVOTS the reflection: clear the stale reads and
          // regenerate centred on what she just added (append is only "show more").
          if (!reflectCards || !aiOn) return;
          const cid = reflectCards[reflectIdx];
          reflectSteer.current = text;
          reflectPrefetch.current = null;
          // Second lens: did the added text surface a frame her entry did not? If
          // so, show that card's reads inline below ("we could also see it like
          // this"); if not, `lens` is null and only the current reads regenerate.
          const lens = secondLensFor(
            detectSignals(herText.current),
            detectSignals(`${herText.current} ${text}`),
            cid,
          );
          setSecondLensId(lens);
          setCardContent((c) => {
            const n = { ...c };
            delete n[cid];
            if (lens) delete n[lens]; // refetch the lens steered on the new context
            return n;
          });
        };

        // Draft cards show ONE line, so "add context" re-generates that line with
        // her note (clearing the content re-runs the loader with her steer folded in).
        const refineDraft = () => {
          const text = draft.trim();
          if (!text) return;
          if (analyse(text).kind === 'crisis') {
            setCrisis(true);
            return;
          }
          runAiCrisisGuard(text, {
            onAbuse: () => setDvDetected(true),
            onEscalate: (type) => {
              crisisType.current = type;
              setCrisis(true);
            },
          });
          setDraft('');
          Keyboard.dismiss(); // drop the keyboard so the new line + chips show
          reflectSteer.current = text;
          reflectPrefetch.current = null;
          setCardContent((c) => {
            const n = { ...c };
            delete n[id];
            return n;
          });
        };

        return {
          body: (
            <>
              <Text style={[styles.l3Prompt, styles.reflectTitle]}>{card.title}</Text>
              {card.subtitle ? <WhyLine>{card.subtitle}</WhyLine> : null}
              {loading ? (
                <View style={styles.reflectStage}>
                  <ThinkingDots label={AI_THINKING} />
                </View>
              ) : card.mode === 'guess' ? (
                // The rephrasing: a GROWING list of reads to sit with. Calm comes
                // from reading more angles, not picking one. Left-aligned points
                // divided by lines, not boxes — the same for every reading card
                // including `middle` (Neha 2026-08-10).
                <ReadPoints
                  items={content.options?.length ? content.options : SETS.smallReframes}
                  loading={moreLoading}
                  react={reflectReact}
                />
              ) : card.mode === 'question' ? (
                // Her own words, quieter than the question so the question leads
                // and the quote reads as "here's your thought", not a second title.
                <Text style={styles.reflectQuote}>{herClause}</Text>
              ) : (
                // Draft: the AI's reading as a single point, same voice as the reads.
                <ReadPoints items={[content.line ?? SETS.smallReframes[0]]} react={reflectReact} />
              )}

              {/* Second lens (Neha 2026-08-10): when her added context surfaced a
                  frame her entry didn't, that reflection's reads sit here under a
                  soft connector — additive, one page, no screen-swap. Shows only
                  while it has content or is still fetching; a failed fetch is silent. */}
              {!loading &&
              secondLensId &&
              (cardContent[secondLensId]?.options?.length ||
                cardContent[secondLensId]?.line ||
                secondLensLoading) ? (
                <View style={styles.alsoWrap}>
                  <View style={styles.alsoDivider} />
                  <Text style={styles.alsoConnector}>We could also see it like this</Text>
                  <Text style={styles.alsoQuestion}>{REFLECT_CARDS[secondLensId].title}</Text>
                  {cardContent[secondLensId]?.options?.length || cardContent[secondLensId]?.line ? (
                    <ReadPoints
                      items={
                        cardContent[secondLensId]?.options?.length
                          ? cardContent[secondLensId]!.options!
                          : [cardContent[secondLensId]!.line!]
                      }
                    />
                  ) : (
                    <View style={styles.reflectStage}>
                      <ThinkingDots />
                    </View>
                  )}
                </View>
              ) : null}

              {/* The two chips ride inline right after the reads (guess/draft):
                  "Reflect more" walks to the next reflection, "Respond" moves the
                  flow on. Only the text field stays sticky (footer below). Hidden
                  while she is typing, so a send tap never lands on a chip. */}
              {!loading && !keyboardUp && (card.mode === 'guess' || card.mode === 'draft') ? (
                <View style={styles.chipRow}>
                  <Pressable
                    onPress={() => advanceCard()}
                    style={styles.chip}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chipText}>Reflect more</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => acceptReflect()}
                    style={[styles.chip, styles.chipPrimary]}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.chipText, styles.chipPrimaryText]}>Respond</Text>
                  </Pressable>
                </View>
              ) : null}

              {/* The cycle heads-up: shown AUTOMATICALLY on the first reflect card
                  when the prediction says she's likely premenstrual — she should
                  know, we don't make her fish for it (Neha 2026-08-11). Once, never
                  on crisis. It is the ONLY thing PMS changes now; tone and reads are
                  identical whether or not she is in the window. */}
              {showPms && reflectIdx === 0 && !pmsDismissed ? (
                <View style={styles.pmsBanner}>
                  <Text style={styles.pmsBannerText}>{PMS_NOTE.body}</Text>
                  <Pressable
                    onPress={() => {
                      tap();
                      setPmsDismissed(true);
                    }}
                    style={styles.pmsBannerChip}
                    accessibilityRole="button"
                  >
                    <Text style={styles.pmsBannerChipText}>{PMS_NOTE.cta}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          ),
          // Sticky footer. Guess/draft: ONLY the text field stays pinned here —
          // its two actions (Reflect more / Respond) now ride inline under the
          // reads (Neha 2026-08-10). Question: the two answer buttons (the reality
          // check IS the action).
          cta: (
            <View style={styles.stack}>
              {card.mode === 'guess' || card.mode === 'draft' ? (
                entryField({
                  placeholder: 'Say more, or add your own take',
                  a11yLabel: 'Add context',
                  onSend: card.mode === 'guess' ? submitMoreContext : refineDraft,
                  autoFocus: false,
                  compact: true,
                })
              ) : card.mode === 'question' ? (
                // Two peer answers side by side; "different way" stays a quiet link
                // below since the answers themselves are the pair.
                <>
                  <View style={styles.twoUp}>
                    <View style={styles.twoUpItem}>
                      <OptionRow label={card.yes} tint={selTint} onPress={() => acceptReflect()} />
                    </View>
                    <View style={styles.twoUpItem}>
                      <OptionRow label={card.second} tint={selTint} onPress={onSecond} />
                    </View>
                  </View>
                  <Pressable
                    onPress={() => advanceCard()}
                    style={styles.differentWay}
                    accessibilityRole="button"
                  >
                    <Text style={styles.skipLinkText}>Try a different way</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ),
        };
      }

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
        // Only when she chose to respond now without settling first. An offer
        // above the acts, never a wall in front of them: she can still pick any
        // act right below it. (Was also gated on a high opening rating; that 0-10
        // rating was cut 2026-08-09, so the skip alone surfaces the gentle offer.)
        const nudgeHold = skippedHold;
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
                  {/* The US line, now labelled US, and a by-country directory for
                      everyone the short-code can't reach (audit M-2). */}
                  <Text style={styles.holdNudgeText}>{DV_RESOURCE.detail}</Text>
                  <OptionRow
                    label={DV_RESOURCE.intlLabel}
                    tint={selTint}
                    onPress={() => {
                      tap();
                      openDvIntlLine();
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
              </>
            ),
            // Save for later (secondary) and Share (primary) stacked in the footer
            // with the standard gap between them (Neha 2026-08-11).
            cta: (
              <View style={styles.stack}>
                <Pressable
                  onPress={() => setReminderOpen(true)}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryBtnText}>{COPY.act_later}</Text>
                </Pressable>
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
              </View>
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
                height={224}
                hint={COPY.close_scratch}
                onReveal={() => {
                  setRevealed(true);
                  if (!rewardBumped.current) {
                    rewardBumped.current = true;
                    // The moment was already saved when she finished reflecting
                    // (persistMoment); here we only attach the act she drafted, so a
                    // completed session keeps its response for thread pickup. The
                    // persistMoment call is a safety net for any path that skipped it.
                    persistMoment();
                    if (actDraft) updateLatestMomentResponse(actDraft).catch(() => {});
                  }
                }}
              >
                <View style={styles.prize}>
                  {badge && badge.drawing >= 0 ? (
                    <>
                      <Image
                        source={MOON_DRAWINGS[badge.drawing].src}
                        style={styles.prizeImage}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                      <Text style={styles.badgeName}>{MOON_DRAWINGS[badge.drawing].caption}</Text>
                    </>
                  ) : (
                    // Past the sixth constellation the art runs out; her star still
                    // lights. ponytail: swap in the real figure by growing MOON_DRAWINGS.
                    <>
                      <Text style={styles.prizeStar}>★</Text>
                      <Text style={styles.badgeName}>{COPY.close_badge_why}</Text>
                    </>
                  )}
                  {/* A repeat is not new art: the same badge, one more golden star. */}
                  {badge && badge.count > 1 && (
                    <View
                      style={styles.starCount}
                      accessibilityLabel={`Worked through ${badge.count} times`}
                    >
                      <Text style={styles.starCountNum}>{badge.count}</Text>
                      <Text style={styles.starCountStar}>★</Text>
                    </View>
                  )}
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
    // Type-aware sheet, now the shared CrisisSheet (audit H-1 + the shared-
    // component refactor): an acute violence / child-harm escalation shows the
    // DV/safety resources, the keyword floor (crisisType null) the 988 suicide
    // screen. The branch lives in one place so it can't drift per screen.
    return {
      body: <CrisisSheet crisisType={crisisType.current} />,
      // "No am good, let me rephrase" returns her to her own words (setCrisis
      // false) instead of exiting the moment — her draft is intact, so she can
      // edit and resend (Neha 2026-08-02). Resources stay one send away. This is
      // the ONLY setCrisis(false): the AI/keyword layer may only turn crisis ON.
      // The back label is identical across both copies, so CRISIS_COPY.back fits.
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
type SymbolName = ComponentProps<typeof SymbolView>['name'];

/** One heart / cross control under a reflect read. A soft scale settle on tap —
 *  calm, no bounce (this is a hard moment). Lit uses `activeName`/`activeTint`. */
function ReactionButton({
  active,
  name,
  activeName,
  tint,
  activeTint,
  label,
  onPress,
}: {
  active: boolean;
  name: SymbolName;
  activeName: SymbolName;
  tint: string;
  activeTint: string;
  label: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPress={() => {
        scale.value = withSequence(
          withTiming(0.86, { duration: 90 }),
          withTiming(1, { duration: 170 }),
        );
        onPress();
      }}
      hitSlop={spacing.sm}
      style={[styles.reactBtn, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <SymbolView
        name={active ? activeName : name}
        size={18}
        tintColor={active ? activeTint : tint}
      />
    </AnimatedPressable>
  );
}

/** Heart / no-reaction / cross for a single read. Heart = resonates (rose when
 *  lit), cross = not this; tapping the lit one clears back to neutral. */
function PointReaction({
  reaction,
  onReact,
}: {
  reaction?: Reaction;
  onReact: (next: Reaction) => void;
}) {
  return (
    <View style={styles.reactRow}>
      <ReactionButton
        active={reaction === 'like'}
        name="heart"
        activeName="heart.fill"
        tint={colors.textOnDark.faint}
        activeTint={colors.accentRose}
        label="Mark as resonates"
        onPress={() => onReact('like')}
      />
      <ReactionButton
        active={reaction === 'reject'}
        name="heart.slash"
        activeName="heart.slash.fill"
        tint={colors.textOnDark.faint}
        activeTint={colors.textOnDark.secondary}
        label="Mark as not this"
        onPress={() => onReact('reject')}
      />
    </View>
  );
}

/** The per-read reaction wiring threaded from a parent: a stable `scope`, the
 *  current reaction map, and a toggle handler (index + text + next state). */
type ReadReactProps = {
  scope: string;
  reactions: PointReactions;
  onReact: (index: number, text: string, next: Reaction) => void;
};

/** Reflect reads as left-aligned points divided by hairlines, not boxes (Neha
 *  2026-08-10). One bullet per read, a thin line between. `loading` appends a
 *  quiet thinking row for an in-flight fetch. Used by every guess/draft card.
 *  When `react` is passed, each read gets a heart/cross reaction control below
 *  it (2026-08-12); omitted → the plain points surface as before. */
function ReadPoints({
  items,
  loading,
  react,
}: {
  items: readonly string[];
  loading?: boolean;
  react?: ReadReactProps;
}) {
  return (
    <View>
      {items.map((o, i) => (
        <View key={`${i}-${o}`}>
          {i > 0 ? <View style={styles.readDivider} /> : null}
          <View style={styles.readRow}>
            <Text style={styles.readBullet}>{'•'}</Text>
            <Text style={styles.readText}>{o}</Text>
          </View>
          {react ? (
            <PointReaction
              reaction={reactionAt(react.reactions, react.scope, i)}
              onReact={(next) => react.onReact(i, o, next)}
            />
          ) : null}
        </View>
      ))}
      {loading ? (
        <>
          {items.length > 0 ? <View style={styles.readDivider} /> : null}
          <View style={styles.readRow}>
            <ThinkingDots />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** A turn in the open reflect chat. Moon replies either as a plain line (a short
 *  reflective reply / off-topic decline) OR, when her message fits a reading lens,
 *  as that template's reads — the SAME points UI as the cards (Neha 2026-08-10). */
type ChatTurn =
  | { role: 'you'; text: string }
  | { role: 'moon'; text: string }
  | { role: 'moon'; title: string; reads: string[] };

/** Flatten a turn to text for the model's conversation context. */
function chatTurnText(m: ChatTurn): string {
  return 'reads' in m ? m.reads.join('; ') : m.text;
}

/** Render the chat thread: her turns as bubbles, Moon's line-replies as bubbles,
 *  Moon's lens-replies as a titled ReadPoints block (same component as the cards). */
function ChatTurns({
  log,
  react,
}: {
  log: ChatTurn[];
  react?: {
    reactions: PointReactions;
    onReact: (scope: string, index: number, text: string, next: Reaction) => void;
  };
}) {
  return (
    <>
      {log.map((m, i) =>
        m.role === 'you' ? (
          <View key={i} style={styles.chatYou}>
            <Text style={styles.chatText}>{m.text}</Text>
          </View>
        ) : 'reads' in m ? (
          <View key={i} style={styles.chatReads}>
            <Text style={styles.alsoQuestion}>{m.title}</Text>
            <ReadPoints
              items={m.reads}
              react={
                react
                  ? {
                      scope: `chat:${i}`,
                      reactions: react.reactions,
                      onReact: (index, text, next) => react.onReact(`chat:${i}`, index, text, next),
                    }
                  : undefined
              }
            />
          </View>
        ) : (
          <View key={i} style={styles.chatMoon}>
            <Text style={styles.chatText}>{m.text}</Text>
          </View>
        ),
      )}
    </>
  );
}

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
    backgroundColor: 'rgba(10,8,16,0.72)',
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
  // H1 — the beat's question. `moon.title` (20 semibold, -0.2 tracking).
  ask: {
    ...moon.title,
    flex: 1,
    color: colors.textPrimary,
  },

  input: {
    ...moon.body,
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
    ...moon.body,
    color: colors.textOnDark.primary,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    // FIXED height, not min/max: the field must never grow with the text, or it
    // eats upward and pushes the speaker off the top. At a fixed height the
    // speaker stays pinned above and the send button below — both always in
    // place — and a long entry scrolls INSIDE the field instead.
    height: 150,
  },
  // The slim chat-bar variant: a single row, input + send inline, the field height
  // matched to the send button. Grows a little for long text, scrolls inside.
  composerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  composerInputCompact: {
    flex: 1,
    height: undefined,
    minHeight: 36,
    maxHeight: 90,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
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
    ...moon.caption,
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
    ...moon.bodyStrong,
    color: v3.accent,
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
    ...moon.voice,
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
    ...moon.body,
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
    ...moon.body,
    flex: 1,
    color: colors.textTagline,
  },
  entryExampleGood: {
    ...moon.body,
    flex: 1,
    color: colors.textSubtitle,
  },
  // "Body prep" heading over the self-check list: same size, more weight.
  settlesStrong: {
    ...moon.bodyStrong,
    color: colors.textPrimary,
  },
  // The guided micro reset (cold water / relax shoulders): the shared `settles`
  // subtitle read too small here. Its own larger, brighter type — a real
  // instruction to follow, not fine print.
  microTitle: {
    ...moon.title,
    color: colors.textPrimary,
  },
  microStep: {
    ...moon.body,
    color: colors.textOnDark.primary,
  },
  feelingsAsk: {
    ...moon.bodyStrong,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  inputSmall: {
    ...moon.body,
    color: colors.textOnDark.primary,
    backgroundColor: v3.panel,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  stack: { gap: spacing.sm },
  // Reflect cards — the Training Level-3 look (game-v3 LevelThree), so the cards
  // feel native to the app: a centred prompt (the card title), a big line or
  // tappable options below, then the yes/second controls.
  l3Prompt: {
    ...moon.title,
    color: colors.textOnDark.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  // The AI line (draft): the big text she rules on — the hero of the card.
  reflectLine: {
    ...moon.voice,
    color: colors.textOnDark.primary,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  // Her own words on a question card: smaller and dimmer than the question, so
  // the question leads and this reads as the quoted thought, not a second title.
  reflectQuote: {
    ...moon.body,
    color: colors.textOnDark.secondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  // Holds the thinking dots centred while an AI card's content lands.
  reflectStage: { minHeight: 88, alignItems: 'center', justifyContent: 'center' },
  // A tappable guess option, lifted from game-v3's l3Solution look.
  l3Solution: {
    minHeight: 56,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  l3SolutionText: {
    ...moon.bodyStrong,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // Fact-sort: the claim text, then a two-button Fact / Feeling choice below it.
  // The selected button fills with its colour so the sort reads at a glance.
  factText: { ...moon.body, color: colors.textOnDark.primary },
  // The rule card's chain blocks (event / rule / consequence), stacked with air
  // between them so each reads as its own step (Neha 2026-08-13).
  ruleBlock: { marginBottom: spacing.md },
  factChoices: { flexDirection: 'row', gap: spacing.sm },
  factChoice: {
    flex: 1,
    minHeight: 40,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
  },
  factChoiceOnFact: {
    backgroundColor: 'rgba(120,224,168,0.16)',
    borderColor: 'rgba(120,224,168,0.5)',
  },
  factChoiceOnFeeling: {
    backgroundColor: 'rgba(255,206,138,0.16)',
    borderColor: 'rgba(255,206,138,0.5)',
  },
  factChoiceText: { ...moon.bodyStrong, color: colors.textOnDark.tertiary },
  factChoiceTextOn: { color: colors.textOnDark.primary },
  // Section headers on the result stage ("Your feelings", "What actually happened").
  factHead: {
    ...moon.caption,
    color: colors.textOnDark.tertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  factResultRow: { gap: spacing.xs, marginBottom: spacing.sm },
  // Reflect reads as points (Neha 2026-08-10): left-aligned title, then bullet
  // rows divided by hairlines, then the two chips inline. Calmer than boxes.
  reflectTitle: { textAlign: 'left', marginBottom: spacing.md },
  readRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  readBullet: { ...moon.body, fontFamily: fonts.regular, color: 'rgba(196,178,255,0.9)' },
  // The reads are the primary thing she reads; moon.body is `light` and rendered
  // too thin on device (Neha 2026-08-13), so the reads step up to `regular`.
  readText: { ...moon.body, fontFamily: fonts.regular, flex: 1, color: colors.textOnDark.primary },
  readDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.1)' },
  // Per-read reactions sit under the read, indented past the bullet so they read
  // as belonging to it. Generous gap + hit area — there's vertical room and this
  // is a hard moment (Neha 2026-08-12).
  reactRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingLeft: spacing.lg,
    paddingBottom: spacing.sm,
  },
  reactBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.xs },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  chipText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
  chipPrimary: { backgroundColor: colors.primarySolid, borderColor: 'transparent' },
  chipPrimaryText: { color: colors.textOnDark.primary },
  // The PMS heads-up as a soft banner with a "Got it" chip (Neha 2026-08-11): a
  // gentle rose tint (cycle, not the violet reads), short copy, dismissible.
  pmsBanner: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(242,162,192,0.35)',
    backgroundColor: 'rgba(242,162,192,0.12)',
    gap: spacing.md,
  },
  pmsBannerText: { ...moon.body, color: colors.textOnDark.secondary },
  pmsBannerChip: {
    alignSelf: 'flex-end',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(242,162,192,0.5)',
  },
  pmsBannerChipText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
  // Second lens: a stronger divider, a quiet connector, then the other question +
  // its reads, inline below the current card (Neha 2026-08-10).
  alsoWrap: { marginTop: spacing.md },
  alsoDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginBottom: spacing.md,
  },
  alsoConnector: { ...moon.caption, color: colors.textOnDark.tertiary, marginBottom: spacing.xs },
  alsoQuestion: {
    ...moon.bodyStrong,
    color: colors.textOnDark.primary,
    marginBottom: spacing.xs,
  },
  // Fact-sort in the new skin: claims are line-divided rows (no boxed panel), the
  // section head left-aligned, the takeaway a soft left line (Neha 2026-08-10).
  factRowFlat: { paddingVertical: spacing.md, gap: spacing.sm },
  factHeadLeft: { textAlign: 'left' },
  factTakeaway: { ...moon.body, color: colors.textOnDark.secondary, marginTop: spacing.md },
  // Bounded reflective chat bubbles: her turns right and neutral, Moon's left in
  // the soft violet so it matches the boxed reads above.
  chatYou: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: radius.button,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: v3.panel,
  },
  chatMoon: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(196,178,255,0.35)',
    backgroundColor: 'rgba(34,27,54,0.66)',
  },
  chatThinking: { paddingVertical: spacing.md },
  chatText: { ...moon.body, color: colors.textOnDark.primary },
  // A lens reply in the chat: full-width (Moon's side), the question then its reads
  // as points — the same UI as the cards, so the chat stays a reflection.
  chatReads: { alignSelf: 'stretch', marginVertical: spacing.xs },
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
    ...moon.bodyStrong,
    color: colors.textPrimary,
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
    ...moon.caption,
    color: colors.textSubtitle,
    paddingHorizontal: spacing.xs,
  },
  editWithMoonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  // The "change it" affordance under the revise field, and the quiet "skip"
  // under the draft: a right-aligned action and a centred way out.
  changeLink: { alignSelf: 'flex-end', paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  changeLinkText: {
    ...moon.bodyStrong,
    color: 'rgba(196, 178, 255, 0.9)',
  },
  skipLink: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs },
  differentWay: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
  // Two peer CTAs beside each other instead of stacked.
  twoUp: { flexDirection: 'row', gap: spacing.sm },
  twoUpItem: { flex: 1 },
  skipLinkText: {
    ...moon.body,
    color: colors.textSubtitle,
  },
  // Two-up card grid for the hold activities: 48%-wide cards, space-between
  // gives the column gutter, rowGap the space between rows.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm },

  // The breath ball's stage: the moon grown big, centred, the changing line
  // beneath it. Generous vertical room so the ball has space to swell into.
  breathStage: { alignItems: 'center', gap: spacing.xl, paddingVertical: spacing.xxxl },
  breathLine: {
    ...moon.voice,
    color: colors.textPrimary,
    textAlign: 'center',
    minHeight: 60,
  },
  // The one quiet exit. Low emphasis: the breath is the point, this is just the
  // way out for anyone already steady.
  breathSkip: { alignSelf: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  breathSkipText: {
    ...moon.body,
    color: colors.textTagline,
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
    ...moon.body,
    color: colors.textSubtitle,
  },

  // The safety guard, above the timer ball. Clear and centred — the one
  // instruction that matters here — with the benefit a lighter line under it.
  holdGuardBlock: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  holdGuard: {
    ...moon.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  holdGuardBenefit: {
    ...moon.caption,
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
    ...moon.bodyStrong,
    color: colors.textPrimary,
  },
  holdCardDesc: {
    ...moon.caption,
    color: colors.textSubtitle,
  },

  // The welcome: an encouraging lead, then the three states as a connected
  // stepper in their own flow colours, then the "with Moon AI" signature.
  // Generous spacing — it is the calm front door.
  introWrap: { gap: spacing.lg, paddingVertical: spacing.xs },
  introLead: { gap: spacing.xs, alignItems: 'center', paddingHorizontal: spacing.sm },
  introHead: {
    ...moon.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  introSub: {
    ...moon.body,
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
    ...moon.bodyStrong,
  },
  introStepSub: {
    ...moon.body,
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
    ...moon.captionStrong,
    color: colors.textTagline,
  },

  // The close celebration: the gift, then the scratch card, centred with room
  // to breathe. This is the one page in the flow that is allowed to feel like a
  // reward, so it is generous where the rest is spare.
  celebrate: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.sm },
  congrats: {
    ...moon.celebrate,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  giftSub: {
    ...moon.body,
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
    // Breathing room so the badge + caption never touch the card edges (Neha
    // 2026-08-11).
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(18, 15, 28, 0.55)',
  },
  // The uncovered drawing. Fits inside the 190-tall card with room for the name.
  prizeImage: { width: 132, height: 132 },
  // Stand-in for a constellation with no art yet.
  prizeStar: { fontSize: 92, color: '#E7C878', textAlign: 'center' },
  // How many times she has worked this feeling through, in the card's corner.
  starCount: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starCountNum: { ...moon.captionStrong, color: '#E7C878' },
  starCountStar: { fontSize: 15, color: '#E7C878' },
  badgeName: {
    ...moon.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  reveal: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm },
  badgeWhy: {
    ...moon.body,
    color: colors.textSubtitle,
    textAlign: 'center',
  },
  saved: {
    ...moon.captionStrong,
    color: v3.accent,
    textAlign: 'center',
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
    ...moon.bodyStrong,
    color: colors.textPrimary,
  },
  // The crisis-sheet styles (crisisBody/crisisLine/...) moved into the shared
  // CrisisSheet component; the beat just renders <CrisisSheet /> now.
});
