#!/usr/bin/env bash
#
# One-command dev-client build for the current branch — installs BOTH the
# frosted-glass UI (expo-blur / expo-glass-effect) and the on-device Gemma chat
# to your plugged-in iPhone in a single binary. Run from the repo root on your
# Mac:
#
#   FULL build (glass + working Gemma):
#     GEMMA_MODEL_URL='<direct .task url>' GEMMA_MODEL_TOKEN='<your hf token>' \
#       npm run build:dev
#
#   FAST build (glass now, Gemma stays scripted until you do the full build):
#     npm run build:dev            # no GEMMA_MODEL_URL -> skips the 3GB fetch
#
# The blur needs no config; it links during `pod install`. Gemma needs its ~3GB
# weights fetched first (they're bundled into the binary via the podspec) and
# the AI path turned on (EXPO_PUBLIC_REFLECT_AI=1) — both handled below.
#
# What this deliberately does NOT do: `expo prebuild`. ios/ is committed, so we
# link into it and never regenerate/clobber it.

set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ Branch: $(git branch --show-current)"
echo "▸ Expecting this branch to carry both the glass work and the Gemma module."
echo

# 1 — Gemma weights. Optional: no URL => a glass-only build (Gemma links but
#     reports modelNotReady, so the Rough-moment session stays scripted).
if [ -n "${GEMMA_MODEL_URL:-}" ]; then
  echo "▸ [1/3] Fetching the Gemma model (~3GB, one time)…"
  ( cd modules/niyora-gemma && node scripts/fetch-model.mjs )
  echo "  ✓ model in place"
else
  echo "▸ [1/3] GEMMA_MODEL_URL not set — GLASS-ONLY build."
  echo "        The blur/glass will work; Gemma stays scripted. Re-run with"
  echo "        GEMMA_MODEL_URL + GEMMA_MODEL_TOKEN set to bundle the model."
fi
echo

# 2 — Link native modules into the existing ios/ project. Expo autolinking
#     (nativeModulesDir: ./modules) picks up niyora-gemma; the Pods resolve
#     MediaPipe + expo-blur + expo-glass-effect in the same pass.
echo "▸ [2/3] pod install…"
( cd ios && pod install )
echo "  ✓ native modules linked (Gemma + MediaPipe + expo-blur/glass)"
echo

# 3 — Build and install to the connected device with the AI path on.
echo "▸ [3/3] Building to your device (this is the long one)…"
EXPO_PUBLIC_REFLECT_AI=1 npx expo run:ios --device

echo
echo "✓ Done. On the phone:"
echo "  • Glass: the tab bar + You-tab empty states are now frosted."
echo "  • Gemma: open a Rough moment ('start fresh') session — turns come from"
echo "    Gemma when the model bundled, otherwise the session stays scripted."
