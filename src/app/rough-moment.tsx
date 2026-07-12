// The "Rough moment" session: chat-shaped, protocol-driven CBT for the
// mid-spiral moment. The five-beat arc lives in v3/rough-moment-content; this
// screen renders it as a conversation with an effort gradient (free typing
// while venting, tappable chips from beat 3 on, typing always available).
//
// Every model call: bounded prompt, 5s timeout, scripted fallback, advance.
// The session is incapable of not finishing. Crisis language is scanned on
// every send BEFORE anything touches the model and routes to a static,
// human-written overlay. Backgrounding for more than 5 minutes discards the
// session (11pm in bed: falling asleep mid-session is the normal case).

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
import { NiyoraFm } from 'niyora-fm';
import { CRISIS_COPY, scanForCrisis } from '@/lib/crisis-scan';
import { getPmsReads } from '@/store/pms-reads';
import {
  buildKeep,
  buildTurnRequest,
  cycleContextLine,
  dayPill,
  EMPTY_COMPACT,
  FEELING_CHIPS,
  MAX_TURNS,
  SCRIPT,
  scriptedThoughtProposal,
  STEP_DOT,
  type CompactState,
  type DayPill,
  type KeepCard,
  type RoughStep,
  ventExcerpt,
} from '@/v3/rough-moment-content';

const tap = () => Haptics.selectionAsync().catch(() => {});

const DISCARD_AFTER_MS = 5 * 60 * 1000;
const MODEL_TIMEOUT_MS = 5000;

type Msg = { id: number; who: 'me' | 'app'; text: string };

