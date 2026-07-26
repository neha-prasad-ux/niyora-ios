#!/usr/bin/env node
// Fetch the Gemma weights into ios/model/ so CocoaPods can bundle them into the
// app at build time. Run this BEFORE `pod install` / an EAS build. The file is
// large (~2.6 GB) and is never committed to git (see .gitignore).
//
// DEFAULT: our fine-tune, from the private Hugging Face repo. It is a build
// CACHE of a ~80-minute two-pass CPU export, which is why it is stored rather
// than regenerated. The adapter remains the source of truth.
//
//   HF_TOKEN          read token for neha-prasad/*, or ~/.cache/huggingface/token
//
// OVERRIDE, for a different model or the legacy gemma-3n .task:
//
//   GEMMA_MODEL_URL   direct download URL
//   GEMMA_MODEL_TOKEN bearer token for that URL
//
// The filename decides the runtime at load time: `.litertlm` selects LiteRT-LM,
// `.task` selects MediaPipe. Keep it in sync with kLiteRtResource in
// ios/NiyoraGemmaModule.swift and GEMMA_MODEL_FILENAME in src/index.ts.
//
// EAS: add this to an `eas-build-pre-install` hook (or a prebuild step) so CI
// pulls the model before archiving. Locally, run it once — the file is cached
// on disk and skipped on subsequent runs unless GEMMA_FORCE=1.

import { createWriteStream, existsSync, mkdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL_FILENAME = 'niyora-gemma4-e2b-v4-wide-deduped-int4.litertlm';
// v4_wide_deduped: 96% on beat form, matching the human-authored targets, where
// the best-grounding model scores 40%. See gemma4-runpod/docs/MODEL-CHOICE.md.
const HF_REPO = 'neha-prasad/niyora-gemma4-e2b-v4-wide-deduped-int4-litertlm';
const OUT_DIR = join(HERE, '..', 'ios', 'model');
const OUT_PATH = join(OUT_DIR, MODEL_FILENAME);

const url =
  process.env.GEMMA_MODEL_URL ??
  `https://huggingface.co/${HF_REPO}/resolve/main/${MODEL_FILENAME}`;
const token =
  process.env.GEMMA_MODEL_TOKEN ??
  process.env.HF_TOKEN ??
  readLocalHfToken();
const force = process.env.GEMMA_FORCE === '1';

// The Hub repo is private, so a token is required. Fall back to the one the
// huggingface-cli writes, so a fresh checkout works without exporting anything.
function readLocalHfToken() {
  try {
    return readFileSync(
      join(process.env.HOME ?? '', '.cache/huggingface/token'), 'utf8'
    ).trim();
  } catch {
    return undefined;
  }
}

function humanMB(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(0)} MB`;
}

async function main() {
  if (existsSync(OUT_PATH) && !force) {
    const size = statSync(OUT_PATH).size;
    console.log(`✓ Model already present (${humanMB(size)}): ${OUT_PATH}`);
    console.log('  Set GEMMA_FORCE=1 to re-download.');
    return;
  }
  if (!url) {
    console.error('✗ GEMMA_MODEL_URL is not set.');
    console.error('  Accept the Gemma license, then set GEMMA_MODEL_URL (and');
    console.error('  GEMMA_MODEL_TOKEN if the source is gated) and re-run.');
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`↓ Fetching Gemma weights → ${OUT_PATH}`);

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    redirect: 'follow',
  });
  if (!res.ok || !res.body) {
    console.error(`✗ Download failed: HTTP ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const tmp = `${OUT_PATH}.partial`;
  try {
    await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
  } catch (e) {
    if (existsSync(tmp)) unlinkSync(tmp);
    console.error(`✗ Download interrupted: ${e?.message ?? e}`);
    process.exit(1);
  }
  // Atomic-ish move so a half-written file never looks complete.
  const { renameSync } = await import('node:fs');
  renameSync(tmp, OUT_PATH);
  console.log(`✓ Done (${humanMB(statSync(OUT_PATH).size)}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
