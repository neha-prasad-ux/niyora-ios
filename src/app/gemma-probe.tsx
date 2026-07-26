// Dev-only gate instrument for STREAM D STEP 0: does the bundled ~3GB Gemma
// actually RUN on the A16 test phone, inside Niyora?
//
// This screen exists because nothing else answers that question. The only other
// path to Gemma is the in-the-moment session, and that is built to degrade
// silently: if the model is missing, slow, or dead, it routes to the scripted
// line and looks exactly like success. A build that launches and quietly stays
// scripted is the false pass we keep having to rule out.
//
// The pass condition is a GENERATED TOKEN ON SCREEN. Not "it built", not "it
// launched", not availability() === 'available' -- availability only checks
// that the file is in the bundle, it never loads the engine.
//
// So the steps are separated deliberately, because each one fails differently:
//   1. linked?       -- is MediaPipe compiled into this binary at all
//   2. availability  -- is the .task file in Bundle.main
//   3. diagnostics   -- is it the RIGHT file (bytes), and how much memory is left
//   4. prewarm       -- do the weights actually load (this is where OOM shows up)
//   5. one turn      -- does a token come out (THE GATE)
// Run them in order. The first one that fails is the answer.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
// The REAL Skia consumer in this app, not a toy canvas. It drives an Atlas via
// useTexture/useRSXformBuffer on a per-frame callback, which is the heaviest
// Skia path we ship and the one most likely to expose a symbol collision.
import { BreathingParticles } from '@/components/BreathingParticles';

import {
  GEMMA_MAX_CONTEXT,
  GEMMA_MODEL_FILENAME,
  isGemmaLinked,
  NiyoraGemma,
} from 'niyora-gemma';

// Deliberately trivial and non-clinical. This prompt is not testing voice,
// grounding, or safety -- it is testing whether the engine emits tokens. Keep
// it short so a slow first decode still returns inside a usable wait.
const SMOKE_PROMPT = 'Reply with exactly one short sentence: what colour is the sky on a clear day?';

// A real vent, only used once the smoke test has already passed. Nothing is
// scored here; it is an eyeball check that output is coherent, not a metric.
const REAL_PROMPT =
  'A woman just told you: "he ignored me all evening and i feel like the relationship is falling apart". ' +
  'Reflect back what she said in one sentence. Do not give advice.';

const mb = (bytes: number) => (bytes < 0 ? 'n/a' : `${(bytes / 1024 / 1024).toFixed(0)}MB`);

// ---------------------------------------------------------------------------
// Instrumentation. Read this before trusting any number this screen produces.
//
// Runs 10 and 11 produced NO output at all -- not even the first line -- and
// were reported as "the probe went quiet". That is not a result, it is three
// different failures wearing the same face: the bundle never ran, or the JS
// thread died, or a native call never returned. The harness could not tell them
// apart, so every measurement taken through it was worth nothing.
//
// Three signals now split that ambiguity, and each one fails differently:
//
//   1. a module-scope beacon, fired before React exists
//        → present: the bundle reached this route. absent: never got here.
//   2. a heartbeat, every 5s, carrying the name of the step in flight
//        → ticking: JS is alive. stopped: the process is gone.
//   3. a timeout around every native call
//        → a hang is REPORTED, with the step name, instead of being silence.
//
// Together: if nothing arrives, the bundle never loaded. If the beacon arrives
// and the heartbeat stops, the process died. If the heartbeat keeps ticking
// past a step, that native call is wedged and the tick says which one.
//
// The sequence also always ends with a verdict line, pass or fail. A log that
// stops without one means the phone stopped talking, and that is now itself a
// finding rather than an interpretation.
// ---------------------------------------------------------------------------

const SINK_HOST = Constants.expoConfig?.hostUri?.split(':')[0] ?? '';
const BOOT = Date.now();

// Fire-and-forget and fully swallowed: the probe must never fail because the
// sink is absent. Also emitted to console.log so a Metro-attached run has a
// second channel, and NSLog'd natively by the module for a third.
const post = (line: string) => {
  console.log(`[GEMMA-GATE] ${line}`);
  if (SINK_HOST) {
    fetch(`http://${SINK_HOST}:8099/`, { method: 'POST', body: line }).catch(() => {});
  }
};