export default function RoughMoment() {
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, who: 'app', text: SCRIPT.opener },
  ]);
  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [dot, setDot] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [pill, setPill] = useState<DayPill | null>(null);
  const [keep, setKeep] = useState<KeepCard | null>(null);
  const [crisis, setCrisis] = useState(false);
  const [placeholder, setPlaceholder] = useState('Say it however it comes');

  // The flow's working memory lives in refs: the async model steps read and
  // mutate it directly, so there is no stale-closure risk across awaits.
  const compact = useRef<CompactState>({ ...EMPTY_COMPACT });
  const stepRef = useRef<RoughStep>('vent');
  const ventTexts = useRef<string[]>([]);
  const thinPrompted = useRef(false);
  const awaitingOwnThought = useRef(false);
  const awaitingFeeling = useRef(false);
  const msgCount = useRef(1); // the opener
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
    // Warm the model so the first turn (the "feel heard" beat, the one the
    // feature hinges on) doesn't pay cold-start latency.
    NiyoraFm.prewarm().catch(() => {});
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
    if (s !== 'vent') setPlaceholder('Or type it out');
  }, []);

  /** One bounded model turn; scripted fallback on any failure. */
  const modelTurn = useCallback(
    async (step: RoughStep): Promise<{ prose: string | null; chips: string[] | null }> => {
      const req = buildTurnRequest(step, compact.current);
      if (!req) return { prose: null, chips: null };
      const r = await NiyoraFm.generate(req.instructions, req.prompt, req.wantChips, MODEL_TIMEOUT_MS);
      if (r.ok && r.prose.trim()) {
        return { prose: r.prose.trim(), chips: r.chips?.slice(0, 3) ?? null };
      }
      return { prose: null, chips: null };
    },
    [],
  );

  /** The finale, reachable from anywhere (turn cap, failures, normal flow). */
  const finishWithKeep = useCallback(async () => {
    setStep('keep');
    setChips([]);
    setBusy(true);
    const { prose } = await modelTurn('keep');
    setKeep(buildKeep(prose, compact.current, pill));
    setBusy(false);
  }, [modelTurn, pill, setStep]);

  /** Cap check before any app turn; at the cap the session compresses to keep. */
  const overBudget = useCallback(() => msgCount.current >= MAX_TURNS - 1, []);

  const runHeardThenConfirm = useCallback(async () => {
    setBusy(true);
    setStep('heard');
    const heard = await modelTurn('heard');
    append('app', heard.prose ?? SCRIPT.heard);
    if (overBudget()) {
      await finishWithKeep();
      return;
    }
    setStep('confirm');
    const confirm = await modelTurn('confirm');
    append('app', confirm.prose ?? SCRIPT.confirmIntro);
    const proposals =
      confirm.chips && confirm.chips.length > 0
        ? confirm.chips.slice(0, 2)
        : [scriptedThoughtProposal(compact.current.ventExcerpt)];
    setChips([...proposals, SCRIPT.confirmOwnChip]);
    setBusy(false);
  }, [append, finishWithKeep, modelTurn, overBudget, setStep]);

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

  const runReframeThenKeep = useCallback(async () => {
    setBusy(true);
    setChips([]);
    setStep('reframe');
    const rf = await modelTurn('reframe');
    append('app', rf.prose ?? SCRIPT.reframe);
    await finishWithKeep();
  }, [append, finishWithKeep, modelTurn, setStep]);

  /** She confirmed the thought; now the feeling row (scripted, always). */
  const askFeeling = useCallback(
    (thought: string) => {
      compact.current.thought = thought;
      awaitingFeeling.current = true;
      append('app', SCRIPT.feelingIntro);
      setChips([...FEELING_CHIPS]);
    },
    [append],
  );

  const handleUserText = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || busy) return;
      // The crisis scan runs BEFORE anything touches the model or state.
      if (scanForCrisis(t)) {
        setCrisis(true);
        return;
      }
      setInput('');
      append('me', t);

      const step = stepRef.current;
      if (step === 'vent') {
        // Thin vents get one gentle re-prompt, then the session proceeds on
        // whatever she gave rather than pretending to have material.
        if (t.length < 4 && ventTexts.current.length === 0 && !thinPrompted.current) {
          thinPrompted.current = true;
          append('app', SCRIPT.ventThin);
          return;
        }
        ventTexts.current.push(t);
        if (ventTexts.current.length === 1) {
          append('app', SCRIPT.ventMore);
          setChips([SCRIPT.ventMoreChip]);
          return;
        }
        compact.current.ventExcerpt = ventExcerpt(ventTexts.current.join(' '));
        setChips([]);
        await runHeardThenConfirm();
        return;
      }
      if (step === 'confirm') {
        if (awaitingFeeling.current) {
          awaitingFeeling.current = false;
          compact.current.feeling = t;
          setChips([]);
          await runExamine();
          return;
        }
        // Typed instead of tapping: her own words become the thought.
        awaitingOwnThought.current = false;
        setPlaceholder('Or type it out');
        setChips([]);
        askFeeling(t);
        return;
      }
      if (step === 'examine') {
        compact.current.tappedChip = t;
        await runReframeThenKeep();
      }
    },
    [append, askFeeling, busy, runExamine, runHeardThenConfirm, runReframeThenKeep],
  );

  const handleChip = useCallback(
    async (chip: string) => {
      if (busy) return;
      tap();
      const step = stepRef.current;
      if (step === 'vent' && chip === SCRIPT.ventMoreChip) {
        compact.current.ventExcerpt = ventExcerpt(ventTexts.current.join(' '));
        setChips([]);
        await runHeardThenConfirm();
        return;
      }
      if (step === 'confirm') {
        if (awaitingFeeling.current) {
          awaitingFeeling.current = false;
          compact.current.feeling = chip;
          setChips([]);
          await runExamine();
          return;
        }
        if (chip === SCRIPT.confirmOwnChip) {
          awaitingOwnThought.current = true;
          setPlaceholder('The thought, in your words');
          setChips([]);
          return;
        }
        setChips([]);
        append('me', chip);
        askFeeling(chip);
        return;
      }
      if (step === 'examine') {
        append('me', chip);
        compact.current.tappedChip = chip;
        await runReframeThenKeep();
      }
    },
    [append, askFeeling, busy, runExamine, runHeardThenConfirm, runReframeThenKeep],
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

          {!keep ? (
            <View>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textTagline}
                  multiline
                  onSubmitEditing={() => handleUserText(input)}
                />
                <Pressable
                  style={[styles.send, !input.trim() && styles.sendDim]}
                  onPress={() => handleUserText(input)}
                  accessibilityLabel="Send"
                >
                  <Text style={styles.sendText}>↑</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setCrisis(true)} hitSlop={8}>
                <Text style={styles.lifeline}>need a human? crisis resources</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.done}
              onPress={() => {
                tap();
                router.back();
              }}
            >
              <Text style={styles.doneText}>DONE</Text>
            </Pressable>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>

      {crisis && (
        <View style={styles.crisisWrap}>
          <BackgroundGradient />
          <SafeAreaView style={styles.crisis} edges={['top', 'bottom']}>
            <Text style={styles.crisisTitle}>{CRISIS_COPY.title}</Text>
            <Text style={styles.crisisBody}>{CRISIS_COPY.body}</Text>
            {CRISIS_COPY.lines.map((l) => (
              <View key={l.label} style={styles.crisisLine}>
                <Text style={styles.crisisLabel}>{l.label}</Text>
                <Text style={styles.crisisDetail}>{l.detail}</Text>
              </View>
            ))}
            <Text style={styles.crisisEmergency}>{CRISIS_COPY.emergency}</Text>
            <Pressable style={styles.crisisBack} onPress={() => setCrisis(false)}>
              <Text style={styles.crisisBackText}>{CRISIS_COPY.back}</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: v3.panel,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.beginStart,
  },
  sendDim: { opacity: 0.4 },
  sendText: { fontFamily: 'Poppins-Medium', fontSize: 18, color: colors.textPrimary },
  lifeline: {
    fontFamily: 'Poppins-Light',
    fontSize: 11,
    color: colors.textTagline,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 8,
  },
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
  crisisWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  crisis: { flex: 1, paddingHorizontal: 28, justifyContent: 'center', gap: 14 },
  crisisTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 22,
    lineHeight: 30,
    color: colors.textPrimary,
  },
  crisisBody: {
    fontFamily: 'Poppins-Light',
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSubtitle,
  },
  crisisLine: {
    borderWidth: 1,
    borderColor: v3.panelBorder,
    borderRadius: 14,
    padding: 14,
    gap: 2,
  },
  crisisLabel: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  crisisDetail: { fontFamily: 'Poppins-Light', fontSize: 12, color: colors.textSubtitle },
  crisisEmergency: {
    fontFamily: 'Poppins-Light',
    fontSize: 12,
    color: colors.textTagline,
  },
  crisisBack: { paddingVertical: 12, alignItems: 'center' },
  crisisBackText: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    textDecorationLine: 'underline',
    color: colors.textSubtitle,
  },
});
