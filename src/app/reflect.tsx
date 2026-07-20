// The cycle-end reflection, opened from the Now tab (the periods-phase action
// and the persistent Reflect button). One short, gentle retrospective that
// writes all three cycle-end stores at once:
//   - awareness beats (noticed the change, right-sized the response, what to
//     manage better next time)          -> reflect-log
//   - "did your symptoms ease this time" -> remission-log  (absorbed here)
//   - how the cycle landed per domain    -> cycle-impact   (feeds the You chart)
// Everything anchors to the cycle's start (lastPeriodStart). A cycle can be
// reflected on more than once: every open is a fresh, dated entry appended to
// the log, never a prefilled edit of the last.
//
// Shape: one decision per screen, not a scrolling form. The four awareness
// questions step by one gesture each (tap a choice, glide to the next), then
// the domain sliders, then the reveal beat — today's read joining prior cycles'
// ghost dots. That payoff (which otherwise lives only on the You tab she may
// never scroll to) is the argument for why she reflects, and it lands inside
// the flow.

import { Fragment, useCallback, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { colors } from '@/theme/colors';
import { clayChipSurface } from '@/theme/controls';
import { getPmsPrefs } from '@/store/pms-prefs';
import {
  IMPACT_DOMAINS,
  IMPACT_DOMAIN_LABEL,
  appendCycleImpact,
  getCycleImpacts,
  getMutedDomains,
  levelOf,
  priorDomainReads,
  setDomainMuted,
  type CycleImpactEntry,
  type ImpactDomain,
  type ImpactValue,
} from '@/store/cycle-impact';
import { appendRemission, type RemissionAnswer } from '@/store/remission-log';
import {
  MANAGE_LEVERS,
  MANAGE_LEVER_LABEL,
  recordReflect,
  type ManageLever,
} from '@/store/reflect-log';

// The rough/okay/fine word for a continuous 0–100 read, for the slider readout
// and the reveal captions.
const BAND_WORD = ['Rough', 'Okay', 'Fine'] as const;
const bandWord = (v: number) => BAND_WORD[levelOf(v) - 1];

const THUMB = 22;
const GHOST = 12;

// How long the chosen answer stays lit before the flow glides on, so a tap
// registers as an answer, not a blink.
const ADVANCE_MS = 260;

// Matches the You tab's chart so Reflect and You read as one system.
const DOMAIN_COLOR: Record<ImpactDomain, string> = {
  work: '#4ec7a6',
  partner: '#e87ba9',
  yourself: '#9d8cf0',
};

const REMISSION_OPTIONS: { answer: RemissionAnswer; label: string }[] = [
  { answer: 'no', label: 'Not really' },
  { answer: 'soft', label: 'Softer' },
  { answer: 'yes', label: 'Yes' },
];

const DOMAIN_ASK: Record<ImpactDomain, string> = {
  work: 'At work',
  partner: 'With your partner',
  yourself: 'With yourself',
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// The ordered screens. The first four are one-gesture awareness questions; then
// the domain sliders; then the reveal. Everything up to the reveal is an "input"
// step and shows a progress dot.
const STEPS = ['intro', 'noticed', 'rightSized', 'manage', 'ease', 'sliders', 'reveal'] as const;
type Step = (typeof STEPS)[number];
// The steps that carry a progress segment — the intro card and the reveal don't.
const PROGRESS_STEPS: Step[] = ['noticed', 'rightSized', 'manage', 'ease', 'sliders'];
const REVEAL_INDEX = STEPS.indexOf('reveal');

// A prior cycle's read, with a spoken-not-dated label ("last cycle", "2 cycles
// ago"). Dates make her do the math; the trajectory is the point.
type Ghost = { value: number; label: string };

function ghostsFor(impacts: CycleImpactEntry[], anchor: string, domain: ImpactDomain): Ghost[] {
  const prior = priorDomainReads(impacts, anchor, domain, 2); // oldest -> newest
  return prior.map((p, i) => ({
    value: p.value,
    label: i === prior.length - 1 ? 'last cycle' : '2 cycles ago',
  }));
}

export default function ReflectScreen() {
  // When opened right after logging a period (from the Now tab), the cycle to
  // look back on is the one that just ended — its anchor is passed explicitly,
  // because prefs.lastPeriodStart has already advanced to the new period. Opened
  // from the Reflect button mid-cycle, there's no param and we use the current
  // anchor as before.
  const { anchor: anchorParam } = useLocalSearchParams<{ anchor?: string }>();
  const closedAnchor = typeof anchorParam === 'string' && YMD.test(anchorParam) ? anchorParam : null;
  const [anchor, setAnchor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState<Set<ImpactDomain>>(new Set());
  const [stepIndex, setStepIndex] = useState(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Answers.
  const [noticed, setNoticed] = useState<boolean | null>(null);
  const [rightSized, setRightSized] = useState<boolean | null>(null);
  const [levers, setLevers] = useState<Set<ManageLever>>(new Set());
  const [remission, setRemission] = useState<RemissionAnswer | null>(null);
  const [impact, setImpact] = useState<Partial<Record<ImpactDomain, ImpactValue>>>({});
  // The whole impact log, so each slider can show its prior cycles as ghost dots
  // and the closing reveal can plot today's read joining them.
  const [impacts, setImpacts] = useState<CycleImpactEntry[]>([]);

  const clearAdvance = () => {
    if (advanceTimer.current != null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  };

  // Every open is a fresh look-back — a new dated entry, not a prefilled edit of
  // the last. Only the mute prefs and prior cycles' reads (the ghosts to compare
  // this one against) carry over.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const prefs = await getPmsPrefs().catch(() => null);
        const a = closedAnchor ?? prefs?.lastPeriodStart ?? null;
        const [mutedList, log] = await Promise.all([
          getMutedDomains().catch(() => [] as ImpactDomain[]),
          getCycleImpacts().catch(() => []),
        ]);
        if (!alive) return;
        setAnchor(a);
        setMuted(new Set(mutedList));
        setImpacts(log);
        setStepIndex(0);
        setNoticed(null);
        setRightSized(null);
        setLevers(new Set());
        setRemission(null);
        setImpact({});
        setLoaded(true);
      })();
      return () => {
        alive = false;
        clearAdvance();
      };
    }, [closedAnchor]),
  );

  const step: Step = STEPS[stepIndex];

  const goTo = (i: number) => {
    clearAdvance();
    setStepIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  };
  const back = () => goTo(stepIndex - 1);
  const next = () => goTo(stepIndex + 1);

  // Single-select answers light up, then the flow glides on by itself.
  const answerAndAdvance = (apply: () => void) => {
    apply();
    clearAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      setStepIndex((i) => Math.min(STEPS.length - 1, i + 1));
    }, ADVANCE_MS);
  };

  const toggleMute = (domain: ImpactDomain) => {
    Haptics.selectionAsync().catch(() => {});
    const nextSet = new Set(muted);
    const willMute = !nextSet.has(domain);
    if (willMute) nextSet.add(domain);
    else nextSet.delete(domain);
    setMuted(nextSet);
    setDomainMuted(domain, willMute).catch(() => {});
  };

  const toggleLever = (lever: ManageLever) => {
    Haptics.selectionAsync().catch(() => {});
    const nextSet = new Set(levers);
    if (nextSet.has(lever)) nextSet.delete(lever);
    else nextSet.add(lever);
    setLevers(nextSet);
  };

  // The domains she placed this look-back (rated, not muted). These are what the
  // reveal has to show, and what decides whether there is a reveal at all.
  const ratedDomains = IMPACT_DOMAINS.filter((d) => !muted.has(d) && impact[d] != null);

  const persist = async () => {
    if (anchor == null) return;
    const at = new Date().toISOString();
    const reads: Partial<Record<ImpactDomain, ImpactValue>> = {};
    for (const domain of ratedDomains) reads[domain] = impact[domain];
    await appendCycleImpact(anchor, reads, at).catch(() => {});
    if (remission != null) {
      await appendRemission({ cycleAnchor: anchor, answer: remission, at }).catch(() => {});
    }
    await recordReflect({
      cycleAnchor: anchor,
      noticedChange: noticed ?? false,
      rightSized: rightSized ?? false,
      manageBetter: [...levers],
      at,
    }).catch(() => {});
  };

  // Leaving the sliders: write everything, then either reveal the trend or, if
  // she placed nothing, close on a quiet note rather than an empty chart.
  const finishInputs = async () => {
    clearAdvance();
    if (anchor == null) {
      router.back();
      return;
    }
    await persist();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (ratedDomains.length === 0) {
      router.back();
      return;
    }
    goTo(REVEAL_INDEX);
  };

  const onHeaderLeft = () => {
    clearAdvance();
    if (stepIndex === 0 || step === 'reveal') router.back();
    else back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={onHeaderLeft} hitSlop={12} accessibilityRole="button">
            <Text style={styles.headerBtn}>
              {step === 'reveal' ? 'Done' : stepIndex === 0 ? 'Close' : 'Back'}
            </Text>
          </Pressable>
          <Text style={styles.title}>{step === 'reveal' ? 'Your trend' : 'Reflect'}</Text>
          <View style={{ width: 44 }} />
        </View>

        {PROGRESS_STEPS.includes(step) && anchor != null && (
          <Progress total={PROGRESS_STEPS.length} index={PROGRESS_STEPS.indexOf(step)} />
        )}

        {loaded && anchor == null ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Reflection compares this cycle with your last. Log a period first, then come
              back.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => router.replace('/now' as Href)}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Not yet</Text>
            </Pressable>
          </View>
        ) : anchor == null ? null : step === 'intro' ? (
          <Animated.View key="intro" entering={FadeIn.duration(240)} style={styles.flex}>
            <View style={styles.qCenter}>
              <Text style={styles.introLine}>
                It&apos;s important to know the changes month on month to help you better.
              </Text>
            </View>
            <View style={styles.qBottom}>
              <BeginButton fullWidth label="Start" onPress={next} />
            </View>
          </Animated.View>
        ) : step === 'noticed' ? (
          <ChoiceStep
            stepKey="noticed"
            title="Did you notice the emotional change this time?"
            caption="Easy to miss in the moment."
            hint="Naming the shift is part of what softens it."
            options={[
              { key: 'no', label: 'No' },
              { key: 'yes', label: 'Yes' },
            ]}
            selectedKey={noticed == null ? null : noticed ? 'yes' : 'no'}
            onPick={(k) => answerAndAdvance(() => setNoticed(k === 'yes'))}
          />
        ) : step === 'rightSized' ? (
          <ChoiceStep
            stepKey="rightSized"
            title="Did you catch how big it was, and pick your next move?"
            caption="No wrong answer here."
            options={[
              { key: 'no', label: 'No' },
              { key: 'yes', label: 'Yes' },
            ]}
            selectedKey={rightSized == null ? null : rightSized ? 'yes' : 'no'}
            onPick={(k) => answerAndAdvance(() => setRightSized(k === 'yes'))}
          />
        ) : step === 'manage' ? (
          <Animated.View key="manage" entering={FadeIn.duration(240)} style={styles.flex}>
            <View style={styles.qCenter}>
              <Text style={styles.qStatement}>What could you manage a little better next time?</Text>
              <Text style={styles.qCaption}>Pick any, or none.</Text>
              <View style={styles.chipWrap}>
                {MANAGE_LEVERS.map((l) => (
                  <Pressable
                    key={l}
                    onPress={() => toggleLever(l)}
                    style={[styles.chip, levers.has(l) && styles.chipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: levers.has(l) }}
                  >
                    <Text style={[styles.chipText, levers.has(l) && styles.chipTextOn]}>
                      {MANAGE_LEVER_LABEL[l]}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.qBottom}>
              <BeginButton fullWidth label={levers.size > 0 ? 'Next' : 'Skip'} onPress={next} />
            </View>
          </Animated.View>
        ) : step === 'ease' ? (
          <ChoiceStep
            stepKey="ease"
            title="Did your symptoms ease this time?"
            caption="Even a little counts."
            options={REMISSION_OPTIONS.map((o) => ({ key: o.answer, label: o.label }))}
            selectedKey={remission}
            onPick={(k) => answerAndAdvance(() => setRemission(k as RemissionAnswer))}
          />
        ) : step === 'sliders' ? (
          <Animated.View key="sliders" entering={FadeIn.duration(240)} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepTitle}>How was this PMS different?</Text>
              <Text style={styles.stepCaption}>Place each where it landed. Skip any that do not fit.</Text>
              <View style={styles.sectionGap} />

              {IMPACT_DOMAINS.map((domain) => {
                const isMuted = muted.has(domain);
                return (
                  <View key={domain} style={styles.domainRow}>
                    <View style={styles.domainHead}>
                      <Text style={styles.domainLabel}>{DOMAIN_ASK[domain]}</Text>
                      <Pressable onPress={() => toggleMute(domain)} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.muteLink}>{isMuted ? 'Ask again' : "Don't ask"}</Text>
                      </Pressable>
                    </View>
                    {isMuted ? (
                      <Text style={styles.mutedNote}>Muted. {IMPACT_DOMAIN_LABEL[domain]} stays off your chart.</Text>
                    ) : (
                      <ImpactSlider
                        value={impact[domain] ?? null}
                        ghosts={ghostsFor(impacts, anchor, domain)}
                        color={DOMAIN_COLOR[domain]}
                        onChange={(v) => setImpact((prev) => ({ ...prev, [domain]: v }))}
                      />
                    )}
                  </View>
                );
              })}

              <View style={styles.scrollBtn}>
                <BeginButton
                  fullWidth
                  label={ratedDomains.length > 0 ? 'See your trend' : 'Done'}
                  onPress={finishInputs}
                />
              </View>
            </ScrollView>
          </Animated.View>
        ) : (
          <Reveal
            anchor={anchor}
            impacts={impacts}
            ratedDomains={ratedDomains}
            impact={impact}
            onDone={() => router.back()}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// --- Small building blocks --------------------------------------------------

type Choice = { key: string; label: string };

// One awareness question, shaped like the game's Level 1: a prominent statement
// centred in the space, and the answers as big filled cards anchored at the
// bottom. Tapping a card lights it and the flow glides on. Same geometry as
// l1Choice in game-v3, in one calm brand tone (no right/wrong colour, because a
// reflection has no wrong answer).
function ChoiceStep({
  stepKey,
  title,
  caption,
  hint,
  options,
  selectedKey,
  onPick,
}: {
  stepKey: string;
  title: string;
  caption?: string;
  hint?: string;
  options: Choice[];
  selectedKey: string | null;
  onPick: (key: string) => void;
}) {
  return (
    <Animated.View key={stepKey} entering={FadeIn.duration(240)} style={styles.flex}>
      <View style={styles.qCenter}>
        <Text style={styles.qStatement}>{title}</Text>
        {caption != null && <Text style={styles.qCaption}>{caption}</Text>}
        {hint != null && <Text style={styles.qHint}>{hint}</Text>}
      </View>
      <View style={styles.qBottom}>
        <View style={styles.choiceRow}>
          {options.map((o) => {
            const on = selectedKey === o.key;
            return (
              <Pressable
                key={o.key}
                onPress={() => onPick(o.key)}
                style={[styles.choiceCard, on && styles.choiceCardOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={styles.choiceLabel}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

// The quiet progress: one thin segment per input step, filled up to where she
// is. Same bar as Level 1's l1Seg.
function Progress({ total, index }: { total: number; index: number }) {
  return (
    <View style={styles.segRow} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.seg, i <= index && styles.segOn]} />
      ))}
    </View>
  );
}

// A continuous "where did it land" track, Rough → Fine, with free placement and
// no resting default: un-placed until she touches it (a domain she never touches
// records nothing). Prior cycles sit on the same track as hollow ghost dots, so
// this cycle is felt as a comparison, not an isolated rating.
function ImpactSlider({
  value,
  ghosts,
  color,
  onChange,
}: {
  value: number | null;
  ghosts: Ghost[];
  color: string;
  onChange: (v: number) => void;
}) {
  const [w, setW] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromX = (x: number) => {
    const usable = widthRef.current - THUMB;
    if (usable <= 0) return;
    const f = Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    let v = Math.round(f * 100);
    // New writes never emit 1|2|3: those exact integers are how legacy reads are
    // recognised (cycle-impact.ts). Collapsing the roughest sliver to 0 removes
    // the collision without losing any meaningful precision at the rough end.
    if (v === 1 || v === 2 || v === 3) v = 0;
    Haptics.selectionAsync().catch(() => {});
    onChangeRef.current(v);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
      onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
    }),
  ).current;

  const usable = Math.max(0, w - THUMB);
  const xForValue = (v: number) => THUMB / 2 + (v / 100) * usable;
  const newest = ghosts.length > 0 ? ghosts[ghosts.length - 1] : null;

  return (
    <View>
      <View
        style={styles.sliderArea}
        onLayout={(e) => {
          widthRef.current = e.nativeEvent.layout.width;
          setW(e.nativeEvent.layout.width);
        }}
        {...pan.panHandlers}
      >
        <View style={styles.sliderTrack} />
        {value != null && (
          <View style={[styles.sliderFill, { width: xForValue(value), backgroundColor: color, opacity: 0.85 }]} />
        )}
        {ghosts.map((g, i) => (
          <View
            key={`${g.label}-${i}`}
            pointerEvents="none"
            style={[styles.ghostDot, { left: xForValue(g.value) - GHOST / 2 }]}
          />
        ))}
        {value != null && (
          <View pointerEvents="none" style={[styles.thumb, { left: xForValue(value) - THUMB / 2 }]} />
        )}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEnd}>Rough</Text>
        <Text style={[styles.sliderValue, value == null && { opacity: 0.55 }]}>
          {value != null
            ? bandWord(value)
            : newest != null
              ? `Last cycle · ${bandWord(newest.value)}`
              : 'Drag to place'}
        </Text>
        <Text style={styles.sliderEnd}>Fine</Text>
      </View>
    </View>
  );
}

// --- The reveal (Level 5) ---------------------------------------------------

// The payoff beat. For each domain she placed, today's read joins the prior
// cycles' ghost dots on a Rough → Fine track and the rows ease in one by one.
// From cycle two on, the moving dots are the argument for why she reflects.
function Reveal({
  anchor,
  impacts,
  ratedDomains,
  impact,
  onDone,
}: {
  anchor: string;
  impacts: CycleImpactEntry[];
  ratedDomains: ImpactDomain[];
  impact: Partial<Record<ImpactDomain, ImpactValue>>;
  onDone: () => void;
}) {
  const [w, setW] = useState(0);
  const anyTrend = ratedDomains.some((d) => ghostsFor(impacts, anchor, d).length > 0);

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInDown.duration(460)} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <Text style={styles.eyebrow}>Your trend</Text>
        <Text style={styles.revealTitle}>
          {anyTrend ? 'Here is how it is moving' : 'Your starting point'}
        </Text>
      </Animated.View>

      {ratedDomains.map((domain, idx) => {
        const today = impact[domain];
        if (today == null) return null;
        const ghosts = ghostsFor(impacts, anchor, domain);
        return (
          <Animated.View
            key={domain}
            entering={FadeInDown.delay(120 + idx * 110).duration(460)}
            style={styles.trendRow}
          >
            <Text style={styles.trendDomain}>{IMPACT_DOMAIN_LABEL[domain]}</Text>
            <TrendSpark width={Math.max(1, w - 32)} ghosts={ghosts} today={today} color={DOMAIN_COLOR[domain]} />
            <Text style={styles.trendCaption}>{trendCaption(today, ghosts)}</Text>
          </Animated.View>
        );
      })}

      <View style={styles.scrollBtn}>
        <BeginButton fullWidth label="Done" onPress={onDone} />
      </View>
    </ScrollView>
  );
}