// Signal 1. At module scope on purpose: this runs when expo-router evaluates
// the route, before any component mounts and before any native call. If this
// line is missing from the sink, nothing below it ever had a chance to run and
// the problem is upstream of this file entirely.
post(`▶ probe module evaluated · host=${SINK_HOST || 'UNKNOWN (no hostUri!)'}`);

// Signal 3. Every native call goes through this. The underlying call cannot be
// cancelled -- MediaPipe gives us no handle -- so on timeout we report and stop
// rather than pretending we recovered. Stopping is the honest move: a second
// measurement taken while a runaway generation is still burning the CPU would
// be garbage.
const HUNG = Symbol('hung');

async function withBudget<T>(work: Promise<T>, ms: number): Promise<T | typeof HUNG> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bell = new Promise<typeof HUNG>((resolve) => {
    timer = setTimeout(() => resolve(HUNG), ms);
  });
  const result = await Promise.race([work, bell]);
  if (timer) clearTimeout(timer);
  return result;
}

class HangError extends Error {
  constructor(readonly step: string, readonly budgetMs: number) {
    super(`${step} did not return within ${budgetMs}ms`);
  }
}

// Budgets are generous but finite. The point is not to be strict, it is to make
// "still going" a printed fact with a name attached rather than a blank screen.
const BUDGET = {
  quick: 15_000, // availability, diagnostics, modelState, setActiveModel
  prewarm: 180_000, // 3n cold-loaded in 17.5s, Gemma 4 in 4.4s; 180s is slack
  generate: 180_000, // at ~5.5 tok/s a 64-token cap should land near 12s
  download: 900_000,
} as const;


// Gemma 4 E2B, from litert-community. Ungated: verified `gated: false` over the
// public API, so no token is needed. Served from the dev Mac over LAN during
// iteration so a failed attempt costs seconds instead of a 2GB re-pull.
// Gemma 4 uses a DIFFERENT turn format from Gemma 3. From the repo's own
// chat_template.jinja: a turn opens with `<|turn>` + role, and closes with
// `<turn|>`, and the generation prompt is `<|turn>model`. Gemma 3 used
// `<start_of_turn>` / `<end_of_turn>`.
//
// This matters more than it looks. Sent a bare prompt with no turn structure,
// Gemma 4 answered correctly and then emitted `<turn|>` forever until it hit
// the token cap: 92 seconds for one sentence. The docs predicted this exact
// symptom ("generation runs past end_of_turn") and attributed it to a missing
// eos config; the real cause here is that we never framed the turn at all.
const GEMMA4_TEMPLATE = (p: string) => `<|turn>user\n${p}<turn|>\n<|turn>model\n`;
const GEMMA3_TEMPLATE = (p: string) =>
  `<start_of_turn>user\n${p}<end_of_turn>\n<start_of_turn>model\n`;

// MediaPipe's C API has `LlmPromptTemplates` but the Swift surface does not
// expose it, and there is no stop-token setting either. So the turn markers are
// ours to write and ours to cut on. Trimming at the close marker is what keeps
// a correct answer from arriving with a page of turn tokens stapled to it.
const STOP_MARKERS = ['<turn|>', '<end_of_turn>', '<eos>'];
const trimAtStop = (t: string) => {
  let out = t;
  for (const m of STOP_MARKERS) {
    const i = out.indexOf(m);
    if (i >= 0) out = out.slice(0, i);
  }
  return out.trim();
};

type Candidate = {
  filename: string;
  mb: number;
  // Exact size, passed to the downloader so it verifies before installing.
  // This is not belt-and-braces: the native size and SHA checks are OPT-IN
  // (`if expectedBytes > 0`), so a caller that omits this gets no verification
  // at all. On 2026-07-26 this probe omitted it, the LAN server 404'd, and a
  // 335-byte error page was installed over the bundled 3n model and shadowed
  // it. Zero here means "do not verify" and should be treated as a bug.
  bytes: number;
  // Ships inside the .app. Downloading one of these can only ever replace a
  // known-good file with something worse, so the probe refuses to try.
  bundled: boolean;
  wrap: (p: string) => string;
};
const CANDIDATES: Candidate[] = [
  {
    filename: 'gemma-4-E2B-it.litertlm',
    mb: 2468,
    bytes: 2_588_147_712,
    bundled: false,
    wrap: GEMMA4_TEMPLATE,
  },
  {
    filename: 'gemma-3n-E2B-it-int4.task',
    mb: 2991,
    bytes: 0, // never downloaded: it is in Bundle.main
    bundled: true,
    wrap: GEMMA3_TEMPLATE,
  },
];

