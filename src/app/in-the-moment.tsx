// The "In the moment" flow: the moon AI, chat-shaped, meeting her mid-feeling.
// Unlike rough-moment (which opens at a scripted menu), this OPENS with her raw
// text — she types the thing — and the model earns its place by reflecting HER
// words and offering HER feelings. The engine + prompts live in
// v3/in-the-moment-content; this screen renders it as a conversation and calls
// ReflectModel (the same on-device Gemma→FM→scripted seam rough-moment uses).
//
// Dev-gated (FM_EXPERIMENT). This is the VERTICAL SLICE — entry → crisis scan →
// naming beat → body check → one arousal lane → close. Act 2, the mixed lane,
// the escalation ladder, and the full-screen breathing takeover are follow-ups;
// breathing is an inline beat here for now. See /ai-briefs/.

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { v3 } from '@/v3/v3-theme';
import { ReflectModel, reflectDebug } from '@/lib/reflect-model';
import { REFLECT_AI } from '@/config/features';
import { recordLight } from '@/store/light-ledger';
import { getPmsReads } from '@/store/pms-reads';
import {
  buildMomentRequest,
  CRISIS_HARD,
  CRISIS_SOFT_LINE,
  cycleContextLine,
  dayPill,
  EMPTY_MOMENT,
  LADDER_RUNGS,
  laneForFeeling,
  MOMENT_DOT,
  MOMENT_MAX_TURNS,
  MOMENT_SCRIPT,
  momentExcerpt,
  scanCrisis,
  tameProse,
  type DayPill,
  type MomentState,
  type MomentStep,
} from '@/v3/in-the-moment-content';

const tap = () => Haptics.selectionAsync().catch(() => {});

const DISCARD_AFTER_MS = 5 * 60 * 1000;
const MODEL_TIMEOUT_MS = 6000;

// Finishing an in-the-moment session is applying a skill in the moment.
const MOMENT_REF = 'in-the-moment';

type Msg = { id: number; who: 'me' | 'app'; text: string };
type InputMode = 'entry' | 'more' | null;