function trendCaption(today: number, ghosts: Ghost[]): string {
  if (ghosts.length === 0) {
    return `Placed at ${bandWord(today).toLowerCase()}. Next cycle you will see it move.`;
  }
  const last = ghosts[ghosts.length - 1].value;
  const move = levelOf(today) - levelOf(last);
  const t = bandWord(today).toLowerCase();
  const l = bandWord(last).toLowerCase();
  if (move > 0) return `Last cycle ${l}, this cycle ${t}.`;
  if (move < 0) return `Last cycle ${l}, this cycle ${t}. You still showed up.`;
  return `Steady at ${t} since last cycle.`;
}

// A compact Rough → Fine sparkline: ghost dots (hollow) for prior cycles, then
// today's solid dot, joined by a line. Same axis as the You tab's chart.
function TrendSpark({
  width,
  ghosts,
  today,
  color,
}: {
  width: number;
  ghosts: Ghost[];
  today: number;
  color: string;
}) {
  const H = 104;
  const padL = 12;
  const padR = 40;
  const padT = 14;
  const padB = 24;
  const w = Math.max(1, width);
  const plotW = Math.max(1, w - padL - padR);
  const plotH = H - padT - padB;

  const points = [...ghosts.map((g) => g.value), today];
  const n = points.length;
  const xAt = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
  const yForValue = (v: number) => padT + ((100 - v) / 100) * plotH;
  const labels = [...ghosts.map((g) => g.label), 'now'];
  const linePts = points.map((v, i) => `${xAt(i)},${yForValue(v)}`).join(' ');

  return (
    <Svg width={w} height={H} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[
        { v: 100, label: 'fine' },
        { v: 0, label: 'rough' },
      ].map(({ v, label }) => {
        const y = yForValue(v);
        return (
          <Fragment key={label}>
            <Line x1={padL} y1={y} x2={w - padR} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
            <SvgText x={w - padR + 6} y={y + 3} fill="rgba(244,242,248,0.32)" fontSize={9}>
              {label}
            </SvgText>
          </Fragment>
        );
      })}
      {n >= 2 && (
        <Polyline
          points={linePts}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={0.9}
        />
      )}
      {ghosts.map((g, i) => (
        <Circle
          key={`g-${i}`}
          cx={xAt(i)}
          cy={yForValue(g.value)}
          r={4}
          fill="#14101c"
          stroke={color}
          strokeWidth={1.6}
          opacity={0.55}
        />
      ))}
      <Circle cx={xAt(n - 1)} cy={yForValue(today)} r={5.5} fill={color} stroke="#14101c" strokeWidth={2} />
      {labels.map((label, i) => {
        // Anchor the end labels inward so they can't overflow the card: the
        // first grows rightward from the left edge, the last leftward from the
        // right. A lone label (first cycle, no ghosts) stays centred on its dot.
        const only = labels.length === 1;
        const first = i === 0;
        const last = i === labels.length - 1;
        const textAnchor = only ? 'middle' : first ? 'start' : last ? 'end' : 'middle';
        const x = only ? xAt(i) : first ? padL : last ? w - padR : xAt(i);
        return (
          <SvgText
            key={`lbl-${i}`}
            x={x}
            y={H - 7}
            fill="rgba(244,242,248,0.42)"
            fontSize={9.5}
            textAnchor={textAnchor}
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerBtn: { fontFamily: 'Poppins-Regular', fontSize: 15, color: colors.textTertiary, width: 44 },
  title: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  // Quiet progress across the input steps — the same thin segment bar as Level 1.
  segRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.14)' },
  segOn: { backgroundColor: 'rgba(169, 184, 232, 0.9)' },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  scrollBtn: { marginTop: 20 },
  // A question laid out like Level 1: statement centred in the space, answers as
  // big cards anchored at the bottom.
  qCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  qStatement: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  qCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  qHint: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.42)',
    textAlign: 'center',
    marginTop: 4,
  },
  qBottom: { paddingHorizontal: 20, paddingBottom: 24 },
  // The intro card's one warm line — the reason this look-back is worth it.
  introLine: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 30,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  // The Level 1 choice card (l1Choice geometry), in one calm brand tone.
  choiceRow: { flexDirection: 'row', gap: 12 },
  choiceCard: {
    flex: 1,
    minHeight: 92,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(169, 184, 232, 0.45)',
    backgroundColor: 'rgba(143, 168, 232, 0.16)',
  },
  choiceCardOn: {
    borderColor: 'rgba(199, 212, 247, 0.95)',
    backgroundColor: 'rgba(143, 168, 232, 0.36)',
  },
  choiceLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  eyebrow: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  // Reused by the sliders step's heading.
  stepTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 21,
    lineHeight: 29,
    color: colors.textPrimary,
  },
  stepCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 8,
  },
  sectionGap: { height: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  chip: {
    ...clayChipSurface,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  chipOn: {
    borderColor: 'rgba(169, 184, 232, 0.7)',
    backgroundColor: 'rgba(143, 168, 232, 0.18)',
  },
  chipText: { fontFamily: 'Poppins-Regular', fontSize: 13.5, color: 'rgba(255,255,255,0.7)' },
  chipTextOn: { fontFamily: 'Poppins-Medium', color: '#ffffff' },
  sliderArea: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  sliderFill: {
    position: 'absolute',
    top: 20,
    left: 0,
    height: 4,
    borderRadius: 2,
  },
  // A prior cycle's read — a quiet hollow dot on the same track to compare
  // this cycle against.
  ghostDot: {
    position: 'absolute',
    top: 22 - GHOST / 2,
    width: GHOST,
    height: GHOST,
    borderRadius: GHOST / 2,
    backgroundColor: colors.backgroundBottom,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  thumb: {
    position: 'absolute',
    top: 11,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(169, 184, 232, 0.9)',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  sliderEnd: { fontFamily: 'Poppins-Regular', fontSize: 11, color: 'rgba(255,255,255,0.4)' },
  sliderValue: { fontFamily: 'Poppins-Medium', fontSize: 12.5, color: '#ffffff' },
  domainRow: { marginBottom: 20 },
  domainHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  domainLabel: { fontFamily: 'Poppins-Medium', fontSize: 14, color: colors.textPrimary },
  muteLink: { fontFamily: 'Poppins-Regular', fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  mutedNote: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
  },
  // The reveal beat.
  revealTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 20,
    lineHeight: 27,
    color: colors.textPrimary,
    marginBottom: 18,
  },
  trendRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 16,
    marginBottom: 12,
  },
  trendDomain: {
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  trendCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.66)',
    marginTop: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 20 },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  primaryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: 'hsl(270, 50%, 45%)',
  },
  primaryBtnText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#ffffff' },
});
