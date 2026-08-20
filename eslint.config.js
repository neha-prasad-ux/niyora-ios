// Flat config extending Expo's defaults.
//
// The react-hooks v6 "compiler" rules (immutability / refs / purity) fire
// false positives across this codebase because we use react-native-reanimated
// (reading/writing sharedValue.value and animated refs during render) and
// expo-audio (mutating the player object) — both are the intended APIs, not
// bugs. We keep them as warnings (visible, non-blocking) rather than errors,
// and keep the genuinely useful hook rules (rules-of-hooks, exhaustive-deps).
//
// set-state-in-effect is a warning for the same reason (Neha 2026-08-20). It
// fires on the fetch-in-effect pattern all over the Reflect flow: guard, flip a
// loading flag, start the request, clear the flag in .finally. Satisfying it
// properly means moving data fetching out of effects entirely, which is a real
// refactor of the reflect/act cards, not a lint tidy-up. Worth doing on purpose,
// not as a merge blocker.
// react/no-unescaped-entities is off (apostrophes in on-screen copy are fine in RN).
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'ios/*', 'android/*'],
    rules: {
      'react-hooks/globals': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
]);