export default function InTheMoment() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, who: 'app', text: MOMENT_SCRIPT.entryInvite },
  ]);
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState<InputMode>('entry');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [dot, setDot] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [pill, setPill] = useState<DayPill | null>(null);
  const [crisis, setCrisis] = useState(false); // hard-tier handoff shown → flow stops
  const [done, setDone] = useState(false);
  const [dbg, setDbg] = useState<string | null>(null);

  // Working memory in refs so async model steps read/mutate without stale
  // closures across awaits.
  const state = useRef<MomentState>({ ...EMPTY_MOMENT });
  const stepRef = useRef<MomentStep>('entry');
  const msgCount = useRef(1);
  const nextId = useRef(1);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    let alive = true;
    getPmsReads().then((reads) => {
      if (!alive) return;
      const cycle = reads[reads.length - 1]?.answers.cycle;
      if (!cycle) return;
      const p = dayPill(cycle);
      setPill(p);
      state.current.cycleContext = cycleContextLine(p);
    });
    if (REFLECT_AI)
      ReflectModel.prewarm()
        .then(() => {
          if (__DEV__) setDbg(`${reflectDebug().provider} · warmed`);
        })
        .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Disposable sessions: background > 5 min discards.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') backgroundedAt = Date.now();
      if (s === 'active' && backgroundedAt && Date.now() - backgroundedAt > DISCARD_AFTER_MS) {
        router.back();
      }
    });
    return () => sub.remove();
  }, []);

  const append = useCallback((who: 'me' | 'app', text: string) => {
    // Dev-only: mirror the conversation into the Metro log so it can be read off
    // device while tuning the model. __DEV__-gated, never ships.
    if (__DEV__) console.log(`[moment] ${who === 'me' ? 'HER ›' : 'moon ‹'} ${text}`);
    msgCount.current += 1;
    setMessages((prev) => [...prev, { id: nextId.current++, who, text }]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const setStep = useCallback((s: MomentStep) => {
    stepRef.current = s;
    setDot(MOMENT_DOT[s]);
  }, []);

  const reward = useCallback((kind: Parameters<typeof recordLight>[0]) => {
    recordLight(kind, { refId: MOMENT_REF }).catch(() => {});
  }, []);

  /** One bounded model turn; scripted fallback (null prose) on any failure. */
  const modelTurn = useCallback(
    async (step: MomentStep): Promise<{ prose: string | null; chips: string[] | null }> => {
      if (!REFLECT_AI) return { prose: null, chips: null };
      const req = buildMomentRequest(step, state.current);
      if (!req) return { prose: null, chips: null };
      const r = await ReflectModel.generate(req.instructions, req.prompt, req.wantChips, MODEL_TIMEOUT_MS);
      if (__DEV__) {
        const d = reflectDebug();
        const tail = r.ok ? `${r.latencyMs}ms` : `scripted · ${r.failure} · ${r.latencyMs}ms`;
        setDbg(`${d.provider} · ${tail}`);
        console.log(
          `[moment] turn=${step} · ${d.provider} · ${tail}` +
            (r.ok ? ` · out="${r.prose}"${r.chips?.length ? ` chips=[${r.chips.join(', ')}]` : ''}` : ''),
        );
      }
      if (r.ok && r.prose.trim()) {
        const tamed = tameProse(r.prose);
        return { prose: tamed || null, chips: r.chips?.slice(0, 3) ?? null };
      }
      return { prose: null, chips: null };
    },
    [],
  );

  const overBudget = useCallback(() => msgCount.current >= MOMENT_MAX_TURNS - 1, []);

  // --- Close --------------------------------------------------------------
  const closeLogged = useRef(false);
  const finish = useCallback(() => {
    setStep('close');
    setChips([]);
    setInput(null);
    if (!closeLogged.current) {
      closeLogged.current = true;
      reward('apply');
    }
    append('app', MOMENT_SCRIPT.close);
    setDone(true);
  }, [append, reward, setStep]);

  const runClose = useCallback(() => {
    setStep('close');
    append('app', MOMENT_SCRIPT.weGood);
    setChips([...MOMENT_SCRIPT.weGoodChips]);
  }, [append, setStep]);

  // --- Time it ("when matters") -------------------------------------------
  const runTimeit = useCallback(() => {
    setStep('timeit');
    // Only anchor timing to her cycle when framing is on (she's in-window).
    const inWindow = !!pill?.inWindow;
    append('app', inWindow ? MOMENT_SCRIPT.timeitWhyWindow : MOMENT_SCRIPT.timeitWhy);
    setChips([...MOMENT_SCRIPT.timeitChips]);
  }, [append, pill, setStep]);

  // --- Act 2 ("explore how you handle this") ------------------------------
  const runAct2 = useCallback(async () => {
    if (overBudget()) return runClose();
    setStep('act2');
    append('app', MOMENT_SCRIPT.act2Intro);
    setBusy(true);
    const r = await modelTurn('act2');
    append('app', r.prose ?? MOMENT_SCRIPT.act2Reframe);
    setBusy(false);
    reward('apply');
    runTimeit();
  }, [append, modelTurn, overBudget, reward, runClose, runTimeit, setStep]);

  // --- Arousal / feeling check -------------------------------------------
  const runArousalCheck = useCallback(() => {
    if (overBudget()) return runClose();
    setStep('arousalCheck');
    append('app', MOMENT_SCRIPT.arousalCheck);
    setChips([...MOMENT_SCRIPT.arousalChips]);
  }, [append, overBudget, runClose, setStep]);

  // --- High-arousal lane (inline breathe beat for the slice) --------------
  const breatheRounds = useRef(0);
  const runBreatheMore = useCallback(() => {
    setStep('high');
    append('app', MOMENT_SCRIPT.breatheMore);
    setChips([...MOMENT_SCRIPT.breatheMoreChips]);
  }, [append, setStep]);

  // Inline breathe beat: the full-screen 4:6 takeover is a follow-up.
  const runBreathe = useCallback(() => {
    setStep('high');
    append('app', `${MOMENT_SCRIPT.breatheStart} ${MOMENT_SCRIPT.breatheCue}.`);
    setChips(['breathe out']);
  }, [append, setStep]);

  const runHigh = useCallback(() => {
    setStep('high');
    append('app', MOMENT_SCRIPT.highSafe);
    runBreathe();
  }, [append, runBreathe, setStep]);

  // --- High-lane escalation ladder (switch strategy, never repeat the breath)
  const ladderIdx = useRef(0);
  const runLadder = useCallback(() => {
    const rung = LADDER_RUNGS[ladderIdx.current];
    if (!rung || overBudget()) {
      append('app', MOMENT_SCRIPT.ladderExhausted);
      runClose();
      return;
    }
    setStep('ladder');
    append('app', rung.intro);
    setChips([rung.chip]);
  }, [append, overBudget, runClose, setStep]);

  // --- Low-arousal lane (activation — no breath, no break) ----------------
  const runLow = useCallback(() => {
    setStep('low');
    append('app', MOMENT_SCRIPT.lowIntro);
    setChips([...MOMENT_SCRIPT.lowChips]);
  }, [append, setStep]);

  // --- Mixed / labile lane (rejection-sensitive) --------------------------
  const runMixedAnchor = useCallback(async () => {
    setStep('mixedAnchor');
    setBusy(true);
    const r = await modelTurn('mixedAnchor');
    append('app', r.prose ?? MOMENT_SCRIPT.mixedAnchor);
    setBusy(false);
    reward('calm'); // rode a swing without acting on the peak — the whole skill
    runArousalCheck();
  }, [append, modelTurn, reward, runArousalCheck, setStep]);

  const runMixed = useCallback(async () => {
    setStep('mixed');
    append('app', MOMENT_SCRIPT.mixedNameSwing);
    append('app', MOMENT_SCRIPT.mixedRide);
    // "check the read": reflect her specific rejection-thought back for sorting.
    setStep('mixedCheckRead');
    setBusy(true);
    const r = await modelTurn('mixedCheckRead');
    append('app', r.prose ?? MOMENT_SCRIPT.mixedCheckRead);
    setChips([...MOMENT_SCRIPT.mixedChips]);
    setBusy(false);
  }, [append, modelTurn, setStep]);

  const runLane = useCallback(() => {
    if (state.current.lane === 'low') runLow();
    else if (state.current.lane === 'mixed') runMixed();
    else runHigh();
  }, [runHigh, runLow, runMixed]);

  // --- Body check ---------------------------------------------------------
  const runBody = useCallback(() => {
    if (overBudget()) return runLane();
    setStep('body');
    append('app', MOMENT_SCRIPT.bodyIntro);
    setChips([...MOMENT_SCRIPT.bodyChips]);
  }, [append, overBudget, runLane, setStep]);

  // --- Naming beat --------------------------------------------------------
  const runFeelHeard = useCallback(async () => {
    setStep('feelheard');
    setBusy(true);
    const r = await modelTurn('feelheard');
    append('app', r.prose ?? MOMENT_SCRIPT.feelheard(state.current.feeling));
    setBusy(false);
    runBody();
  }, [append, modelTurn, runBody, setStep]);

  // The first response, in the aligned order: reflect her issue (AI), then a
  // fixed companioning line, then the naming-helps science (before the pick),
  // then the picker prompt with the AI-offered feelings.
  const runAcknowledge = useCallback(async () => {
    setStep('acknowledge');
    setBusy(true);
    const ack = await modelTurn('acknowledge');
    append('app', ack.prose ?? MOMENT_SCRIPT.acknowledge);
    append('app', MOMENT_SCRIPT.together);
    append('app', MOMENT_SCRIPT.namingScience);
    const feel = await modelTurn('feelings');
    append('app', MOMENT_SCRIPT.feelingsPrompt);
    setChips(feel.chips && feel.chips.length >= 2 ? feel.chips : [...MOMENT_SCRIPT.feelingsChips]);
    setStep('feelings');
    setBusy(false);
  }, [append, modelTurn, setStep]);

  // --- Entry + crisis scan ------------------------------------------------
  /** Scan EVERY free-text message she sends, not just the first one.
   *
   *  Wysa (19,000 users, 99 countries, one year): **82% of crisis instances were
   *  surfaced by detection, only 18% by the user pressing a crisis button.** Four
   *  in five people in crisis do not announce it — and this flow is designed to
   *  deepen disclosure as it goes, so the later messages are the MORE likely
   *  place for it to surface, not the less. Scanning only the opening text
   *  pointed the detector at the shallowest moment in the conversation.
   *  Returns true when the scan took over the flow. */
  const crisisCheck = useCallback(
    (text: string): boolean => {
      const tier = scanCrisis(text);
      if (tier === 'hard') {
        setCrisis(true);
        return true;
      }
      if (tier === 'soft') {
        setStep('safeCheck');
        append('app', CRISIS_SOFT_LINE);
        setChips(["yeah, i'm safe", 'no']);
        return true;
      }
      return false;
    },
    [append, setStep],
  );

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    tap();
    setDraft('');
    setInput(null);
    append('me', text);

    // Runs before any branch: the "more" path is where she has just said she is
    // NOT okay, which makes it the highest-yield place in the whole flow for a
    // disclosure — and it previously had no scan at all.
    if (crisisCheck(text)) return;

    if (stepRef.current === 'more') {
      // "not really" reopened the field: hear the added context, then close.
      setBusy(true);
      state.current.rawText = momentExcerpt(text);
      const r = await modelTurn('acknowledge');
      append('app', r.prose ?? MOMENT_SCRIPT.acknowledge);
      setBusy(false);
      finish();
      return;
    }

    state.current.rawText = momentExcerpt(text);
    await runAcknowledge();
  }, [append, busy, crisisCheck, draft, finish, modelTurn, runAcknowledge]);

  // --- Chip dispatch ------------------------------------------------------
  const handleChip = useCallback(
    async (chip: string) => {
      if (busy) return;
      tap();
      const step = stepRef.current;

      if (step === 'safeCheck') {
        append('me', chip);
        setChips([]);
        if (chip === 'no') {
          setCrisis(true);
          return;
        }
        await runAcknowledge();
        return;
      }
      if (step === 'feelings') {
        append('me', chip);
        setChips([]);
        state.current.feeling = chip;
        state.current.lane = laneForFeeling(chip);
        reward('notice'); // naming is the regulating act — the flow's first light
        await runFeelHeard();
        return;
      }
      if (step === 'body') {
        append('me', chip);
        setChips([]);
        if (chip === MOMENT_SCRIPT.bodyChips[1]) {
          append('app', MOMENT_SCRIPT.bodyGap);
          reward('apply'); // tending a basic is self-regulation
        } else {
          append('app', MOMENT_SCRIPT.bodyFine);
        }
        runLane();
        return;
      }
      if (step === 'high') {
        append('me', chip);
        setChips([]);
        if (chip === 'breathe out') {
          breatheRounds.current += 1;
          runBreatheMore();
          return;
        }
        // breatheMore: "yes" → one more round (breath only, no re-intro).
        if (chip === MOMENT_SCRIPT.breatheMoreChips[0]) {
          runBreathe();
          return;
        }
        append('app', MOMENT_SCRIPT.highReward);
        reward('calm');
        runArousalCheck();
        return;
      }
      if (step === 'low') {
        append('me', chip);
        setChips([]);
        append('app', MOMENT_SCRIPT.lowJustOne);
        reward('calm');
        runArousalCheck();
        return;
      }
      if (step === 'mixedCheckRead') {
        append('me', chip);
        setChips([]);
        append('app', chip === MOMENT_SCRIPT.mixedChips[1] ? MOMENT_SCRIPT.mixedReal : MOMENT_SCRIPT.mixedSwing);
        await runMixedAnchor();
        return;
      }
      if (step === 'ladder') {
        append('me', chip);
        setChips([]);
        reward('calm');
        ladderIdx.current += 1;
        runArousalCheck();
        return;
      }
      if (step === 'arousalCheck') {
        append('me', chip);
        setChips([]);
        if (chip === MOMENT_SCRIPT.arousalChips[1]) {
          // "not yet": the high lane escalates the ladder; other lanes close.
          if (state.current.lane === 'high') {
            runLadder();
            return;
          }
          append('app', MOMENT_SCRIPT.moreTodo);
          runClose();
          return;
        }
        // better → explore how she handles it
        await runAct2();
        return;
      }
      if (step === 'timeit') {
        append('me', chip);
        setChips([]);
        if (chip === MOMENT_SCRIPT.timeitChips[0]) {
          append('app', MOMENT_SCRIPT.timeitToday);
          reward('apply'); // turned the feeling into a timed plan
        } else {
          append('app', MOMENT_SCRIPT.timeitWait);
        }
        runClose();
        return;
      }
      if (step === 'close') {
        append('me', chip);
        setChips([]);
        if (chip === MOMENT_SCRIPT.weGoodChips[1]) {
          append('app', MOMENT_SCRIPT.closeMore);
          setStep('more');
          setInput('more');
          return;
        }
        finish();
      }
    },
    [
      append,
      busy,
      finish,
      reward,
      runAcknowledge,
      runAct2,
      runArousalCheck,
      runBreathe,
      runBreatheMore,
      runClose,
      runFeelHeard,
      runLadder,
      runLane,
      runMixedAnchor,
      setStep,
    ],
  );

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              tap();
              router.back();
            }}
            hitSlop={12}
            accessibilityLabel="Close"
          >
            <Text style={styles.close}>✕</Text>
          </Pressable>
          <View style={styles.dots} accessibilityLabel={`part ${dot} of 5`}>
            {[1, 2, 3, 4, 5].map((d) => (
              <View key={d} style={[styles.dot, d <= dot && styles.dotOn]} />
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
          keyboardVerticalOffset={8}
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
            {crisis && (
              <View style={styles.crisisCard}>
                <Text style={styles.crisisTitle}>{CRISIS_HARD.title}</Text>
                <Text style={styles.crisisBody}>{CRISIS_HARD.body}</Text>
                {/* Plain text, deliberately NOT a tel: link — call logs and
                    carrier billing are a surveillance surface she can't erase. */}
                <Text selectable style={styles.crisisResource}>{CRISIS_HARD.us}</Text>
                <Text selectable style={styles.crisisResource}>{CRISIS_HARD.global}</Text>
                <Text style={styles.crisisBody}>{CRISIS_HARD.ask}</Text>
              </View>
            )}
          </ScrollView>

          {!crisis && !done && chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((c) => (
                <Pressable key={c} style={styles.chip} onPress={() => handleChip(c)}>
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!crisis && input && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.textInput}
                value={draft}
                onChangeText={setDraft}
                placeholder={input === 'more' ? "what's still sitting wrong?" : 'type it out…'}
                placeholderTextColor={colors.textTagline}
                multiline
                autoFocus
                onSubmitEditing={handleSend}
                blurOnSubmit
                accessibilityLabel="Your message"
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

          {(crisis || done) && (
            <Pressable
              style={styles.done}
              onPress={() => {
                tap();
                router.back();
              }}
              accessibilityRole="button"
              accessibilityLabel="Done"
            >
              <Text style={styles.doneText}>DONE</Text>
            </Pressable>
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  debugText: { fontFamily: 'Poppins-Light', fontSize: 10, color: 'rgba(255,255,255,0.85)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  close: { fontFamily: 'Poppins-Light', fontSize: 22, color: colors.textSubtitle },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)' },
  dotOn: { backgroundColor: v3.accent },
  pill: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    color: colors.textTagline,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  pillSpacer: { width: 44 },
  body: { flex: 1 },
  chat: { flex: 1 },
  chatContent: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  bubble: { maxWidth: '84%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
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
  bubbleText: { fontFamily: 'Poppins-Light', fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.beginBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textPrimary },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: v3.panel,
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beginStart,
    borderWidth: 1,
    borderColor: colors.beginBorder,
  },
  sendOff: { opacity: 0.4 },
  sendText: { fontFamily: 'Poppins-Medium', fontSize: 18, color: colors.textPrimary },
  crisisCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 18,
    padding: 18,
    backgroundColor: v3.panel,
    gap: 10,
  },
  crisisTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textTagline,
  },
  crisisBody: { fontFamily: 'Poppins-Light', fontSize: 15, lineHeight: 23, color: colors.textPrimary },
  crisisResource: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  done: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.beginStart,
    borderWidth: 1,
    borderColor: colors.beginBorder,
  },
  doneText: { fontFamily: 'Poppins-Medium', fontSize: 15, letterSpacing: 2, color: colors.textPrimary },
});
