// The "Rough moment" reflect session: chat-shaped, protocol-driven CBT for the
// mid-spiral moment, and the "start fresh" step of the Steady-yourself flow.
// The arc lives in v3/rough-moment-content; this screen renders it as a
// conversation.
//
// ONE beat calls the model: `acknowledge`, which says her own sentence back to
// her. It is the only beat measured working on device (77%, iPhone 15). The
// three beats that used to call it — examine, reframe and keep — were the
// compose beats, they produced near-nonsense in that same run, and they are now
// authored copy. They cannot reach a model even by mistake: `BEAT_SLOT` has one
// entry, so `buildTurnRequest` returns null for everything else.
//
// She opens on a free-text field with the core-thought chips beneath it. Typing
// runs the acknowledge echo; tapping a chip skips it, because a chip we wrote
// is not her sentence to say back. The crisis scan runs on her raw text before
// the model, before the snapshot, before anything.
//
// With `REFLECT_AI` off (the store build) even acknowledge falls back to
// authored copy and the whole session is tap-driven and complete.
// Leaving the app holds the session in memory for 30 minutes
// (v3/rough-moment-resume) — long enough to go and do the 20 minute wait the
// flow asks for, and still ephemeral: nothing is written, and it dies with the
// app. Past the window, coming back is a fresh session rather than a stale one.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { v3 } from '@/v3/v3-theme';
import { ReflectModel, reflectDebug } from '@/lib/reflect-model';
import { CRISIS_COPY, openCrisisLine, scanForCrisis } from '@/lib/crisis-scan';
import { echoBlocked, groundedReflection, isGrounded } from '@/lib/ground-floor';
import { REFLECT_AI } from '@/config/features';
import { recordLight } from '@/store/light-ledger';
import { getPmsReads } from '@/store/pms-reads';
import {
  buildKeep,
  buildTurnRequest,
  CONFIRM_THOUGHT_CHIPS,
  cycleContextLine,
  dayPill,
  EMPTY_COMPACT,
  MAX_TURNS,
  SCRIPT,
  STEP_DOT,
  ventExcerpt,
  type CompactState,
  type DayPill,
  type KeepCard,
  type RoughStep,
} from '@/v3/rough-moment-content';
import {
  clearSession,
  RESUME_WINDOW_MS,
  saveSession,
  takeSession,
  type RoughMsg,
} from '@/v3/rough-moment-resume';

const tap = () => Haptics.selectionAsync().catch(() => {});

const MODEL_TIMEOUT_MS = 5000;

// Ledger ref: finishing a reflect session is applying a skill in the moment
// (moon-reward-spec: apply), same family as a repaired rupture.
const REFLECT_REF = 'rough-moment';

