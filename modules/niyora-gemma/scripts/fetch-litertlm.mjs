#!/usr/bin/env node
// Fetch the LiteRT-LM xcframework. Run before `pod install`.
//
// The framework is ~85 MB of prebuilt binary, so it is NOT committed — same
// rule as the model weights. The Swift wrapper sources under vendor/LiteRTLM
// ARE committed: they are small, readable, and the module compiles against
// them directly. Benchmark.swift is included even though we never call it --
// Conversation.getBenchmarkInfo() returns BenchmarkInfo, so omitting it breaks
// the build.
//
// Pinned to a version AND a sha256. An unpinned binary dependency that silently
// changes under you is how a working build becomes an unreproducible one.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const VERSION = 'v0.14.0';
// From Package.swift's binaryTarget checksum for CLiteRTLM.xcframework.zip.
const SHA256 = '4a4bdb0e89689ceacc54c2fb7ae0efe8f5dad2404110976a29c3bf6b374a511e';
const URL = `https://github.com/google-ai-edge/LiteRT-LM/releases/download/${VERSION}/CLiteRTLM.xcframework.zip`;

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(HERE, '..', 'ios', 'vendor');
const FRAMEWORK = join(VENDOR, 'CLiteRTLM.xcframework');
const ZIP = join(VENDOR, 'CLiteRTLM.xcframework.zip');

if (existsSync(FRAMEWORK)) {
  console.log(`✓ CLiteRTLM.xcframework already present (${VERSION})`);
  process.exit(0);
}

mkdirSync(VENDOR, { recursive: true });
console.log(`↓ ${URL}`);
const res = await fetch(URL);
if (!res.ok) {
  console.error(`✗ download failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
await pipeline(Readable.fromWeb(res.body), createWriteStream(ZIP));

const got = createHash('sha256').update(await readFile(ZIP)).digest('hex');
if (got !== SHA256) {
  rmSync(ZIP, { force: true });
  console.error(`✗ checksum mismatch\n  expected ${SHA256}\n  got      ${got}`);
  process.exit(1);
}
execSync(`unzip -q -o "${ZIP}" -d "${VENDOR}"`);
rmSync(ZIP, { force: true });
console.log(`✓ CLiteRTLM.xcframework ${VERSION} verified and unpacked`);
