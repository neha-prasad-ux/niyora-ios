// Is the Gemini endpoint actually locked?
//
//   node scripts/check-appcheck.mjs
//
// This makes exactly the request an attacker would: the API key lifted out of
// GoogleService-Info.plist (which ships inside every copy of the app and can be
// read out of the IPA in about a minute), from a laptop, with no App Attest
// assertion. Nothing else.
//
//   BLOCKED  the key on its own is worthless. This is what you want.
//   ALLOWED  anyone holding the bundle can spend the project's Gemini quota.
//
// The app side has been correct since launch: startAppCheck() runs in the root
// layout before any AI call, and production attests with App Attest. What was
// missing is ENFORCEMENT, which is a Firebase console toggle, not code. So this
// exists because "I think I turned it on" is not a thing anyone should have to
// rely on for a key that is sitting in a shipped binary.
//
// Run it after flipping enforcement, and again after any release.

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [PROJECT, API_KEY] = execFileSync('python3', [
  '-c',
  "import plistlib,sys;p=plistlib.load(open(sys.argv[1],'rb'));print(p['PROJECT_ID']);print(p['API_KEY'])",
  resolve(ROOT, 'GoogleService-Info.plist'),
])
  .toString()
  .trim()
  .split('\n');

const url = `https://firebasevertexai.googleapis.com/v1beta/projects/${PROJECT}/locations/us-central1/publishers/google/models/gemini-2.5-pro:generateContent?key=${API_KEY}`;

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'say ok' }] }],
    generationConfig: { maxOutputTokens: 600 },
  }),
});
const body = await res.json().catch(() => ({}));
const ok = res.status === 200 && body?.candidates?.length;

console.log(`\nproject : ${PROJECT}`);
console.log(`status  : ${res.status}`);
if (ok) {
  console.log('\n  ALLOWED. The bundled key alone reached Gemini and got a completion.');
  console.log('  Anyone who unpacks the app can spend this project\'s quota.\n');
  console.log('  Turn on App Check enforcement for Firebase AI Logic:');
  console.log(`  https://console.firebase.google.com/project/${PROJECT}/appcheck/apis\n`);
  process.exitCode = 1;
} else {
  const msg = body?.error?.message ?? '(no message)';
  console.log(`\n  BLOCKED. ${msg}`);
  console.log('  The key on its own is worthless without an App Attest assertion.\n');
}

// A registered debug token bypasses App Check completely, for anyone holding it,
// until it is deleted. Dev builds use the 'debug' provider (see src/lib/firebase.ts),
// so tokens accumulate. They are as sensitive as the key this check is about.
console.log('  Also check no stale debug tokens are registered:');
console.log(`  https://console.firebase.google.com/project/${PROJECT}/appcheck/apps\n`);
