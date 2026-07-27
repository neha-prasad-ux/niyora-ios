// TEMPORARY dev instrument (2026-07-27). Answers one question and nothing else:
// does the fine-tuned Gemma 4 E2B .litertlm actually load and generate on this
// phone? Everything else in the app degrades silently to scripted copy, so a
// build that launches and stays quiet is indistinguishable from success. That
// false pass is what this screen exists to rule out.
//
// The pass condition is A GENERATED TOKEN ON SCREEN. Not "it built", not "it
// launched", not availability() === 'available'.
//
// Steps are separated because each fails differently:
//   1. linked        — is the native module in this binary at all
//   2. availability  — does the engine actually LOAD (this call warms it)
//   3. backendName   — litertlm (the fine-tune) or mediapipe (the old .task)
//   4. prewarm       — do the weights resolve into memory; OOM shows up here
//   5. generate      — does a token come out (THE GATE)
//
// Delete this file once the verdict is recorded.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  GEMMA_MAX_CONTEXT,
  GEMMA_MODEL_FILENAME,
  isGemmaLinked,
  NiyoraGemma,
} from 'niyora-gemma';

import { ReflectModel, reflectDebug } from '@/lib/reflect-model';
import {
  buildTurnRequest,
  EMPTY_COMPACT,
  type RoughStep,
} from '@/v3/rough-moment-content';

// The exact system string the corpus was trained with (gemma4-runpod
// assemble.py:26-27). Byte-identical across all 2,542 rows of
// v4_wide_deduped. Sending anything else is off-distribution.
const TRAINED_SYSTEM =
  'you reply to a woman having a hard moment. warm, plain, like a close friend in her 30s. say her own words back. never advise. lowercase, max 2 sentences, no dashes.';

// The trained user shape: [slot] then her words. acknowledge suppresses the
// "she feels:" and context lines (assemble.py build_user).
const TRAINED_USER =
  '[acknowledge]\nshe wrote: "he ignored me all evening and i feel like the relationship is falling apart"';

/**
 * Try to get a token out of whichever model is currently active, narrowing
 * from the trained shape to the simplest thing that could possibly work. The
 * first attempt that yields text answers it; if even 'hello' fails, the
 * problem is the model or the runtime, not the prompt.
 * Returns true if anything generated.
 */
async function runGenerations(log: (s: string) => void): Promise<boolean> {
  const attempts: { label: string; prompt: string; system?: string }[] = [
    { label: 'trained shape (system + user)', prompt: TRAINED_USER, system: TRAINED_SYSTEM },
    { label: 'no system message', prompt: TRAINED_USER },
    { label: 'minimal prompt', prompt: 'hello' },
  ];

  for (const a of attempts) {
    const t = Date.now();
    const res = await NiyoraGemma.generateText(a.prompt, GEMMA_MAX_CONTEXT, a.system);
    const ms = Date.now() - t;
    if (res.ok) {
      if (res.text?.trim()) {
        log(`5. ${a.label}: OK (${res.latencyMs ?? ms}ms)`);
        log(`OUTPUT >>> ${res.text}`);
        return true;
      }
      log(`5. ${a.label}: returned EMPTY text (${res.latencyMs ?? ms}ms)`);
    } else {
      log(`5. ${a.label}: FAILED (${res.failure}) ${res.message ?? ''} [${ms}ms]`);
    }
    log(`   why: ${(await NiyoraGemma.lastError()) || '(none)'}`);
  }
  return false;
}

