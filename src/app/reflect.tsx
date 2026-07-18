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

import { useCallback, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { clayChipSurface } from '@/theme/controls';
import { getPmsPrefs } from '@/store/pms-prefs';
import { getPeriodHistory } from '@/store/period-history';
import { reflectionAnchor } from '@/lib/today-action';
import {
  IMPACT_DOMAINS,
  IMPACT_DOMAIN_LABEL,
  appendCycleImpact,
  getCycleImpacts,
  getMutedDomains,
  lastImpactReads,
  setDomainMuted,
  type ImpactDomain,
  type ImpactLevel,
} from '@/store/cycle-impact';
import { appendRemission, type RemissionAnswer } from '@/store/remission-log';
import {
  MANAGE_LEVERS,
  MANAGE_LEVER_LABEL,
  recordReflect,
  type ManageLever,
} from '@/store/reflect-log';

// Short, locale-free stamp for the reflection's title — enough to tell one
// look-back from another ("Mon, 13 Jul · 2:45 PM"). Manual, since Hermes Intl
// coverage varies across the SDK.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const STAMP_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

function formatStamp(d: Date): string {
  let h = d.getHours();
  const ampm = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${STAMP_MONTHS[d.getMonth()]} · ${h}:${mm} ${ampm}`;
}

const IMPACT_LABELS = ['Rough', 'Okay', 'Fine'] as const; // index = level - 1
const THUMB = 22;

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

export default function ReflectScreen() {
  const [anchor, setAnchor] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openedAt, setOpenedAt] = useState<Date | null>(null);
  const [muted, setMuted] = useState<Set<ImpactDomain>>(new Set());

  // Answers.
  const [noticed, setNoticed] = useState<boolean | null>(null);
  const [rightSized, setRightSized] = useState<boolean | null>(null);
  const [levers, setLevers] = useState<Set<ManageLever>>(new Set());
  const [remission, setRemission] = useState<RemissionAnswer | null>(null);
  const [impact, setImpact] = useState<Partial<Record<ImpactDomain, ImpactLevel>>>({});
  // Last cycle's reads, shown as a ghost marker on each slider so this cycle is
  // felt as a comparison, not an isolated rating.
  const [lastImpact, setLastImpact] = useState<Partial<Record<ImpactDomain, ImpactLevel>>>({});

  // Every open is a fresh look-back — a new dated entry, not a prefilled edit of
  // the last. Only the mute prefs and the "last time" ghost (her most recent
  // reflection, to compare this one against) carry over.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [prefs, history, mutedList, impacts] = await Promise.all([
          getPmsPrefs().catch(() => null),
          getPeriodHistory().catch(() => [] as string[]),
          getMutedDomains().catch(() => [] as ImpactDomain[]),
          getCycleImpacts().catch(() => []),
        ]);
        // Anchor to the cycle being closed, not the freshly-logged one, so the
        // read joins the moon minted for it (see reflectionAnchor).
        const a = prefs == null ? null : reflectionAnchor(prefs, history, new Date());
        if (!alive) return;
        setAnchor(a);
        setMuted(new Set(mutedList));
        setLastImpact(lastImpactReads(impacts) ?? {});
        setNoticed(null);
        setRightSized(null);
        setLevers(new Set());
        setRemission(null);
        setImpact({});
        setOpenedAt(new Date());
        setLoaded(true);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const toggleMute = (domain: ImpactDomain) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Set(muted);
    const willMute = !next.has(domain);
    if (willMute) next.add(domain);
    else next.delete(domain);
    setMuted(next);
    setDomainMuted(domain, willMute).catch(() => {});
  };

  const toggleLever = (lever: ManageLever) => {
    Haptics.selectionAsync().catch(() => {});
    const next = new Set(levers);
    if (next.has(lever)) next.delete(lever);
    else next.add(lever);
    setLevers(next);
  };

  const onSave = async () => {
    if (anchor == null) {
      router.back();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const at = new Date().toISOString();
    // One appended impact entry holding every non-muted domain she rated.
    const reads: Partial<Record<ImpactDomain, ImpactLevel>> = {};
    for (const domain of IMPACT_DOMAINS) {
      const level = impact[domain];
      if (!muted.has(domain) && level != null) reads[domain] = level;
    }
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
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button">
            <Text style={styles.headerBtn}>Close</Text>
          </Pressable>
          <Text style={styles.title}>Look back</Text>
          <View style={{ width: 44 }} />
        </View>

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
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {openedAt != null && <Text style={styles.stamp}>{formatStamp(openedAt)}</Text>}
            <Text style={styles.eyebrow}>A quick look back</Text>

            <Question title="Did you notice the emotional change this time?" caption="Easy to miss in the moment.">
              <YesNo value={noticed} onChange={setNoticed} />
            </Question>

            <Question
              title="Did you catch how big it was, and pick your next move?"
              caption="No wrong answer here."
            >
              <YesNo value={rightSized} onChange={setRightSized} />
            </Question>

            <Question
              title="What could you manage a little better next time?"
              caption="Pick any, or none."
            >
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
            </Question>

            <Question title="Did your symptoms ease this time?" caption="Even a little counts.">
              <Segmented
                options={REMISSION_OPTIONS.map((o) => ({ key: o.answer, label: o.label }))}
                value={remission}
                onChange={(k) => setRemission(k as RemissionAnswer)}
              />
            </Question>

            <View style={styles.sectionGap} />
            <Text style={styles.eyebrow}>How was this PMS different?</Text>

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
                      lastValue={lastImpact[domain] ?? null}
                      onChange={(lvl) => setImpact((prev) => ({ ...prev, [domain]: lvl }))}
                    />
                  )}
                </View>
              );
            })}

            <Pressable style={styles.saveBtn} onPress={onSave} accessibilityRole="button">
              <Text style={styles.saveBtnText}>Save reflection</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// --- Small building blocks --------------------------------------------------

function Question({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.question}>
      <Text style={styles.qTitle}>{title}</Text>
      {caption != null && <Text style={styles.qCaption}>{caption}</Text>}
      <View style={{ marginTop: 12 }}>{children}</View>
    </View>
  );
}

function YesNo({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <Segmented
      options={[
        { key: 'no', label: 'No' },
        { key: 'yes', label: 'Yes' },
      ]}
      value={value == null ? null : value ? 'yes' : 'no'}
      onChange={(k) => onChange(k === 'yes')}
    />
  );
}

// A stepped "progress mover": drag the thumb across Rough / Okay / Fine, with a
// ghost tick showing last cycle's read so this cycle reads as a comparison.
function ImpactSlider({
  value,
  lastValue,
  onChange,
}: {
  value: ImpactLevel | null;
  lastValue: ImpactLevel | null;
  onChange: (lvl: ImpactLevel) => void;
}) {
  const [w, setW] = useState(0);
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const setFromX = (x: number) => {
    const usable = widthRef.current - THUMB;
    if (usable <= 0) return;
    const f = Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    const lvl = (f < 0.25 ? 1 : f < 0.75 ? 2 : 3) as ImpactLevel;
    Haptics.selectionAsync().catch(() => {});
    onChangeRef.current(lvl);
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
  const fracOf = (lvl: ImpactLevel | null) => (lvl == null ? null : (lvl - 1) / 2);
  const valFrac = fracOf(value);
  const lastFrac = fracOf(lastValue);
  const shownFrac = valFrac ?? 0.5; // rest at centre until she sets it

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
          <View style={[styles.sliderFill, { width: THUMB / 2 + shownFrac * usable }]} />
        )}
        {lastFrac != null && (
          <View pointerEvents="none" style={[styles.lastTick, { left: THUMB / 2 + lastFrac * usable - 1 }]} />
        )}
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: shownFrac * usable, opacity: value == null ? 0.4 : 1 }]}
        />
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderEnd}>Rough</Text>
        <Text style={[styles.sliderValue, value == null && { opacity: 0.5 }]}>
          {value != null
            ? IMPACT_LABELS[value - 1]
            : lastValue != null
              ? `Last time · ${IMPACT_LABELS[lastValue - 1]}`
              : 'Drag to rate'}
        </Text>
        <Text style={styles.sliderEnd}>Fine</Text>
      </View>
    </View>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string | null;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.key);
            }}
            style={[styles.segItem, on && styles.segItemOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.segText, on && styles.segTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerBtn: { fontFamily: 'Poppins-Regular', fontSize: 15, color: colors.textTertiary, width: 44 },
  title: { fontFamily: 'Poppins-Medium', fontSize: 16, color: colors.textPrimary },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  // The moment-stamp: names this look-back by when it was opened, so a repeat
  // reflection reads as a new one rather than an edit of the last.
  stamp: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.66)',
    letterSpacing: 0.2,
    marginBottom: 3,
  },
  eyebrow: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  sectionGap: { height: 20 },
  sectionCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginTop: -6,
    marginBottom: 14,
  },
  question: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 18,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    padding: 16,
    marginBottom: 12,
  },
  qTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  qCaption: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
  },
  segItemOn: {
    borderColor: 'rgba(169, 184, 232, 0.7)',
    backgroundColor: 'rgba(143, 168, 232, 0.18)',
  },
  segText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13.5,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.2,
  },
  segTextOn: { color: '#ffffff' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    ...clayChipSurface,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  chipOn: {
    borderColor: 'rgba(169, 184, 232, 0.7)',
    backgroundColor: 'rgba(143, 168, 232, 0.18)',
  },
  chipText: { fontFamily: 'Poppins-Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  chipTextOn: { fontFamily: 'Poppins-Medium', color: '#ffffff' },
  sliderArea: { height: 44, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255, 255, 255, 0.14)' },
  sliderFill: {
    position: 'absolute',
    top: 20,
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(143, 168, 232, 0.85)',
  },
  // Last cycle's read — a quiet ghost tick to compare this cycle against.
  lastTick: {
    position: 'absolute',
    top: 14,
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
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
  domainRow: {
    marginBottom: 18,
  },
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
  saveBtn: {
    marginTop: 12,
    paddingVertical: 15,
    borderRadius: 20,
    backgroundColor: colors.primarySolid,
    alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Poppins-Medium', fontSize: 15, color: '#ffffff', letterSpacing: 0.3 },
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
    backgroundColor: colors.primarySolid,
  },
  primaryBtnText: { fontFamily: 'Poppins-Medium', fontSize: 14, color: '#ffffff' },
});
