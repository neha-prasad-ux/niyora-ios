// The "Rough moment" reflect session: chat-shaped, protocol-driven CBT for the
// mid-spiral moment, and the "start fresh" step of the Steady-yourself flow.
// The arc lives in v3/rough-moment-content; this screen renders it as a
// conversation.
//
// v1 ships with NO AI and NO typing: `REFLECT_AI` is off, so `modelTurn`
// short-circuits and every beat renders its scripted line, and the whole
// session is tap-driven. It opens straight at the core-thought menu (no vent,
// no "feel heard" beat) and she picks from chips through to the keep card.
// `modelTurn` is the single seam a future on-device provider plugs into; when
// it lands, the vent and free text (and the crisis scan that guards it) come
// back with it. Backgrounding for more than 5 minutes discards the session
// (11pm in bed: falling asleep mid-session is expected, arguably a win).

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  buildKeep,
  buildTurnRequest,
  CONFIRM_THOUGHT_CHIPS,
  cycleContextLine,
  dayPill,
  EMPTY_COMPACT,
  MAX_TURNS,
  SCRIPT,
  STEP_DOT,
  type CompactState,
  type DayPill,
  type KeepCard,
  type RoughStep,
} from '@/v3/rough-moment-content';

const tap = () => Haptics.selectionAsync().catch(() => {});

const DISCARD_AFTER_MS = 5 * 60 * 1000;
const MODEL_TIMEOUT_MS = 5000;

// Ledger ref: finishing a reflect session is applying a skill in the moment
// (moon-reward-spec: apply), same family as a repaired rupture.
const REFLECT_REF = 'rough-moment';

type Msg = { id: number; who: 'me' | 'app'; text: string };

export default function RoughMoment() {
  // Opens straight at the core-thought menu — no vent, no "feel heard" beat.
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, who: 'app', text: SCRIPT.confirmIntro },
  ]);
  const [chips, setChips] = useState<string[]>([...CONFIRM_THOUGHT_CHIPS]);
  const [busy, setBusy] = useState(false);
  const [dot, setDot] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [pill, setPill] = useState<DayPill | null>(null);
  const [keep, setKeep] = useState<KeepCard | null>(null);
  // Dev-only overlay: which provider answered and how slow. Gated on __DEV__ at
  // render, so it never ships. Set after prewarm and after every model turn.
  const [dbg, setDbg] = useState<string | null>(null);

  // The flow's working memory lives in refs: the async model steps read and
  // mutate it directly, so there is no stale-closure risk across awaits.
  const compact = useRef<CompactState>({ ...EMPTY_COMPACT });
  const stepRef = useRef<RoughStep>('confirm');
  const msgCount = useRef(1); // the opening question
  const nextId = useRef(1);
  const scroll = useRef<ScrollView>(null);

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
    };
  }, []);

  // Sessions are disposable: background for more than 5 minutes (or app kill)
  // discards. Falling asleep mid-session is expected, arguably a win.
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
    msgCount.current += 1;
    setMessages((prev) => [...prev, { id: nextId.current++, who, text }]);
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const setStep = useCallback((s: RoughStep) => {
    stepRef.current = s;
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
      // Her own words, so generated chips can be checked before any of them is
      // rendered as a bubble from her. `thought` is what she picked at confirm;
      // `ventExcerpt` is free text when there is any. Without this the chip
      // filter in parseGemmaTurn cannot run and every chip is trusted.
      const herText = compact.current.thought ?? compact.current.ventExcerpt ?? '';
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
  const logged = useRef(false);
  const finishWithKeep = useCallback(async () => {
    setStep('keep');
    setChips([]);
    setBusy(true);
    if (!logged.current) {
      logged.current = true;
      recordLight('apply', { refId: REFLECT_REF }).catch(() => {});
    }
    const { prose } = await modelTurn('keep');
    setKeep(buildKeep(prose, compact.current, pill));
    setBusy(false);
  }, [modelTurn, pill, setStep]);

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
    setBusy(true);
    setStep('examine');
    const ex = await modelTurn('examine');
    append('app', ex.prose ?? SCRIPT.examine);
    setChips(ex.chips && ex.chips.length >= 2 ? ex.chips : [...SCRIPT.examineChips]);
    setBusy(false);
  }, [append, finishWithKeep, modelTurn, overBudget, setStep]);

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
    setBusy(true);
    setChips([]);
    setStep('reframe');
    const rf = await modelTurn('reframe');
    append('app', rf.prose ?? SCRIPT.reframe);
    await finishWithKeep();
  }, [append, finishWithKeep, modelTurn, setStep]);

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

        <View style={styles.body}>
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
          </ScrollView>

          {!keep && chips.length > 0 && (
            <View style={styles.chips}>
              {chips.map((c) => (
                <Pressable key={c} style={styles.chip} onPress={() => handleChip(c)}>
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {keep && (
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
        </View>
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
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
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
  bubble: {
    maxWidth: '84%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textPrimary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.beginBorder,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontFamily: 'Poppins-Light', fontSize: 13, color: colors.textPrimary },
  keepCard: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 18,
    padding: 18,
    backgroundColor: v3.panel,
    gap: 10,
  },
  keepTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textTagline,
  },
  keepQuote: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 19,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  keepSupport: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 20,
    color: colors.textSubtitle,
  },
  keepCaption: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    color: colors.textTagline,
    borderTopWidth: 1,
    borderTopColor: v3.panelBorder,
    paddingTop: 10,
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
  doneText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    letterSpacing: 2,
    color: colors.textPrimary,
  },
});
