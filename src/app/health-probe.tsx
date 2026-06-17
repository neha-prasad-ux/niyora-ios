// Dev-only probe for stress v1: confirm the niyora-health native module reads
// HealthKit (HR + activity), eyeball the computed resting baseline (B1), and run
// the detection rule (B2) against live data. Not part of the shipping UI;
// reached from a __DEV__-only tap on the home screen.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  NiyoraHealth,
  isHealthAvailable,
  type HeartRateSample,
} from 'niyora-health';
import { computeBaseline, computeRestingBaseline } from '@/lib/hr-baseline';
import { saveBaseline, readBaseline } from '@/store/hr-baseline';
import { evaluateStress } from '@/lib/stress-detect';
import { fireStressNudge } from '@/lib/stress-nudge';
import { getNudgeHistory, recordNudgeFired } from '@/store/nudge-history';
import { ensureNotificationPermission } from '@/lib/notifications';

// 10-minute window matches the activity-gating window used by detection (B2).
const TEN_MIN_AGO = () => new Date(Date.now() - 10 * 60 * 1000).toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

const fmt = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? 'n/a' : n.toFixed(1);

export default function HealthProbe() {
  const [log, setLog] = useState<string[]>([
    `module linked: ${isHealthAvailable ? 'yes' : 'NO (rebuild needed)'}`,
  ]);
  const [samples, setSamples] = useState<HeartRateSample[]>([]);

  const append = useCallback((line: string) => {
    setLog((prev) => [...prev, line]);
  }, []);

  const checkAvailable = useCallback(async () => {
    try {
      const ok = await NiyoraHealth.isAvailable();
      append(`isAvailable() → ${ok}`);
    } catch (e: any) {
      append(`isAvailable() error: ${e?.message ?? e}`);
    }
  }, [append]);

  const requestAuth = useCallback(async () => {
    try {
      const ok = await NiyoraHealth.requestAuthorization();
      append(`requestAuthorization() → ${ok}`);
    } catch (e: any) {
      append(`requestAuthorization() error: ${e?.message ?? e}`);
    }
  }, [append]);

  const readHr = useCallback(async () => {
    try {
      const out = await NiyoraHealth.getHeartRateSamples();
      setSamples(out);
      append(`getHeartRateSamples() → ${out.length} samples (last hour)`);
      if (out[0]) {
        append(`newest: ${out[0].bpm} bpm @ ${out[0].date}`);
      }
    } catch (e: any) {
      append(`getHeartRateSamples() error: ${e?.message ?? e}`);
    }
  }, [append]);

  const readActivity = useCallback(async () => {
    try {
      const since = TEN_MIN_AGO();
      const [steps, kcal, workouts] = await Promise.all([
        NiyoraHealth.getStepCount(since),
        NiyoraHealth.getActiveEnergy(since),
        NiyoraHealth.getRecentWorkouts(),
      ]);
      append(`steps (10 min) → ${steps}`);
      append(`active energy (10 min) → ${kcal.toFixed(1)} kcal`);
      append(`recent workouts (1 hr) → ${workouts.length}`);
      workouts.forEach((w) =>
        append(`  type ${w.activityType}${w.isActive ? ' [active]' : ''} ${w.start}`),
      );
    } catch (e: any) {
      append(`activity read error: ${e?.message ?? e}`);
    }
  }, [append]);

  // B1 — read a week of HR + activity, compute + persist the activity-aware
  // resting baseline (HR only from still, non-workout moments), and print the
  // per-hour resting curve to eyeball against felt resting HR.
  const buildBaseline = useCallback(async () => {
    try {
      const since = DAYS_AGO(7);
      const [hr, buckets, workouts] = await Promise.all([
        NiyoraHealth.getHeartRateSamples(since, 100000),
        NiyoraHealth.getActivityBuckets(since, 5),
        NiyoraHealth.getRecentWorkouts(since, 200),
      ]);
      append(`baseline: ${hr.length} HR, ${buckets.length} activity buckets, ${workouts.length} workouts (7 days)`);
      const model = computeRestingBaseline(hr, buckets, workouts);
      await saveBaseline(model);
      const dropped = hr.length - model.sampleCount;
      append(`baseline: ${model.sampleCount} resting samples (${dropped} dropped as active); global resting ${fmt(model.global?.resting)}`);
      model.byHour.forEach((h, hour) => {
        if (h) append(`  ${String(hour).padStart(2, '0')}:00 → resting ${fmt(h.resting)} (median ${fmt(h.median)}, n=${h.count})`);
      });
    } catch (e: any) {
      append(`baseline error: ${e?.message ?? e}`);
    }
  }, [append]);

  // B2 — run the detection rule against the last 10 min of HR + activity.
  const evalStress = useCallback(async () => {
    try {
      const stored = await readBaseline();
      const model = stored?.model ?? computeBaseline(
        await NiyoraHealth.getHeartRateSamples(DAYS_AGO(7), 100000),
      );
      if (!stored) append('eval: no saved baseline, computed on the fly');
      const since = TEN_MIN_AGO();
      const [recent, steps, kcal, workouts] = await Promise.all([
        NiyoraHealth.getHeartRateSamples(since, 1000),
        NiyoraHealth.getStepCount(since),
        NiyoraHealth.getActiveEnergy(since),
        NiyoraHealth.getRecentWorkouts(),
      ]);
      const v = evaluateStress(recent, model, {
        steps,
        activeEnergyKcal: kcal,
        hasActiveWorkout: workouts.some((w) => w.isActive),
      });
      append(`eval → ${v.reason.toUpperCase()} (stressed=${v.stressed})`);
      append(`  current ${fmt(v.currentHr)} bpm vs resting ${fmt(v.resting)} (thresh ${fmt(v.threshold)})`);
      append(`  elevated ${v.elevatedFraction === null ? 'n/a' : Math.round(v.elevatedFraction * 100) + '%'}, coverage ${Math.round(v.coverageMs / 1000)}s, steps ${steps}, ${kcal.toFixed(1)} kcal`);
    } catch (e: any) {
      append(`eval error: ${e?.message ?? e}`);
    }
  }, [append]);

  // B4 — fire the interactive "Feeling tense?" nudge. Recording the fired event
  // is the policy/background tick's job (B3); here we just exercise the
  // notification + Yes/No/Not now buttons end to end.
  const fireNudge = useCallback(async () => {
    try {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        append('nudge: notification permission not granted');
        return;
      }
      // Record the fired event so the answer has something to attach to. In
      // production this is the background tick's job (B3); the probe stands in.
      await recordNudgeFired({
        firedAt: new Date().toISOString(),
        currentHr: null,
        resting: null,
      });
      await fireStressNudge();
      append('nudge: fired — answer it, then tap "Show answers"');
    } catch (e: any) {
      append(`nudge error: ${e?.message ?? e}`);
    }
  }, [append]);

  const showAnswers = useCallback(async () => {
    try {
      const events = await getNudgeHistory();
      append(`nudge history: ${events.length} event(s)`);
      events.slice(-10).forEach((e) =>
        append(`  ${e.firedAt} → ${e.answer ?? 'unanswered'}`),
      );
    } catch (e: any) {
      append(`history error: ${e?.message ?? e}`);
    }
  }, [append]);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Stress probe</Text>

        <Pressable style={styles.btn} onPress={checkAvailable}>
          <Text style={styles.btnText}>1. Check availability</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={requestAuth}>
          <Text style={styles.btnText}>2. Request authorization</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={readHr}>
          <Text style={styles.btnText}>3. Read heart rate (last hour)</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={readActivity}>
          <Text style={styles.btnText}>4. Read activity (steps / energy / workouts)</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={buildBaseline}>
          <Text style={styles.btnText}>5. Build baseline (last 7 days)</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={evalStress}>
          <Text style={styles.btnText}>6. Evaluate stress now</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={fireNudge}>
          <Text style={styles.btnText}>7. Fire "Feeling tense?" nudge</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={showAnswers}>
          <Text style={styles.btnText}>8. Show answers (nudge history)</Text>
        </Pressable>

        <Text style={styles.section}>Log</Text>
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}

        {samples.length > 0 && (
          <>
            <Text style={styles.section}>Samples (newest first)</Text>
            {samples.slice(0, 20).map((s, i) => (
              <Text key={i} style={styles.logLine}>
                {s.bpm} bpm — {s.date}
              </Text>
            ))}
          </>
        )}

        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.btnText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a14' },
  content: { padding: 20, gap: 10 },
  title: { color: '#fff', fontSize: 22, marginBottom: 8 },
  section: { color: '#9aa', fontSize: 14, marginTop: 16, marginBottom: 4 },
  btn: {
    backgroundColor: '#2a2a45',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  back: {
    backgroundColor: '#444',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 24,
  },
  btnText: { color: '#fff', fontSize: 16 },
  logLine: { color: '#cde', fontSize: 13 },
});