export default function RoughMoment() {
  // A session she left inside the resume window, if there is one. Read once, at
  // first render, so every initial value below comes from the same snapshot.
  // useState's lazy initialiser, not useRef: reading a ref during render is
  // the thing React warns about, and this only ever needs to run once.
  const [resumed] = useState(() => takeSession());

  // Fresh sessions open straight at the core-thought menu — no vent, no "feel
  // heard" beat.
  const [messages, setMessages] = useState<RoughMsg[]>(
    resumed?.messages ?? [{ id: 0, who: 'app', text: SCRIPT.confirmIntro }],
  );
  // A snapshot taken mid-acknowledge holds an empty chip row (they are cleared
  // while the model answers). Coming back to a bare screen would read as the
  // session having broken, so the opening menu is restored with it.
  const [chips, setChips] = useState<string[]>(() => {
    if (!resumed) return [...CONFIRM_THOUGHT_CHIPS];
    if (resumed.chips.length > 0) return resumed.chips;
    return resumed.step === 'confirm' ? [...CONFIRM_THOUGHT_CHIPS] : [];
  });
  const [busy, setBusy] = useState(false);
  const [dot, setDot] = useState<1 | 2 | 3 | 4 | 5>(resumed?.dot ?? 1);
  // The step, mirrored into state purely so the entry field knows to render.
  // stepRef stays the source of truth for the async beats.
  const [uiStep, setUiStep] = useState<RoughStep>(resumed?.step ?? 'confirm');
  const [draft, setDraft] = useState('');
  const [crisis, setCrisis] = useState(false);
  const [pill, setPill] = useState<DayPill | null>(resumed?.pill ?? null);
  const [keep, setKeep] = useState<KeepCard | null>(resumed?.keep ?? null);
  // Dev-only overlay: which provider answered and how slow. Gated on __DEV__ at
  // render, so it never ships. Set after prewarm and after every model turn.
  const [dbg, setDbg] = useState<string | null>(null);

  // The flow's working memory lives in refs: the async model steps read and
  // mutate it directly, so there is no stale-closure risk across awaits.
  const compact = useRef<CompactState>(resumed ? { ...resumed.compact } : { ...EMPTY_COMPACT });
  const stepRef = useRef<RoughStep>(resumed?.step ?? 'confirm');
  const msgCount = useRef(resumed?.msgCount ?? 1); // the opening question
  const nextId = useRef(resumed?.nextId ?? 1);
  const scroll = useRef<ScrollView>(null);
  // One-shot guard on the light ledger; carried across a resume so a session
  // she comes back to cannot pay out twice.
  const logged = useRef(resumed?.lightLogged ?? false);
  // Set once the session must stop being held: she left, or the scan fired.
  // Guards the save effect, which would otherwise re-hold her on the next
  // render after we have just cleared her.
  const ended = useRef(false);

  const insets = useSafeAreaInsets();

  /** Leaving for good: the ✕ and DONE both mean "this session is over", so the
   *  held snapshot goes with them. Backgrounding is not this — that is the flow
   *  working as designed, and it resumes. */
  const leave = useCallback(() => {
    tap();
    ended.current = true;
    clearSession();
    router.back();
  }, []);

  // Cycle context: the one thing a generic chatbot can never know. Loaded
  // from the latest PMS read; the pill simply doesn't render without one.
  useEffect(() => {
    let alive = true;
    getPmsReads().then((reads) => {
      if (!alive) return;
      const cycle = reads[reads.length - 1]?.answers.cycle;
      if (!cycle) return;
      const p = dayPill(cycle);
      setPill(p);
      compact.current.cycleContext = cycleContextLine(p);
    });
    // Warm the model so the first turn doesn't pay cold-start latency — only
    // when the AI path is on. v1 (scripted) never touches the model.
    if (REFLECT_AI)
      ReflectModel.prewarm()
        .then(() => {
          if (__DEV__) setDbg(`${reflectDebug().provider} · warmed`);
        })
        .catch(() => {});
    return () => {
      alive = false;
      // Give the model's memory back when she leaves the session. The engine is
      // ~2.6 GB resident; held across screens it makes the app the largest
      // suspended process on the device, which is exactly what iOS evicts
      // first. Reloading costs the same warm this screen already pays on entry,
      // and it happens behind the scripted opening line rather than a blank
      // screen.
      if (REFLECT_AI) ReflectModel.release().catch(() => {});
    };
  }, []);

  // She is *meant* to leave. The flow asks her to go and wait out twenty
  // minutes, so backgrounding the app is completing the beat, not abandoning
  // it. Hold the session while she is gone; only end it once she has been away
  // longer than the resume window, where coming back to a stale spiral would be
  // worse than starting clean.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') {
        backgroundedAt = Date.now();
        return;
      }
      if (s === 'active' && backgroundedAt !== null) {
        const away = Date.now() - backgroundedAt;
        // Clear it either way: without this, one short trip out arms every
        // later return (Control Center, a banner, a call), and the session
        // dies mid-use as soon as one of them lands past the window.
        backgroundedAt = null;
        if (away > RESUME_WINDOW_MS) {
          clearSession();
          router.back();
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Hold the session in memory after every beat, so an unmount (or a
  // memory-pressure kill of this screen) is recoverable. Never written to disk:
  // saveSession is a module-scope variable and nothing else.
  useEffect(() => {
    if (ended.current) return;
    saveSession({
      messages,
      chips,
      dot,
      keep,
      pill,
      compact: { ...compact.current },
      step: stepRef.current,
      msgCount: msgCount.current,
      nextId: nextId.current,
      lightLogged: logged.current,
    });
  }, [messages, chips, dot, keep, pill]);

  const append = useCallback((who: 'me' | 'app', text: string) => {
    msgCount.current += 1;
    setMessages((prev) => [...prev, { id: nextId.current++, who, text }]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const setStep = useCallback((s: RoughStep) => {
    stepRef.current = s;
    setUiStep(s);
    setDot(STEP_DOT[s]);
  }, []);

  /** One bounded model turn; scripted fallback on any failure. The single AI
   *  seam: with REFLECT_AI off (v1) it returns nulls so every beat renders its
   *  scripted line, and no provider is ever called. */
  const modelTurn = useCallback(
    async (step: RoughStep): Promise<{ prose: string | null; chips: string[] | null }> => {
      if (!REFLECT_AI) return { prose: null, chips: null };
      const req = buildTurnRequest(step, compact.current);
      if (!req) return { prose: null, chips: null };
      // Her own words, and only ever hers: the acknowledge beat echoes what
      // she typed. A chip she tapped is our sentence, not hers, so it is never
      // what gets said back.
      const herText = compact.current.ventExcerpt ?? '';
      const r = await ReflectModel.generate(
        req.instructions,
        req.prompt,
        req.wantChips,
        MODEL_TIMEOUT_MS,
        herText || undefined,
      );
      if (__DEV__) {
        const d = reflectDebug();
        const tail = r.ok ? `${r.latencyMs}ms` : `scripted · ${r.failure} · ${r.latencyMs}ms`;
        setDbg(`${d.provider} · ${tail}`);
      }
      if (r.ok && r.prose.trim()) {
        return { prose: r.prose.trim(), chips: r.chips?.slice(0, 3) ?? null };
      }
      return { prose: null, chips: null };
    },
    [],
  );

  /** The finale, reachable from anywhere (turn cap, failures, normal flow).
   *  Completing the reflection earns its light once (moon-reward-spec: apply). */
  const finishWithKeep = useCallback(async () => {
    setStep('keep');
    setChips([]);
    if (!logged.current) {
      logged.current = true;
      recordLight('apply', { refId: REFLECT_REF }).catch(() => {});
    }
    // The keep line is authored. It used to be generated (corpus slot
    // `reframe_small`), which is a compose beat, and compose is the 26% one.
    setKeep(buildKeep(null, compact.current, pill));
  }, [pill, setStep]);

  /** Cap check before any app turn; at the cap the session compresses to keep. */
  const overBudget = useCallback(() => msgCount.current >= MAX_TURNS - 1, []);

  // Spot the pattern: a scripted beat (no model) naming the distortion in plain
  // words, so she sees the thought has a familiar, beatable shape.
  const runPattern = useCallback(async () => {
    if (overBudget()) {
      await finishWithKeep();
      return;
    }
    setStep('pattern');
    append('app', SCRIPT.patternIntro);
    setChips([...SCRIPT.patternChips]);
  }, [append, finishWithKeep, overBudget, setStep]);

  const runExamine = useCallback(async () => {
    if (overBudget()) {
      await finishWithKeep();
      return;
    }
    // Authored. This was corpus slot `high_cbt_stem` — the model inventing a
    // stuck thought for her, which is exactly the beat it failed on device.
    // It returns as PICK over ten authored stems once that copy is written.
    setStep('examine');
    append('app', SCRIPT.examine);
    setChips([...SCRIPT.examineChips]);
  }, [append, finishWithKeep, overBudget, setStep]);

  // Can you change it? A scripted agency check: one small step, or set it down
  // for now. Either answer leads to the reframe.
  const runChange = useCallback(async () => {
    if (overBudget()) {
      await finishWithKeep();
      return;
    }
    setStep('change');
    append('app', SCRIPT.changeIntro);
    setChips([...SCRIPT.changeChips]);
  }, [append, finishWithKeep, overBudget, setStep]);

  const runReframeThenKeep = useCallback(async () => {
    setChips([]);
    setStep('reframe');
    // Authored. Was `high_cbt_reframe`: a new, gentler reading of her
    // situation is new content, however gently it is phrased.
    append('app', SCRIPT.reframe);
    await finishWithKeep();
  }, [append, finishWithKeep, setStep]);

  /**
   * The acknowledge beat: her sentence, said back to her. The only beat left
   * that calls the model, and the only one measured working on device (77%).
   *
   * Three floors, in order, because "say her words back" is a promise the
   * weights cannot be made to keep — the fine-tune invents a detail she never
   * said in roughly half its replies, and those are the failures she is least
   * able to catch, since they read plausibly and are about her own life:
   *
   *   1. the model's line, but only if it stays inside her vocabulary
   *   2. the mechanical carve of her own sentence, which cannot invent
   *      because it never generates
   *   3. an authored line, when her sentence holds nothing safe to echo
   *      (self-attack, or a claim about someone else)
   */
  const acknowledgeLine = useCallback(
    async (herText: string): Promise<string> => {
      const { prose } = await modelTurn('confirm');
      // `echoBlocked` runs on the model's reply as well as on her text, because
      // grounding cannot catch this one: a reply that repeats her self-attack
      // is 100% grounded — every word is hers — and still the worst thing the
      // app could say. Grounding stops invention; this stops agreement.
      if (prose && isGrounded(herText, prose) && !echoBlocked(prose)) return prose;
      return groundedReflection(herText).text ?? SCRIPT.acknowledge;
    },
    [modelTurn],
  );

  /** She typed instead of tapping. Her words become the session's grounding. */
  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    tap();
    setDraft('');
    append('me', text);

    // Runs on her raw text BEFORE the model, before the snapshot, before
    // anything: the triggering message must never reach a model call, and a
    // session that turned into a disclosure must not be held anywhere.
    if (scanForCrisis(text)) {
      ended.current = true;
      clearSession();
      setChips([]);
      setCrisis(true);
      return;
    }

    compact.current.ventExcerpt = ventExcerpt(text);
    setChips([]);
    setBusy(true);
    append('app', await acknowledgeLine(text));
    setBusy(false);
    await runPattern();
  }, [acknowledgeLine, append, busy, draft, runPattern]);

  const handleChip = useCallback(
    async (chip: string) => {
      if (busy) return;
      tap();
      const step = stepRef.current;
      if (step === 'confirm') {
        // The core thought she recognises. Straight on to spotting the pattern.
        compact.current.thought = chip;
        append('me', chip);
        setChips([]);
        await runPattern();
        return;
      }
      if (step === 'pattern') {
        append('me', chip);
        setChips([]);
        append('app', SCRIPT.patternAck);
        await runExamine();
        return;
      }
      if (step === 'examine') {
        append('me', chip);
        setChips([]);
        compact.current.tappedChip = chip;
        await runChange();
        return;
      }
      if (step === 'change') {
        append('me', chip);
        setChips([]);
        append('app', chip === SCRIPT.changeChips[0] ? SCRIPT.changeYes : SCRIPT.changeNo);
        await runReframeThenKeep();
      }
    },
    [append, busy, runChange, runExamine, runPattern, runReframeThenKeep],
  );

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable onPress={leave} hitSlop={12} accessibilityLabel="Close">
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <View style={styles.segments} accessibilityLabel={`part ${dot} of 5`}>
            {[1, 2, 3, 4, 5].map((d) => (
              <View key={d} style={[styles.seg, d <= dot && styles.segOn]} />
            ))}
          </View>
          {pill ? (
            <Text style={styles.pill}>
              {pill.label}
              {pill.inWindow ? ' · window' : ''}
            </Text>
          ) : (
            <View style={styles.pillSpacer} />
          )}
        </View>

        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 28}
        >
          <ScrollView
            ref={scroll}
            style={styles.chat}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((m) => (
              <View key={m.id} style={[styles.bubble, m.who === 'me' ? styles.me : styles.app]}>
                <Text style={styles.bubbleText}>{m.text}</Text>
              </View>
            ))}
            {busy && (
              <View style={[styles.bubble, styles.app]}>
                <Text style={styles.bubbleText}>…</Text>
              </View>
            )}
            {keep && (
              <View style={styles.keepCard}>
                <Text style={styles.keepTitle}>{keep.title}</Text>
                <Text style={styles.keepQuote}>“{keep.quote}”</Text>
                <Text style={styles.keepSupport}>{keep.support}</Text>
                <Text style={styles.keepCaption}>{keep.caption}</Text>
              </View>
            )}

            {/* The scan fired. The flow stops here: no beats, no chips, no
                model — just people she can reach. Her message stays on screen
                above this, because deleting what she wrote would read as the
                app recoiling from her. */}
            {crisis && (
              <View style={styles.crisisSheet}>
                <Text style={styles.crisisTitle}>{CRISIS_COPY.title}</Text>
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
              </View>
            )}
          </ScrollView>

          {/* She can type it out, or tap one of the core thoughts. Typing runs
              the acknowledge echo; tapping skips straight to the pattern beat,
              because a chip we wrote is not her sentence to say back. */}
          {!keep && !crisis && uiStep === 'confirm' && (
            <View style={styles.entry}>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder={SCRIPT.entryPlaceholder}
                placeholderTextColor="rgba(255,255,255,0.30)"
                selectionColor="rgba(196, 178, 255, 0.9)"
                multiline
                textAlignVertical="top"
                editable={!busy}
                accessibilityLabel="What is going on"
              />
              <Pressable
                style={[styles.send, !draft.trim() && styles.sendOff]}
                onPress={handleSend}
                disabled={!draft.trim() || busy}
                accessibilityRole="button"
                accessibilityLabel="Send"
              >
                <Text style={styles.sendText}>↑</Text>
              </Pressable>
            </View>
          )}

          {!keep && !crisis && chips.length > 0 && (
            <View style={styles.chipsWrap}>
              {uiStep === 'confirm' && <Text style={styles.chipsLabel}>{SCRIPT.chipsLabel}</Text>}
              {chips.map((c) => (
                <Pressable
                  key={c}
                  style={styles.chip}
                  onPress={() => handleChip(c)}
                  accessibilityRole="button"
                  accessibilityLabel={c}
                >
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {(keep || crisis) && (
            <View style={styles.footer}>
              <BeginButton fullWidth label={crisis ? 'Close' : 'Done'} onPress={leave} />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      {__DEV__ && REFLECT_AI && dbg && (
        <View style={styles.debugBar} pointerEvents="none">
          <Text style={styles.debugText}>{dbg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  debugBar: {
    position: 'absolute',
    left: 12,
    bottom: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  debugText: { fontFamily: fonts.light, fontSize: fontScale.tagline, color: colors.textOnDark.primary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: pageGutter,
    paddingVertical: spacing.sm,
  },
  close: { fontFamily: fonts.light, fontSize: fontScale.technique, color: colors.textSubtitle },
  // Segments, as the levels UI does it (game-v3 l1Seg), rather than dots.
  segments: { flex: 1, flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.fill.strong },
  segOn: { backgroundColor: v3.accent },
  pill: {
    fontFamily: fonts.light,
    fontSize: fontScale.tagline,
    color: colors.textTagline,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    overflow: 'hidden',
  },
  pillSpacer: { width: 44 },
  body: { flex: 1 },
  chat: { flex: 1 },
  chatContent: { paddingHorizontal: pageGutter, paddingBottom: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '84%',
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(115, 57, 172, 0.28)',
    borderBottomRightRadius: 5,
  },
  app: {
    alignSelf: 'flex-start',
    backgroundColor: v3.panel,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderBottomLeftRadius: 5,
  },
  bubbleText: {
    fontFamily: fonts.light,
    fontSize: fontScale.bodyLg,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  // Options are full-width rows, matching the levels UI (game-v3 l3Solution):
  // one thumb-sized target per line, no reading across a wrapped pill row.
  chipsWrap: { gap: spacing.sm, paddingHorizontal: spacing.xxl, paddingBottom: spacing.md },
  chipsLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: v3.accent,
    marginBottom: spacing.xs,
  },
  chip: {
    minHeight: 56,
    borderRadius: radius.button,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    backgroundColor: colors.fill.faint,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.bodyLg,
    lineHeight: 21,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.md,
  },
  input: {
    flex: 1,
    fontFamily: fonts.light,
    fontSize: fontScale.cardTitle,
    lineHeight: 25,
    color: colors.textOnDark.primary,
    backgroundColor: colors.fill.faint,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: v3.panelBorder,
    padding: spacing.lg,
    minHeight: 56,
    maxHeight: 150,
  },
  send: {
    width: 56,
    height: 56,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150, 120, 235, 0.28)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.beginBorder,
  },
  sendOff: {
    backgroundColor: colors.fill.faint,
    borderColor: 'transparent',
  },
  sendText: { fontFamily: fonts.medium, fontSize: fontScale.title, color: colors.textPrimary },
  footer: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.md, paddingTop: spacing.xs },
  keepCard: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: radius.card,
    padding: spacing.lg,
    backgroundColor: v3.panel,
    gap: spacing.sm,
  },
  keepTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.tagline,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textTagline,
  },
  keepQuote: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  keepSupport: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    lineHeight: 20,
    color: colors.textSubtitle,
  },
  keepCaption: {
    fontFamily: fonts.light,
    fontSize: fontScale.tagline,
    color: colors.textTagline,
    borderTopWidth: 1,
    borderTopColor: v3.panelBorder,
    paddingTop: spacing.sm,
  },
  // Crisis panel: same shape as the Soul tab's resource sheet, so the one
  // surface she may have seen before looks the same when it matters most.
  crisisSheet: {
    marginTop: spacing.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: v3.panel,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  crisisTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  crisisBody: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 21,
    color: colors.textSubtitle,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  crisisLine: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
    marginBottom: spacing.sm,
  },
  crisisLineLabel: { fontFamily: fonts.medium, fontSize: fontScale.bodyLg, color: colors.textPrimary },
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
    marginTop: spacing.sm,
  },
});
