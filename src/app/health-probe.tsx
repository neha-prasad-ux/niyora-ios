// Dev-only probe for Phase A1: confirm the niyora-health native module can read
// live heart rate from HealthKit on a real device. Not part of the shipping UI;
// reached from a __DEV__-only tap on the home screen. Replaced by real detection
// UI in Phase B.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import {
  NiyoraHealth,
  isHealthAvailable,
  type HeartRateSample,
} from 'niyora-health';

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

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>HealthKit probe (A1)</Text>

        <Pressable style={styles.btn} onPress={checkAvailable}>
          <Text style={styles.btnText}>1. Check availability</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={requestAuth}>
          <Text style={styles.btnText}>2. Request authorization</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={readHr}>
          <Text style={styles.btnText}>3. Read heart rate (last hour)</Text>
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