export default function GemmaVerdict() {
  // Seeded, not empty: an empty list renders as a blank screen, which is
  // indistinguishable from the app having failed to start.
  const [lines, setLines] = useState<string[]>([
    'screen mounted. starting in 3s…',
  ]);
  const [running, setRunning] = useState(false);
  const started = useRef(false);

  const log = useCallback((s: string) => {
    // Mirrored into the native NSLog stream so `devicectl --console` captures
    // the verdict without anyone reading it off the phone. console.log alone
    // is not reliably forwarded from a Release build.
    console.log(`[GEMMA-VERDICT] ${s}`);
    void NiyoraGemma.note(`[VERDICT] ${s}`);
    setLines((prev) => [...prev, s]);
  }, []);

  const run = useCallback(async () => {
    setRunning(true);
    setLines(['running…']);
    try {
      log(`file expected: ${GEMMA_MODEL_FILENAME}`);
      log(`1. linked: ${isGemmaLinked}`);
      if (!isGemmaLinked) {
        log('VERDICT: FAIL — native module not in this binary.');
        return;
      }

      // What is genuinely on disk, before asking anything to load it.
      const files = await NiyoraGemma.modelFiles();
      log(`dir: ${files.directory ?? '?'}`);
      for (const f of files.files ?? []) log(`  • ${f.name}  ${f.size}`);
      log(`resolved: ${files.resolvedPath || '(none)'}`);

      // Run the SAME battery against our export and against the stock Google
      // model sitting beside it. That is the only way to separate "the runtime
      // cannot run OUR model" (a broken export, fixable by re-exporting) from
      // "the runtime cannot run ANY model" (a broken integration). Without the
      // control, a failure is unattributable.
      // Stock Gemma 4 fails identically to ours, so the model is exonerated and
      // the defect is in the runtime configuration. Sweep the two knobs that
      // could plausibly make the native send return null: the kv-cache size
      // (maxNumTokens) and the compute backend.
      const candidates: { label: string; file: string; tokens: number; gpu: boolean }[] = [
        { label: 'fine-tune · cpu · 2048', file: '', tokens: GEMMA_MAX_CONTEXT, gpu: false },
      ];

      let anyPassed = false;
      for (const model of candidates) {
        log('');
        log(`===== ${model.label} =====`);
        await NiyoraGemma.setRuntimeConfig(model.tokens, model.gpu);
        await NiyoraGemma.setActiveModel(model.file);

        const t0 = Date.now();
        const avail = await NiyoraGemma.availability();
        log(`2. availability: ${avail}  (${Date.now() - t0}ms)`);
        log(`3. backend: ${await NiyoraGemma.backendName()}`);

        if (avail !== 'available') {
          log(`   why: ${(await NiyoraGemma.lastError()) || '(none)'}`);
          log(`=> ${model.label}: engine did not load.`);
          continue;
        }

        const t1 = Date.now();
        const warm = await NiyoraGemma.prewarm(GEMMA_MAX_CONTEXT);
        log(`4. prewarm: ${warm}  (${Date.now() - t1}ms)`);
        if (!warm) {
          log(`   why: ${(await NiyoraGemma.lastError()) || '(none)'}`);
          log(`=> ${model.label}: weights did not resolve.`);
          continue;
        }

        if (await runGenerations(log)) anyPassed = true;
      }

      // Restore the default so the app is not left pointing at the control.
      await NiyoraGemma.setActiveModel('');

      if (!anyPassed) {
        log('');
        log('VERDICT: FAIL — the model did not generate.');
        return;
      }

      // ---- The part that actually matters: THE REAL APP PATH ----------------
      // Everything above talks to the native module directly. This runs the
      // exact seam rough-moment.tsx uses -- provider resolution, the deadline,
      // prompt composition, parsing, the scripted fallback -- so a pass here
      // means the shipped session works, not merely that weights load.
      // `pattern` and `change` are scripted beats and return no request.
      log('');
      log('===== REAL APP PATH (ReflectModel) =====');
      const state = {
        ...EMPTY_COMPACT,
        ventExcerpt: 'he ignored me all evening and i feel like it is falling apart',
        thought: 'i am not worth his attention',
        feeling: 'hurt',
      };

      const steps: RoughStep[] = ['confirm', 'pattern', 'examine', 'change', 'reframe', 'keep'];
      let modelBeats = 0;
      for (const step of steps) {
        const req = buildTurnRequest(step, state);
        if (!req) {
          log(`${step}: scripted beat (no model call by design)`);
          continue;
        }
        const t = Date.now();
        const r = await ReflectModel.generate(
          req.instructions,
          req.prompt,
          req.wantChips,
          undefined,
          state.ventExcerpt,
        );
        const ms = Date.now() - t;
        if (r.ok && r.prose?.trim()) {
          modelBeats += 1;
          log(`${step}: MODEL (${ms}ms) >>> ${r.prose}`);
        } else {
          log(`${step}: fell back to scripted (${r.ok ? 'empty' : r.failure}) [${ms}ms]`);
        }
      }

      log(`provider: ${reflectDebug().provider}`);
      log('');
      log(
        modelBeats === 4
          ? 'VERDICT: PASS — all four model beats answered from the fine-tune.'
          : `VERDICT: PARTIAL — ${modelBeats}/4 model beats answered.`,
      );
    } catch (e: any) {
      log(`EXCEPTION: ${e?.message ?? String(e)}`);
      log('VERDICT: FAIL — threw.');
    } finally {
      setRunning(false);
    }
  }, [log]);

  // Auto-run, but NOT during launch. Loading ~2.4 GB of weights takes far
  // longer than the 20s iOS allows a process to finish launching, so kicking
  // it off from mount got the app killed with
  //   Watchdog Violation (0x8BADF00D) "process-launch watchdog transgression"
  // and the screen never painted -- which reads exactly like a blank screen.
  // Waiting lets launch complete and the first frame render; after that the
  // launch watchdog no longer applies and a slow load is merely slow.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t = setTimeout(() => void run(), 3000);
    return () => clearTimeout(t);
  }, [run]);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Gemma verdict</Text>
      <Pressable style={styles.btn} onPress={running ? undefined : run}>
        <Text style={styles.btnText}>{running ? 'running…' : 'run again'}</Text>
      </Pressable>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {lines.map((l, i) => (
          <Text key={i} style={styles.line}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b0b10' },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', padding: 16 },
  btn: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2a2a3a',
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 15 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 8 },
  line: { color: '#d8d8e4', fontSize: 13, fontFamily: 'Menlo' },
});
