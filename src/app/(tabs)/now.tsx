// Now: the app's home tab. One calm, softly-blurred moon carries the whole soul
// — her earned rings, her brightness, her material — breathing so just looking
// pulls you into sync. Under it, one ask in her own voice: "I feel [____]" (a
// feeling drifting soft->intense, fresh each open) and the CTA "what do I do",
// opening the Moon flow. A small pill up top holds the cycle context and the one
// door to log periods. Everything browsable lives in Grow; everything reflective
// in You.

import { useCallback, useEffect, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CosmicBackground } from '@/components/cosmic-background';
import { PlannedActions } from '@/components/planned-actions';
import { getPlannedActions } from '@/store/moment-plan';
import { FeelingLine } from '@/components/feeling-line';
import { BAR_CONTENT_HEIGHT, BAR_MIN_BOTTOM_PAD } from '@/components/night-tab-bar';
import { Orb } from '@/components/orb';
import { OnboardingCard } from '@/components/onboarding-card';
import { PeriodSheet } from '@/components/period-sheet';
import { RingCelebration } from '@/components/RingCelebration';
import { ShootingStar } from '@/components/ShootingStar';
import { bodyHue } from '@/models/tiers';
import { colors } from '@/theme/colors';
import { glass } from '@/theme/glass';
import { fontScale } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
import { spacing, radius, pageGutter } from '@/theme/spacing';
import { bandHeadline } from '@/lib/phase-band';
import { prefsAfterPeriodLog } from '@/lib/cycle-tune';
import { syncPmsReminders } from '@/lib/pms-reminders';
import { daysBetween, engagedDatesFrom, foldLedger } from '@/lib/moon-light';
import { lightEarned } from '@/lib/light-bus';
import { getLightLedger, recordLight } from '@/store/light-ledger';
import {
  clearPendingCrossings,
  getPendingCrossings,
  type PendingCrossing,
} from '@/store/pending-crossing';
import { getMoonState, recordCycleMint, type MoonState } from '@/store/moon-state';
import {
  getOnboardingV3Progress,
  setupCardFor,
  type SetupCard,
} from '@/store/onboarding-v3-progress';
import {
  addPeriodStart,
  getPeriodHistory,
  latestStart,
  setPeriodHistory,
} from '@/store/period-history';
import { DEFAULT_PERIOD_LENGTH, getPmsPrefs, setPmsPrefs, type PmsPrefs } from '@/store/pms-prefs';
import { getPmsReads, type PmsRead } from '@/store/pms-reads';
import { todayYmd } from '@/store/pms-readiness';
import { getRemissionLog, type RemissionEntry } from '@/store/remission-log';
import { clearMomentCheckpoint, getMomentCheckpoint } from '@/store/moment-resume';
import { getMoonConsent, setMoonConsent } from '@/store/moon-consent';
import { MeetMoonConsent } from '@/app/onboarding-v3';

// The home moon paces a calm, exhale-biased breath so just looking at it pulls
// you into sync. ~6 breaths/min with a longer exhale is the resonance sweet spot
// and the easiest to fall into passively. No hold: a pause would break a casual
// viewer's entrainment.
const BREATH_IN = 4; // seconds, inhale
const BREATH_OUT = 6; // seconds, exhale (longer = calming)

// The moon sizes to the screen so the whole composition (moon + ask) sits calmly
// in one viewport. Its canvas is 1.8x the sphere, so scaling it down on short
// phones keeps the moon from crowding the ask below.
function orbSizeFor(screenHeight: number): number {
  if (screenHeight >= 800) return 190; // 15/16, Pro, Max, Plus
  if (screenHeight >= 740) return 174; // 13 mini, 12/13 standard shorties
  return 154; // SE, small legacy
}

// Everything the screen needs, loaded in one pass so the render derives from a
// single consistent snapshot.
type Snapshot = {
  prefs: PmsPrefs;
  reads: PmsRead[];
  setupCard: SetupCard | null;
  // The one moon's state: rings from lifetime light, brightness + material from
  // the persisted moon-state (moon-reward-spec.md).
  moonState: MoonState;
  lifetimeLight: number;
  periodHistory: string[];
  remissionLog: RemissionEntry[];
  // A Moon flow left unfinished: Home offers to pick it up where she left off.
  hasResume: boolean;
  // Moves parked for later exist, so the "Waiting for you" cluster shows.
  hasPlanned: boolean;
  now: Date;
};

