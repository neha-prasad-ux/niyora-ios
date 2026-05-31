/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode is the default and only theme for v1.
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // ── Colors ──────────────────────────────────────────────────────────────
      // Sourced from src/theme/colors.ts so Tailwind utilities and brand
      // tokens share a single source of truth.
      colors: {
        // Background gradient stops
        background: {
          DEFAULT: '#0e0b14', // backgroundTop
          mid: '#070609',     // backgroundMid
          bottom: '#000000',  // backgroundBottom
        },
        // Begin-button accent (purple)
        accent: {
          DEFAULT: '#683aac', // beginStart
          end: '#5e3580',     // beginEnd
        },
        // Text layers
        primary: 'rgba(255,255,255,0.95)',   // textPrimary
        wordmark: 'rgba(255,255,255,0.70)',  // textWordmark
        tagline: 'rgba(255,255,255,0.40)',   // textTagline
        subtitle: 'rgba(255,255,255,0.55)',  // textSubtitle
        tertiary: 'rgba(255,255,255,0.60)',  // textTertiary
        chrome: 'rgba(255,255,255,0.85)',    // iconChrome
      },

      // ── Font families ────────────────────────────────────────────────────────
      // Keys must match the font keys registered in _layout.tsx via expo-font.
      fontFamily: {
        'poppins-light': ['Poppins-Light'],
        poppins: ['Poppins-Regular'],
        'poppins-medium': ['Poppins-Medium'],
        'poppins-semibold': ['Poppins-SemiBold'],
        'poppins-bold': ['Poppins-Bold'],
      },

      // ── Font sizes ───────────────────────────────────────────────────────────
      // Matches the scale in src/theme/typography.ts.
      fontSize: {
        wordmark: [13, { letterSpacing: 3 }],
        tagline: [11, {}],
        technique: [24, { letterSpacing: 0.3 }],
        ui: [13, {}],
        begin: [15, { letterSpacing: 2 }],
      },
    },
  },
  plugins: [],
};
