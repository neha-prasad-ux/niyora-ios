#!/usr/bin/env node
// Fetch the Gemma weights into ios/model/ so CocoaPods can bundle them into the
// app at build time. Run this BEFORE `pod install` / an EAS build. The file is
// large (~3GB) and is never committed to git (see .gitignore).
//
// E2B is a gated model: accept Google's Gemma license and supply a source URL
// + token yourself (the same source used before the 1B experiment). Set these
// env vars, then run `node scripts/fetch-model.mjs`:
//
//   GEMMA_MODEL_URL   direct download URL to the gemma-3n-E2B int4 .task file
//                     (a Hugging Face resolve URL, or your own storage)
//   GEMMA_MODEL_TOKEN optional bearer token (Hugging Face access token) sent as
//                     `Authorization: Bearer <token>` for gated downloads
//
// EAS: add this to an `eas-build-pre-install` hook (or a prebuild step) so CI
// pulls the model before archiving. Locally, run it once — the file is cached
// on disk and skipped on subsequent runs unless GEMMA_FORCE=1.

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODEL_FILENAME = 'gemma-3n-E2B-it-int4.task'; // keep in sync with src/index.ts
const OUT_DIR = join(HERE, '..', 'ios', 'model');
const OUT_PATH = join(OUT_DIR, MODEL_FILENAME);

const url = process.env.GEMMA_MODEL_URL;
const token = process.env.GEMMA_MODEL_TOKEN;
const force = process.env.GEMMA_FORCE === '1';

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