async function loadSnapshot(): Promise<Snapshot> {
  const now = new Date();
  const [prefs, reads, progress, moonState, ledger, periodHistory, remissionLog, checkpoint, planned] =
    await Promise.all([
      getPmsPrefs(),
      getPmsReads(),
      getOnboardingV3Progress().catch(() => null),
      getMoonState(),
      getLightLedger(),
      getPeriodHistory(),
      getRemissionLog(),
      getMomentCheckpoint().catch(() => null),
      getPlannedActions().catch(() => []),
    ]);
  return {
    prefs,
    reads,
    setupCard: progress == null ? null : setupCardFor(progress, reads.length > 0),
    moonState,
    lifetimeLight: foldLedger(ledger).lifetimeLight,
    periodHistory,
    remissionLog,
    hasResume: checkpoint != null,
    hasPlanned: planned.length > 0,
    now,
  };
}

export default function NowScreen() {
  // Content centers in the space above the night-sky tab bar; the padding has to
  // clear the bar glass.
  const insets = useSafeAreaInsets();
  const barHeight = BAR_CONTENT_HEIGHT + Math.max(insets.bottom, BAR_MIN_BOTTOM_PAD);
  const { height: screenHeight } = useWindowDimensions();
  const ORB_SIZE = orbSizeFor(screenHeight);

  // The glass card (and the moon behind it) share these bounds: a fixed height,
  // CENTRED in the space above the tab bar, black all around it. A notification
  // renders in the gap below the card — raising notifShift to its height slides
  // the card up to make room. The moon centres within these bounds, so the gap
  // above it (chip → moon) and below it (moon → Reflect) stay balanced.
  const avail = screenHeight - insets.top - barHeight;
  const cardHeight = Math.min(avail - spacing.xxl, 580);
  const notifShift = 0; // set to a shown notification's height to slide the card up
  const cardTop = insets.top + Math.max((avail - cardHeight) / 2 - notifShift, spacing.xs);

  // Drive the moon's inhale/exhale on a focus-gated loop, so a hidden Now tab
  // does no timer work and each return restarts on a fresh, calming inhale.
  const [breath, setBreath] = useState<'inhale' | 'exhale'>('inhale');
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      let timer: ReturnType<typeof setTimeout>;
      const schedule = (current: 'inhale' | 'exhale') => {
        const secs = current === 'inhale' ? BREATH_IN : BREATH_OUT;
        timer = setTimeout(() => {
          if (!alive) return;
          const next = current === 'inhale' ? 'exhale' : 'inhale';
          setBreath(next);
          schedule(next);
        }, secs * 1000);
      };
      schedule('inhale');
      return () => {
        alive = false;
        clearTimeout(timer);
      };
    }, []),
  );
  const breathDuration = breath === 'inhale' ? BREATH_IN : BREATH_OUT;

  // One snapshot feeds the whole screen; refreshed on focus and on foreground.
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  // Live "waiting for you" count from PlannedActions, so the divider hides the
  // instant the last parked move is ticked off (not on the next refocus). Null
  // until it first reports; falls back to the snapshot's hasPlanned before then.
  const [plannedLive, setPlannedLive] = useState<boolean | null>(null);
  const onPlannedCount = useCallback((n: number) => setPlannedLive(n > 0), []);
  // Bumped on every genuine open (focus / foreground) to re-key the feeling line
  // so each arrival draws a fresh emotion.
  const [openSeed, setOpenSeed] = useState(0);
  // A ring or material crossing owed a celebration, played as a bloom on the
  // moon the moment she lands on Home (earned here or in a flow she just left).
  const [crossing, setCrossing] = useState<PendingCrossing | null>(null);
  const reload = useCallback(() => {
    setOpenSeed((s) => s + 1);
    // The arrival earns its light (first open of the day; repeats are free
    // no-ops). The moon itself stays bright — absence never dims it.
    recordLight('visit')
      .catch(() => {})
      .finally(() => {
        loadSnapshot()
          .then(setSnapshot)
          .catch(() => {})
          .finally(() => {
            // A crossing earned anywhere — this visit, or a flow she just left —
            // gets its moment here on the moon. Material milestones outrank rings.
            getPendingCrossings()
              .then((owed) => {
                if (owed.length === 0) return;
                clearPendingCrossings().catch(() => {});
                setCrossing(owed.find((c) => c.kind === 'material') ?? owed[owed.length - 1]);
              })
              .catch(() => {});
          });
      });
  }, []);
  useFocusEffect(
    useCallback(() => {
      reload();
      syncPmsReminders().catch(() => {});
    }, [reload]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reload();
    });
    return () => sub.remove();
  }, [reload]);

  // The cycle context pill: the runway line ("14 days to PMS" / "PMS days ·
  // day 2"). Null when PMS mode is off or no period is logged — then no pill.
  const pillText = snapshot == null ? null : bandHeadline(snapshot.prefs, snapshot.now);

  // Onboarding gate: until she has a PMS read, the home pins one card — finish
  // setup — in place of the ask, which needs that data.
  const setupCard = snapshot?.setupCard ?? null;
  const needsOnboarding = setupCard != null;

  // A subtle swell when light lands or a crossing blooms — brighter is the whole
  // reward (no numbers, per the no-points design).
  const shimmer = useSharedValue(1);
  const glowStyle = useAnimatedStyle(() => ({ transform: [{ scale: shimmer.value }] }));

  // The Home crossing moment: once a crossing is owed, play the bloom, land a
  // success haptic, then let it clear itself.
  useEffect(() => {
    if (crossing == null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => setCrossing(null), 2800);
    return () => clearTimeout(t);
  }, [crossing]);

  // Light landed while she's on Home: the moon gives a quiet, wordless swell.
  useFocusEffect(
    useCallback(
      () =>
        lightEarned.subscribe(() => {
          shimmer.value = withSequence(
            withTiming(1.035, { duration: 220, easing: Easing.out(Easing.sin) }),
            withTiming(1, { duration: 520, easing: Easing.inOut(Easing.sin) }),
          );
        }),
      [shimmer],
    ),
  );

  // --- Handlers -----------------------------------------------------------

  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);

  // Apple 5.1.2(i) gate: the first time she opens Moon (any entry that routes to
  // /moment, where reflection text is sent to the AI), she must see and agree to
  // the "Meet Moon" consent screen. Once agreed it never shows again. The pending
  // href is held so "I agree" lands on the exact target she tapped (fresh or resume).
  const [consentHref, setConsentHref] = useState<Href | null>(null);

  const openMoon = useCallback((href: Href) => {
    getMoonConsent()
      .then((agreed) => {
        if (agreed) {
          router.push(href);
        } else {
          setConsentHref(href);
        }
      })
      .catch(() => setConsentHref(href));
  }, []);

  const openPeriods = () => {
    Haptics.selectionAsync().catch(() => {});
    setPeriodSheetVisible(true);
  };

  // Logging a period is the one write that re-anchors the whole prediction: the
  // newest start becomes the anchor and, once three real cycles exist, the cycle
  // length tunes itself to the observed median (lib/cycle-tune).
  const onPeriodConfirm = (date: Date) => {
    if (snapshot == null) return;
    const ymd = todayYmd(date);
    // A live confirmation closes a cycle when it lands a plausible gap after the
    // current anchor and is recent — the same guard that lets it mint a moon.
    const prevAnchor = snapshot.prefs.lastPeriodStart;
    const cycleDays = prevAnchor == null ? null : daysBetween(prevAnchor, ymd);
    const recency = daysBetween(ymd, todayYmd(snapshot.now));
    const closedRealCycle =
      prevAnchor != null &&
      cycleDays != null &&
      cycleDays >= 15 &&
      cycleDays <= 60 &&
      recency != null &&
      recency >= 0 &&
      recency <= 10;
    // Whether she has already looked back on the cycle just closed.
    const alreadyReflected =
      prevAnchor != null && snapshot.remissionLog.some((e) => e.cycleAnchor === prevAnchor);
    addPeriodStart(ymd)
      .then(async (history) => {
        await setPmsPrefs(prefsAfterPeriodLog(snapshot.prefs, history));
        await syncPmsReminders().catch(() => {});
        // Mint the closed cycle onto the shelf (moon-reward-spec.md).
        if (closedRealCycle && prevAnchor != null) {
          const clarity =
            snapshot.remissionLog.find((e) => e.cycleAnchor === prevAnchor)?.answer ?? null;
          const ledger = await getLightLedger();
          await recordCycleMint({
            cycleStart: prevAnchor,
            cycleEnd: ymd,
            clarity,
            engagedDates: engagedDatesFrom(ledger),
            totals: foldLedger(ledger),
          }).catch(() => {});
        }
      })
      .then(reload)
      .then(() => {
        // A cycle just closed and she hasn't looked back on it yet: close the
        // calendar and offer the cycle-end reflection, anchored to the cycle that
        // ended. This offers, never gates — Reflect's own Close is the escape.
        if (closedRealCycle && !alreadyReflected && prevAnchor != null) {
          setPeriodSheetVisible(false);
          router.push({ pathname: '/reflect', params: { anchor: prevAnchor } });
        }
      })
      .catch(() => {});
  };

  const onPeriodRemove = (startYmd: string) => {
    if (snapshot == null) return;
    const remaining = snapshot.periodHistory.filter((s) => s !== startYmd);
    setPeriodHistory(remaining)
      .then(async () => {
        if (snapshot.prefs.lastPeriodStart === startYmd) {
          await setPmsPrefs({ ...snapshot.prefs, lastPeriodStart: latestStart(remaining) });
        }
      })
      .then(reload)
      .catch(() => {});
  };

  const onPeriodLengthChange = (length: number) => {
    if (snapshot == null) return;
    setPmsPrefs({ ...snapshot.prefs, periodLength: length }).then(reload).catch(() => {});
  };

  const onCycleLengthChange = (length: number) => {
    if (snapshot == null) return;
    setPmsPrefs({ ...snapshot.prefs, cycleLength: length }).then(reload).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <CosmicBackground />
      {/* The ambient light-line: a shooting star arcing across the home sky. */}
      <ShootingStar />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        {/* The moon lives in the background — it fades in first, on the mostly-
            black sky, and then the glass appears over it. Ringless sphere + rose
            halo (warmHalo keeps the halo centred on the sphere). */}
        {snapshot != null && (
          <Animated.View
            entering={FadeIn.duration(1300)}
            pointerEvents="none"
            style={[styles.moonLayer, { top: cardTop, height: cardHeight }]}
          >
            <Animated.View style={glowStyle}>
              <Orb
                size={ORB_SIZE}
                phase={breath}
                phaseDuration={breathDuration}
                breathRange={{ min: 0.97, max: 1.03 }}
                warmHalo
                hue={bodyHue(snapshot.lifetimeLight)}
                brightness={snapshot.moonState.fullness}
                illum={snapshot.moonState.fullness}
                material={snapshot.moonState.material}
              />
            </Animated.View>
          </Animated.View>
        )}

        {/* Until she's onboarded, the finish-setup card floats over the sky —
            no glass card, no cycle data to frame yet. */}
        {needsOnboarding && setupCard != null ? (
          <Animated.View
            entering={FadeInDown.delay(120).duration(500)}
            style={[styles.onboardWrap, { bottom: barHeight + spacing.lg }]}
          >
            <OnboardingCard
              setup={setupCard}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push('/onboarding-v3' as Href);
              }}
            />
          </Animated.View>
        ) : (
          snapshot != null && (
            // The glass appears over the moon: a frosted panel holding the period
            // pill and the ask, the background moon glowing through from behind.
            <Animated.View
              entering={FadeIn.delay(700).duration(1100)}
              style={[styles.glassCard, { top: cardTop, height: cardHeight }]}
            >
              <BlurView
                intensity={30}
                tint="dark"
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.glassTint} />
              {/* Glossy sheen: light catching the glass from the top-LEFT and
                  falling away toward the bottom-right, so the top-right corner
                  stays quiet rather than washing white. */}
              <LinearGradient
                colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.03)', 'transparent']}
                locations={[0, 0.28, 0.62]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glassInner}>
                {pillText != null && (
                  <Pressable
                    style={styles.pill}
                    onPress={openPeriods}
                    accessibilityRole="button"
                    accessibilityLabel={`${pillText}. Edit periods.`}
                  >
                    <BlurView intensity={26} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
                    {/* Softer top sheen. */}
                    <LinearGradient
                      colors={['rgba(255,255,255,0.09)', 'transparent']}
                      locations={[0, 0.6]}
                      pointerEvents="none"
                      style={StyleSheet.absoluteFill}
                    />
                    {/* A light layer along the left edge. */}
                    <LinearGradient
                      colors={['rgba(255,255,255,0.13)', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0.55, y: 0 }}
                      pointerEvents="none"
                      style={StyleSheet.absoluteFill}
                    />
                    <SymbolView name="pencil" tintColor={colors.textOnDark.primary} size={15} weight="regular" />
                    <Text style={styles.pillText}>{pillText}</Text>
                  </Pressable>
                )}
                {/* The moon glows through here (frosted). */}
                <View style={styles.glassFill} />
                {/* The ask fades in once the sheet has settled. */}
                <Animated.View entering={FadeIn.delay(1600).duration(900)} style={styles.ask}>
                  <Text style={styles.triad}>Reflect • Regulate • Respond</Text>
                  <FeelingLine key={openSeed} />
                  <Pressable
                    style={styles.ctaWrap}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      openMoon('/moment' as Href);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Talk to Moon"
                  >
                    <LinearGradient
                      colors={['#E79BC0', '#8C6BC2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.ctaBorder}
                    >
                      <View style={styles.ctaInner}>
                        <Text style={styles.ctaText}>Talk to Moon</Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                  {/* A divider sets the "waiting for you" cluster (resume + the
                      Later list) apart from the primary ask above. */}
                  {(snapshot?.hasResume || (plannedLive ?? snapshot?.hasPlanned)) && (
                    <View style={styles.homeDivider} />
                  )}
                  {/* A flow she left unfinished: a quiet second line under the
                      CTA to pick it up where she left off. Never competes with
                      the primary ask — it only shows when there is one to resume,
                      and the × dismisses it: she may not want to deal with it. */}
                  {snapshot?.hasResume && (
                    <View style={styles.resumeRow}>
                      <Pressable
                        style={styles.resumeChip}
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          openMoon('/moment?resume=1' as Href);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Continue where you left off"
                      >
                        {/* A pink liquid-glass chip so the resume reads as a real,
                            tappable thing on the sky, not faint text (Neha
                            2026-08-02, "it's not visible"). */}
                        <BlurView intensity={18} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
                        <View pointerEvents="none" style={styles.resumeChipTint} />
                        <SymbolView name="arrow.uturn.right" size={13} weight="semibold" tintColor="#F7C4D6" />
                        <Text style={styles.resumeText}>Continue where you left off</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Haptics.selectionAsync().catch(() => {});
                          clearMomentCheckpoint().catch(() => {});
                          setSnapshot((s) => (s ? { ...s, hasResume: false } : s));
                        }}
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss the unfinished session"
                      >
                        <SymbolView
                          name="xmark"
                          size={12}
                          tintColor={colors.textOnDark.faint}
                        />
                      </Pressable>
                    </View>
                  )}
                  {/* Moves she parked for later, with an optional reminder time. */}
                  <PlannedActions onCount={onPlannedCount} />
                </Animated.View>
              </View>
            </Animated.View>
          )
        )}
      </SafeAreaView>

      {/* The one write path for period dates: the calendar flow built for
          onboarding, reused verbatim. */}
      <PeriodSheet
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onConfirm={onPeriodConfirm}
        onRemove={onPeriodRemove}
        onPeriodLengthChange={onPeriodLengthChange}
        onCycleLengthChange={onCycleLengthChange}
        markedDates={snapshot?.periodHistory ?? []}
        cycleLength={snapshot?.prefs.cycleLength}
        periodLength={snapshot?.prefs.periodLength ?? DEFAULT_PERIOD_LENGTH}
      />

      {/* Apple 5.1.2(i) consent, shown over Home the first time she opens Moon
          without having agreed. "I agree" persists and lands on the target she
          tapped; ✕ closes without consenting. */}
      <Modal
        visible={consentHref != null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setConsentHref(null)}
      >
        <MeetMoonConsent
          onAgree={() => {
            const href = consentHref;
            setMoonConsent()
              .catch(() => {})
              .finally(() => {
                setConsentHref(null);
                if (href != null) router.push(href);
              });
          }}
          onClose={() => setConsentHref(null)}
        />
      </Modal>

      {/* The unified crossing moment: a bloom on the moon with a plain line, for
          a ring or material milestone earned via any path. Clears itself. */}
      {crossing != null && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <RingCelebration hue={crossing.hue} />
          <Animated.Text
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(500)}
            style={styles.crossingLabel}
          >
            {crossing.kind === 'material'
              ? `Your soul is ${crossing.label} now`
              : `New ring · ${crossing.label}`}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  // The background moon: centred and lifted (paddingBottom) into the upper body,
  // behind the glass, so it glows through the frosted panel from behind. Ringless,
  // so its soft halo bleeds gently onto the black rather than spilling sharp.
  moonLayer: {
    // top + bottom set inline (cardTop / cardBottom) so the moon centres within
    // the card, not the whole screen. Sides match the card's sleek margin.
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: '14%',
  },
  // The charcoal glass card: as large as it gets with a sleek margin — a thin
  // black frame all around. top + bottom set inline (safe inset + bar height).
  glassCard: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  // A light frost over the blur — kept translucent so the nebula and the moon's
  // rose halo glow through the glass, then the gloss sheen adds the highlight.
  glassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28,26,38,0.20)',
  },
  // Generous interior: room above the pill, below the CTA, and to the sides of
  // the words — the card is big, so the content breathes inside it.
  glassInner: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  // The moon glows through this stretch of the sheet, above the ask.
  glassFill: { flex: 1 },
  // The ask sits at the foot of the sheet, left-aligned.
  ask: { alignItems: 'flex-start', gap: spacing.md },
  onboardWrap: { position: 'absolute', left: pageGutter, right: pageGutter },
  // The cycle context + the one door to log periods: a small glass capsule at the
  // top of the sheet. Blur + gloss inside (JSX); this clips them to the capsule.
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.26)',
  },
  pillText: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
  },
  // "Reflect · Regulate · Respond" — the arc named, quiet above the ask.
  triad: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    color: colors.textOnDark.faint,
    letterSpacing: 0.6,
  },
  // The CTA: a dark pill ringed by a pink->purple gradient border — the brand
  // colour carried as a glowing outline, not a fill, so it stays calm on the
  // charcoal card. Full width. The gradient is the 1.5px frame; the dark inner
  // View is the button face.
  ctaWrap: { alignSelf: 'stretch', marginTop: spacing.xs },
  ctaBorder: {
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    padding: 1.5,
  },
  ctaInner: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: '#2C2C33',
  },
  ctaText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
  },
  homeDivider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: spacing.lg,
  },
  // The resume line: a quiet text link under the CTA, secondary by design, with
  // a dismiss × beside it so she can drop the unfinished session.
  resumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  resumeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(242,162,192,0.5)',
  },
  // Pink frost fill behind the blur, explicit props (this SDK's StyleSheet type
  // has no absoluteFillObject — AGENTS.md).
  resumeChipTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(242,162,192,0.16)',
  },
  resumeText: {
    fontFamily: fonts.medium,
    fontSize: fontScale.body,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
  },
  // The crossing line sits over the bloom, near the moon's centre.
  crossingLabel: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '42%',
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: fontScale.cardTitle,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
  },
});
