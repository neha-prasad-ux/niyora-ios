// Typography, the single source of truth for every text style in the app.
//
// Structure: a raw SIZE scale (fontScale) plus semantic ROLE tokens
// (typography.*) that bind size + Poppins family + line-height + letter
// spacing together. Compose a role and, if needed, only override color:
//
//     <Text style={[typography.body, { color: colors.textOnDark.secondary }]}>
//
// SIX rungs (2026-07-30 merge, the old 9-rung scale crowded four sizes into a
// 4px band; these six have distinct, readable jumps): 12 · 14 · 16 · 20 · 26 · 32.
//
// Rules (from DESIGN.md):
//   · Poppins is the only typeface. Pick weight via the family, never a numeric
//     fontWeight.
//   · Line-height is ~1.5 body, ~1.2 headings, baked into every role.
//   · Sizes come only from fontScale below. Off-scale numbers round to a rung.

import type { TextStyle } from 'react-native';
import { fonts } from './fonts';

// ── Size scale (6 rungs) ──────────────────────────────────────────────────────
// The canonical names are caption/body/emphasis/title/heading/hero. The older
// names (tagline/bodyLg/cardTitle/technique/pageTitle) are kept as ALIASES that
// now resolve onto the six rungs, so the whole app merged in one edit:
//   11,13 → 12   ·   15,17 → 16   ·   24,28 → 26   ·   34 → 32
export const fontScale = {
  // canonical
  caption: 12,
  body: 14,
  emphasis: 16,
  title: 20,
  heading: 26,
  hero: 32,
  // aliases (old names → merged rungs)
  tagline: 12,
  bodyLg: 16,
  cardTitle: 16,
  technique: 26,
  pageTitle: 26,
} as const;

// ── Role tokens ───────────────────────────────────────────────────────────────
export const typography = {
  // Brand wordmark: tracked-out, uppercase. Its own size (a logo, off-scale).
  wordmark: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 3,
    textTransform: 'uppercase',
  } satisfies TextStyle,

  // Fine print / taglines.
  tagline: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption, // 12
    lineHeight: 16,
    letterSpacing: 0,
  } satisfies TextStyle,

  // Secondary text: captions, subtitles, the quieter line in a pair.
  caption: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption, // 12
    lineHeight: 17,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  // Default running text.
  body: {
    fontFamily: fonts.regular,
    fontSize: fontScale.body, // 14
    lineHeight: 21,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  // Emphasised body + card/list-item headings (the 15/16/17 cluster, merged).
  emphasis: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 22,
    letterSpacing: 0.15,
  } satisfies TextStyle,

  // Button labels (Begin/Pill baseline). BEGIN adds uppercase + 2pt tracking.
  label: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 22,
    letterSpacing: 0.5,
  } satisfies TextStyle,

  // Section titles within a screen.
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title, // 20
    lineHeight: 26,
    letterSpacing: 0.15,
  } satisfies TextStyle,

  // Big titles: tab page titles, technique/practice names (24/28, merged).
  heading: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading, // 26
    lineHeight: 32,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  // The largest type: onboarding hero lines.
  hero: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.hero, // 32
    lineHeight: 38,
    letterSpacing: 0,
  } satisfies TextStyle,

  // ── Back-compat aliases (old role names → merged rungs) ────────────────────
  bodyLg: {
    fontFamily: fonts.regular,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 22,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  cardTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 22,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  techniqueName: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading, // 26
    lineHeight: 32,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  pageTitle: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading, // 26
    lineHeight: 32,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  subtitle: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption, // 12
    lineHeight: 17,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  tertiaryAction: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption, // 12
    lineHeight: 17,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  beginLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 22,
    letterSpacing: 0.5,
  } satisfies TextStyle,
} as const;

// ── Moon flow scale ───────────────────────────────────────────────────────────
// The moment flow (`moment.tsx`) and onboarding share ONE small scale so Moon's
// voice, headings, body and labels stay consistent across every card. FOUR sizes
// only, 26 · 20 · 16 · 12, where WEIGHT carries emphasis within a size and
// COLOR carries the quiet/subtitle tier (a subtitle is `body` dimmed, never
// `body` shrunk). Headings run a tight -0.2 tracking for the calm, display feel.
// Buttons reuse `typography.label` above; compose a role + only override color:
//     <Text style={[moon.title, { color: colors.textPrimary }]}>
export const moon = {
  // The one loud moment: the finish celebration. Nothing else in the flow is
  // this big (Neha 2026-08-03, celebration stays 26, everything else steps down).
  celebrate: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.heading, // 26
    lineHeight: 30,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  // The beat's question, every screen heading, and the full-screen breath line.
  title: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.title, // 20
    lineHeight: 26,
    letterSpacing: -0.2,
  } satisfies TextStyle,
  // Moon's spoken / echoed line: the SAME size as the question, lighter by weight
  // (Neha 2026-08-02, the voice is one consistent size, distinguished by weight).
  voice: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title, // 20
    lineHeight: 26,
    letterSpacing: 0,
  } satisfies TextStyle,
  // All reading text: sublines, inputs, instructions, descriptions. A subtitle is
  // this role in a dimmer color, not a smaller size.
  body: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 24,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  // Emphasised body: strong labels, a heading inside a card, the snackbar.
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis, // 16
    lineHeight: 24,
    letterSpacing: 0.15,
  } satisfies TextStyle,
  // Fine print: descriptions, benefits, quiet hints.
  caption: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption, // 12
    lineHeight: 17,
    letterSpacing: 0.2,
  } satisfies TextStyle,
  // Meta labels: "Saved to your Soul", the brand signature, small-caps tags.
  captionStrong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption, // 12
    lineHeight: 17,
    letterSpacing: 0.3,
  } satisfies TextStyle,
} as const;