// Anything smaller than this is not a model, whatever the server said. The
// realistic failure is an HTML error page, which is a few hundred bytes.
const IMPLAUSIBLY_SMALL = 100_000_000;

const modelHost = () => Constants.expoConfig?.hostUri?.split(':')[0] ?? '';

export default function GemmaProbe() {
  const [log, setLog] = useState<string[]>([
    `module linked: ${isGemmaLinked ? 'yes' : 'NO — MediaPipe is not in this binary, rebuild'}`,
    `expecting: ${GEMMA_MODEL_FILENAME}`,
  ]);
  const [running, setRunning] = useState(false);
  // Mounted only after the engine is warm, so the render happens in the exact
  // condition the collision claim is about.
  const [skiaMounted, setSkiaMounted] = useState(false);

  // Mirrored off the device on purpose. This runs on a physical iPhone, so no
  // tap can be scripted and the screen cannot be read from the Mac; and app
  // console.log was not reaching Metro's terminal. Without an egress the gate
  // result is only visible to whoever is holding the phone, which is how a
  // half-finished run gets reported as a pass.
  //
  // So each line is POSTed to a throwaway sink on the dev machine (see
  // scratchpad/sink.js). Host is derived from Expo's own dev-server host, so it
  // follows the LAN rather than hardcoding an IP.
  const append = useCallback((line: string) => {
    post(line);
    setLog((prev) => [...prev, line]);
  }, []);

  // Signal 2, the heartbeat. Named for the step currently in flight, so a tick
  // is not just "alive" but "alive, and still inside prewarm". Every native
  // call here is an Expo `AsyncFunction`, which runs off the JS thread -- that
  // is what makes this work: a wedged MediaPipe call leaves JS free to keep
  // ticking, so a stopped heartbeat means process death, not a slow model.
  const phase = useRef('boot');
  useEffect(() => {
    const id = setInterval(() => {
      post(`· alive ${Math.round((Date.now() - BOOT) / 1000)}s [${phase.current}]`);
    }, 5_000);
    return () => clearInterval(id);
  }, []);

  // Every native call in the sequence goes through here, so no call can vanish
  // without leaving a named record of what it was doing when it stopped.
  const step = useCallback(
    async function run<T>(label: string, budgetMs: number, work: () => Promise<T>): Promise<T> {
      phase.current = label;
      const r = await withBudget(work(), budgetMs);
      if (r === HUNG) {
        append(`⏱ HUNG · ${label} has not returned after ${budgetMs}ms.`);
        append('  ↳ the native call is STILL RUNNING; it cannot be cancelled.');
        append('  ↳ stopping here rather than measuring around a wedged engine.');
        throw new HangError(label, budgetMs);
      }
      phase.current = `${label} done`;
      return r;
    },
    [append],
  );

  const checkAvailability = useCallback(async () => {
    const a = await NiyoraGemma.availability();
    append(`availability() → ${a}`);
    if (a === 'unsupported') {
      append('  ↳ pods are not in the binary. The Swift module built as a stub.');
    } else if (a === 'modelNotReady') {
      append('  ↳ the .task file is not in Bundle.main. Check the podspec resources.');
    } else {
      append('  ↳ file is present. This is NOT proof it loads — run prewarm next.');
    }
  }, [append]);

  const checkDiagnostics = useCallback(async () => {
    const d = await NiyoraGemma.diagnostics();
    append(`mediapipeLinked: ${d.mediapipeLinked}`);
    append(`modelPath: ${d.modelPath ?? 'MISSING'}`);
    append(`modelBytes: ${mb(d.modelBytes)} (expect roughly 2900MB)`);
    append(`memory available to app: ${mb(d.availableMemoryBytes)}`);
    append(`device physical memory: ${mb(d.physicalMemoryBytes)}`);
    append(`lastError: ${d.lastError ?? 'none'}`);
    if (d.modelBytes >= 0 && d.modelBytes < 2_000_000_000) {
      append('  ↳ file is far smaller than expected. Likely a truncated fetch.');
    }
  }, [append]);

  const prewarm = useCallback(async () => {
    append('prewarm… (loads ~3GB, expect several seconds)');
    const t0 = Date.now();
    const ok = await NiyoraGemma.prewarm(GEMMA_MAX_CONTEXT);
    append(`prewarm() → ${ok} in ${Date.now() - t0}ms`);
    if (!ok) {
      const d = await NiyoraGemma.diagnostics();
      append(`  ↳ reason: ${d.lastError ?? 'unreported'}`);
      append(`  ↳ memory available was ${mb(d.availableMemoryBytes)}`);
      append('  ↳ if the app died instead of returning, that is a jetsam kill:');
      append('    the increased-memory-limit entitlement is not in the profile.');
    }
  }, [append]);

  const runPrompt = useCallback(
    async (label: string, prompt: string) => {
      if (running) return;
      setRunning(true);
      const t0 = Date.now();
      const r = await NiyoraGemma.generateText(prompt, GEMMA_MAX_CONTEXT);
      if (r.ok) {
        append(`${label} OK (${r.latencyMs}ms): ${r.text}`);
        append('  ↳ THAT IS THE GATE. A token was generated on device.');
      } else {
        append(`${label} FAILED: ${r.failure} (${Date.now() - t0}ms)`);
        append(`  ↳ ${r.message ?? 'no message'}`);
      }
      setRunning(false);
    },
    [append, running],
  );

  const smoke = useCallback(() => runPrompt('smoke', SMOKE_PROMPT), [runPrompt]);
  const real = useCallback(() => runPrompt('vent', REAL_PROMPT), [runPrompt]);

  // Fetch the candidate if it isn't already on disk, and wait for the native
  // downloader to finish. Resolves false if it could not be installed, so the
  // caller skips that candidate instead of testing a file that isn't there.
  const ensureDownloaded = useCallback(
    async (c: Candidate) => {
      // A bundled model is already the best copy we will ever have. Fetching it
      // can only replace it with something worse, which is exactly what
      // happened on 2026-07-26.
      if (c.bundled) {
        append('bundled in the .app — not downloading');
        return true;
      }
      const state = await step(`modelState before ${c.filename}`, BUDGET.quick, () =>
        NiyoraGemma.modelState(),
      );
      await step(`probe setActiveModel ${c.filename}`, BUDGET.quick, () =>
        NiyoraGemma.setActiveModel(c.filename),
      );
      const already = await step(`modelState check ${c.filename}`, BUDGET.quick, () =>
        NiyoraGemma.modelState(),
      );
      if (already.source === 'downloaded') {
        append(`already downloaded (${already.bytes} bytes)`);
        await step('restore activeModel', BUDGET.quick, () =>
          NiyoraGemma.setActiveModel(state.activeModel),
        );
        return true;
      }
      await step('restore activeModel', BUDGET.quick, () =>
        NiyoraGemma.setActiveModel(state.activeModel),
      );

      const url = `http://${modelHost()}:8100/${c.filename}`;
      append(`downloading ${c.filename} from ${url}`);

      return await step(`download ${c.filename}`, BUDGET.download, () =>
        new Promise<boolean>((resolve) => {
          let last = -1;
          const offProgress = NiyoraGemma.onDownloadProgress((e) => {
            const pct = Math.floor(e.fraction * 100);
            // Only log every 20%, or the sink drowns in progress lines.
            if (pct >= last + 20) {
              last = pct;
              append(`  … ${pct}% (${Math.round(e.bytesWritten / 1e6)}MB)`);
            }
          });
          const offDone = NiyoraGemma.onDownloadFinished((e) => {
            offProgress();
            offDone();
            append(e.ok ? `  ↳ installed: ${e.message}` : `  ↳ DOWNLOAD FAILED: ${e.message}`);
            resolve(e.ok);
          });
          // `bytes` is what turns the native size check on. Without it the
          // downloader installs whatever the server returned.
          NiyoraGemma.downloadModel({ url, filename: c.filename, bytes: c.bytes }).then((r) => {
            if (!r.started) {
              offProgress();
              offDone();
              append(`  ↳ could not start: ${r.error}`);
              resolve(false);
            }
          });
        }),
      );
    },
    [append, step],
  );

  // Run the whole sequence once, unattended, as soon as the screen mounts.
  //
  // The buttons stay for re-running by hand, but the gate must not DEPEND on
  // someone pressing them: a five-step manual sequence read back over chat is
  // exactly how a wrong number or a skipped step gets recorded as a pass.
  // Auto-running makes the result reproducible and greppable.
  const ranRef = useRef(false);
  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    void (async () => {
     try {
      // Awaited before the first append, so no state is set synchronously
      // inside the effect (`react-hooks/set-state-in-effect` is an error here).
      const a = await step('availability', BUDGET.quick, () => NiyoraGemma.availability());
      append(`availability() → ${a}`);
      await step('diagnostics', BUDGET.quick, checkDiagnostics);
      // Deliberately NOT fatal any more. `availability()` describes the
      // currently-active model, and a candidate we have not downloaded yet is
      // legitimately unavailable. Aborting here would skip the whole point.
      if (a !== 'available') {
        append('  ↳ active model not on disk yet; candidates below will fetch.');
      }
      // Candidates, cheapest first. Gemma 4 ships a `.task` build, which is
      // the format this MediaPipe engine already loads, so if it works we get
      // Gemma 4 with no new native runtime at all. The `.litertlm` is the
      // format the docs assumed we would need; whether MediaPipe on iOS accepts
      // it is genuinely untested (the ".task only" note in the C header is
      // inside an __EMSCRIPTEN__ block, so it constrains Web, not iOS).
      //
      // NOTE: no GPU attempt. `preferredBackend = .gpu` was measured hanging
      // indefinitely on this model and chip, with no error and no timeout, so
      // asking for it here would wedge the whole sequence.
      // Repair pass, before anything is measured. On 2026-07-26 a 335-byte 404
      // page was installed under the 3n filename and shadowed the good bundled
      // copy, so prewarm failed with "Unable to open zip archive" — which reads
      // exactly like the model being broken rather than the file being wrong.
      // Delete any downloaded copy too small to be a model, so the next
      // `setActiveModel` falls back to the bundle.
      for (const c of CANDIDATES) {
        await step(`repair check ${c.filename}`, BUDGET.quick, () =>
          NiyoraGemma.setActiveModel(c.filename),
        );
        const s = await step(`repair state ${c.filename}`, BUDGET.quick, () =>
          NiyoraGemma.modelState(),
        );
        if (s.source === 'downloaded' && s.bytes > 0 && s.bytes < IMPLAUSIBLY_SMALL) {
          append(`🧹 ${c.filename}: downloaded copy is ${s.bytes} bytes — not a model. Deleting.`);
          const gone = await step(`delete bogus ${c.filename}`, BUDGET.quick, () =>
            NiyoraGemma.deleteModel(c.filename),
          );
          append(`  ↳ deleted: ${gone}`);
        }
      }

      for (const c of CANDIDATES) {
        append(`===== ${c.filename} (${c.mb}MB) =====`);
        if (!(await ensureDownloaded(c))) continue;

        await step(`setActiveModel ${c.filename}`, BUDGET.quick, () =>
          NiyoraGemma.setActiveModel(c.filename),
        );
        const state = await step(`modelState ${c.filename}`, BUDGET.quick, () =>
          NiyoraGemma.modelState(),
        );
        append(`source=${state.source} bytes=${state.bytes}`);
        if (state.source === 'missing') {
          append('  ↳ not on disk, skipping');
          continue;
        }

        const t0 = Date.now();
        const ok = await step(`prewarm ${c.filename}`, BUDGET.prewarm, () =>
          NiyoraGemma.prewarm(GEMMA_MAX_CONTEXT, 'default'),
        );
        append(`prewarm → ${ok} in ${Date.now() - t0}ms`);
        if (!ok) {
          const d = await step('diagnostics after failed prewarm', BUDGET.quick, () =>
            NiyoraGemma.diagnostics(),
          );
          append(`  ↳ WILL NOT LOAD: ${d.lastError ?? 'unreported'}`);
          continue;
        }
        // A MATRIX, not a single shot. Two unknowns are tangled up: whether
        // the engine ever stops, and how fast it decodes. The output cap
        // separates them, because it bounds a runaway instead of waiting for
        // one, and `stopReason` then says which of the two we witnessed.
        //
        // The cap only became real on 2026-07-26. Before that it was passed as
        // `maxTokens`, which is a context cap applied at warm time, so the
        // "cap=64" runs were not capped at all and burned 87-110s each.
        //
        // Bare vs templated at the SAME cap isolates the turn-format question:
        // inline turn markers were once assumed to help, then assumed to hang.
        // Measured: templated answers correctly, bare trims to nothing.
        for (const cap of [64]) {
          for (const [label, text] of [
            ['bare', SMOKE_PROMPT],
            ['templated', c.wrap(SMOKE_PROMPT)],
          ] as const) {
            const g0 = Date.now();
            const g = await step(`generate ${label} cap=${cap} · ${c.filename}`, BUDGET.generate, () =>
              // `cap` is now the OUTPUT cap, enforced client-side by cancelling
              // the stream. It used to be passed as `maxTokens`, which is the
              // context cap and did nothing to a warm engine.
              NiyoraGemma.generateText(text, GEMMA_MAX_CONTEXT, cap),
            );
            const ms = Date.now() - g0;
            if (g.ok) {
              // The native side now trims at the stop marker and reports a real
              // token count, so the old char-based tok/s estimate is gone.
              const rate =
                g.outputTokens > 0 && ms > 0 ? `${(g.outputTokens / (ms / 1000)).toFixed(1)}` : '?';
              append(`  ${label} cap=${cap}: ${ms}ms, stop=${g.stopReason}, mode=${g.streamMode}`);
              append(
                `    → ${g.outputTokens} tokens, ${g.rawChars} raw chars, ${g.chunks} chunks, ttft=${g.msToFirstToken}ms`,
              );
              append(`    → ${rate} tok/s  (MEASURED, not a char estimate)`);
              append(`    → ${trimAtStop(g.text).slice(0, 160)}`);
              if (g.stopReason !== 'eos') {
                append(`    ↳ WE stopped it. This model did not terminate on its own.`);
              }
            } else {
              append(`  ${label} cap=${cap} FAILED after ${ms}ms: ${g.message}`);
            }
          }
        }
        const d2 = await step(`diagnostics after ${c.filename}`, BUDGET.quick, () =>
          NiyoraGemma.diagnostics(),
        );
        append(`  ↳ mem left ${mb(d2.availableMemoryBytes)}`);
        await step(`reset after ${c.filename}`, BUDGET.quick, () => NiyoraGemma.reset());
      }

      // Skia collision re-check, against whichever engine is resident.
      // `export-decisions.md` claims MediaPipe's global Skia symbols cause
      // EXC_BAD_ACCESS in apps linking @shopify/react-native-skia. It did not
      // reproduce on 2026-07-25, so re-run it per model rather than assuming
      // the earlier result carries over. Silence after this line IS the crash.
      append('mounting BreathingParticles (Atlas + per-frame) …');
      phase.current = 'skia';
      setSkiaMounted(true);
      await new Promise((r) => setTimeout(r, 2500));
      append('SKIA OK: no crash with Skia rendering alongside the engine.');
      append('— sequence complete · ALL STEPS RETURNED —');
     } catch (e) {
      // The sequence must never end without saying why. A log that stops with
      // no verdict line now means one thing only: the phone stopped talking.
      if (e instanceof HangError) {
        append(`— sequence ABORTED · wedged in "${e.step}" —`);
      } else {
        append(`— sequence ABORTED · ${e instanceof Error ? e.message : String(e)} —`);
      }
     } finally {
      phase.current = 'finished';
     }
    })();
  }, [append, step, checkDiagnostics, prewarm, runPrompt, ensureDownloaded]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <Text style={styles.title}>Gemma probe · on-device gate</Text>
        <Text style={styles.sub}>run top to bottom. first failure is the answer.</Text>
        <View style={styles.row}>
          <Btn label="1 · availability" onPress={checkAvailability} />
          <Btn label="2 · diagnostics" onPress={checkDiagnostics} />
          <Btn label="3 · prewarm" onPress={prewarm} />
        </View>
        <View style={styles.row}>
          <Btn label={running ? 'running…' : '4 · smoke (THE GATE)'} onPress={smoke} />
          <Btn label={running ? 'running…' : '5 · real vent'} onPress={real} />
          <Btn label="clear" onPress={() => setLog([])} />
        </View>
        {skiaMounted && (
          <View style={styles.skia}>
            <BreathingParticles
              motion="converge"
              phase="inhale"
              phaseT={0.5}
              active
              style={{ width: '100%', height: 90 }}
            />
          </View>
        )}
        <ScrollView style={styles.log} contentContainerStyle={styles.logContent}>
          {log.map((l, i) => (
            <Text key={i} style={styles.line} selectable>
              {l}
            </Text>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Btn({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1, paddingHorizontal: 16 },
  title: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600', paddingTop: 10 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, paddingBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 },
  btn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  btnText: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },
  skia: { height: 90, marginBottom: 4 },
  log: { flex: 1, marginTop: 8 },
  logContent: { paddingBottom: 24, gap: 4 },
  line: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Courier' },
});
