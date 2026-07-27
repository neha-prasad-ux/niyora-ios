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

# CocoaPods hard-crashes on a non-UTF-8 locale ("Unicode Normalization not
# appropriate for ASCII-8BIT") before it reads a single line of the Podfile.
# Whether it bites depends on the terminal, so set it here rather than asking
# everyone to fix their ~/.profile.
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

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
#
#     Bare `--device` makes expo prompt for a picker, which fails outright when
#     stdout is not a TTY ("Input is required, but 'npx expo' is in
#     non-interactive mode") — so CI, or anything piping this script, dies here
#     after paying for the whole pod install. Resolve the device up front.
#
#     expo wants the HARDWARE udid (00008120-…), not the CoreDevice UUID that
#     the human-readable `devicectl list devices` prints in its Identifier
#     column. Passing the latter gets you "No device UDID or name matching".
#
#     Ask devicectl rather than xctrace. `xctrace list devices` files a
#     perfectly healthy wired iPhone under "== Devices Offline ==" (observed
#     2026-07-27 on a phone devicectl reported as tunnelState=connected,
#     transportType=wired), so trusting it means refusing to build to a device
#     that is sitting right there.
DEVICE_UDID="${DEVICE_UDID:-}"
if [ -z "$DEVICE_UDID" ]; then
  _dev_json="$(mktemp -t niyora-devices)"
  xcrun devicectl list devices --json-output "$_dev_json" >/dev/null 2>&1 || true
  DEVICE_UDID="$(
    python3 - "$_dev_json" <<'PY' 2>/dev/null || true
import json, sys
try:
    devices = json.load(open(sys.argv[1]))["result"]["devices"]
except Exception:
    sys.exit(0)
for d in devices:
    hw, conn = d.get("hardwareProperties", {}), d.get("connectionProperties", {})
    if hw.get("deviceType") == "iPhone" and conn.get("tunnelState") == "connected":
        print(hw.get("udid", ""))
        break
PY
  )"
  rm -f "$_dev_json"
fi

if [ -z "$DEVICE_UDID" ]; then
  echo "✗ No connected iPhone found." >&2
  echo "  Plug it in and unlock it, then re-run. To check what the Mac can see:" >&2
  echo "    xcrun devicectl list devices" >&2
  echo "  'available (paired)' alone is not enough — the build needs a live" >&2
  echo "  tunnel, which you can confirm with:" >&2
  echo "    xcrun devicectl device info details --device <identifier>" >&2
  echo "  To target one explicitly: DEVICE_UDID=<hardware-udid> npm run build:dev" >&2
  exit 1
fi

echo "▸ [3/3] Building to $DEVICE_UDID (this is the long one)…"
EXPO_PUBLIC_REFLECT_AI=1 npx expo run:ios --device "$DEVICE_UDID"

echo
echo "✓ Done. On the phone:"
echo "  • Glass: the tab bar + You-tab empty states are now frosted."
echo "  • Gemma: open a Rough moment ('start fresh') session — turns come from"
echo "    Gemma when the model bundled, otherwise the session stays scripted."
