// The Premium wall's looks, with no store in it.
//
// Split out from src/app/paywall.tsx on purpose: the screen needs StoreKit and
// StoreKit needs a native module, so the design could only ever be looked at on a
// build that had one. Everything visual lives here and takes plain props, so the
// same markup renders from real StoreKit prices AND from the preview fixture.
// One set of markup, so the preview can never drift from what ships.
//
// Built like Home (app/(tabs)/now.tsx): her moon sits in the background and a
// frosted sheet lies over it, so the wall reads as a screen of this app rather
// than a page inserted into it. It also buys back the whole top of the screen,
// because a moon behind the glass costs no layout height at all, where a moon
// stacked above the headline was eating a quarter of it.
//
// The one screen allowed colors.heroGradient. Everything else is the app's own
// glass and Poppins: this is a moment in her evening, not an ad break.

import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';

import { CosmicBackground } from '@/components/cosmic-background';
import { CloseButton } from '@/components/CloseButton';
import { SoulMoon } from '@/components/soul-moon';
import { MONTHLY_SKU, YEARLY_SKU } from '@/lib/premium';
import { colors } from '@/theme/colors';
import { elevation } from '@/theme/elevation';
import { fonts } from '@/theme/fonts';
import { glass } from '@/theme/glass';
import { fontScale, typography } from '@/theme/typography';
import { spacing, radius, pageGutter } from '@/theme/spacing';

/** How far the footer's fade reaches ABOVE the footer. It has to be LONG: the
 *  fine print's resting position is roughly a line and a half above the footer's
 *  edge, so a short run left it sitting in the fade's transparent end, still
 *  perfectly readable underneath the footer's own text. */
const FADE_RUN = spacing.xxxl * 5;

const PRIVACY_URL = 'https://niyora.com/privacy';
const TERMS_URL = 'https://niyora.com/terms';

// The note. Niyora is one person, and on this screen that is the point: she is
// not being sold a subscription by a company, she is being asked to fund the
// work by the woman doing it.
//
// Kept SHORT on purpose. A paywall is read in about ten seconds, and the honest
// version of this argument does not need paragraphs; the moment it turns into an
// essay it stops being a note and starts being a pitch she scrolls past.
//
// Every claim has to survive docs/privacy-policy.md. An earlier draft said
// "still nothing leaves your phone", which is NOT true: the text she writes goes
// to Google through Vertex to be reflected on. On a screen whose whole argument
// is honesty, a comfortable overstatement is the one thing that cannot ship.
const NOTE = 'I build Niyora alone. No investor, no advertiser. Premium is what funds it:';

/** The three, as part of the note rather than a list beside it. Ticks, not
 *  icons: the eye reads a tick as "included" without being taught. */
const WHAT_IT_FUNDS = [
  'Keeping up with the research',
  'Keeping your data yours',
  'Staying focused on PMS',
];

export type PaywallViewProps = {
  /** Free moments a month, so the headline states the real rule. */
  freeCount: number;
  /** Localised prices straight from StoreKit. `null` while unknown. */
  yearlyPrice: string | null;
  monthlyPrice: string | null;
  /** What the year saves against paying monthly, already computed. */
  savingPercent: number | null;
  /** e.g. "7 days", from the product's own intro offer. `null` = no trial, and
   *  then nothing on this screen claims one. */
  trialLabel: string | null;
  /** The store answered and had nothing. The wall says so and stays closable. */
  unavailable: boolean;
  /** A sku, or 'restore', while that action is in flight. */
  busy: string | null;
  note: string | null;
  onBuy: (sku: string) => void;
  onRestore: () => void;
  onClose: () => void;
};

export function PaywallView({
  freeCount,
  yearlyPrice,
  monthlyPrice,
  savingPercent,
  trialLabel,
  unavailable,
  busy,
  note,
  onBuy,
  onRestore,
  onClose,
}: PaywallViewProps) {
  // Two plans, one primary button. Two competing buttons made her decide and act
  // in the same tap; picking then confirming is one decision at a time, which is
  // how the rest of the app already works.
  const [selected, setSelected] = useState<string>(YEARLY_SKU);
  /** The pinned footer's real height, measured. A fixed guess was wrong: the
   *  footer grows a line when there is a note to show, and grows again at larger
   *  text sizes, and whatever it grows by is exactly how much of the fine print
   *  ends up trapped underneath it. */
  const [footerH, setFooterH] = useState(0);
  const yearlyOn = selected === YEARLY_SKU;

  const ctaLabel = busy === selected
    ? 'One moment...'
    : unavailable
      ? 'Premium is unavailable'
      : yearlyOn && trialLabel
        ? `Start ${trialLabel} free`
        : 'Start Premium';

  return (
    <View style={styles.root}>
      <CosmicBackground />

      {/* Her actual moon, not a lookalike: SoulMoon is the same Orb call Home
          makes, with her real brightness, material and rose halo. It sits ABOVE
          the copy rather than behind it, the way Home puts the moon up top and
          the words at the foot, because body text laid over the moon's lit core
          is the one place on this screen contrast falls apart. */}
      <View style={styles.moonLayer} pointerEvents="none">
        <SoulMoon size={170} />
      </View>

      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.glassCard}>
          <BlurView intensity={30} tint="dark" pointerEvents="none" style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={styles.glassTint} />
          {/* Glossy sheen: light catching the glass from the top-left and falling
              away toward the bottom-right, the same one Home uses. */}
          <LinearGradient
            colors={[...glass.sheen]}
            locations={[0, 0.28, 0.62]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            pointerEvents="none"
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.close}>
            <CloseButton onPress={onClose} />
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: footerH + spacing.xl }]}
            showsVerticalScrollIndicator={false}
          >
          <Text style={styles.title}>Keep talking to Moon.</Text>
          <Text style={styles.sub}>
            Your {freeCount} free moments are used. They come back on the first.
          </Text>

          {/* The voice changes here, from the app to the person who made it. The
              rule is what makes the block below read as a letter rather than
              more UI copy, which is also why it stays left-aligned: centred
              prose loses the left edge the eye returns to on every line. */}
          <View style={styles.rule} />

          <View style={styles.card}>
            <Text style={styles.note_p}>{NOTE}</Text>
            {WHAT_IT_FUNDS.map((line) => (
              <View key={line} style={styles.row}>
                <SymbolView name="checkmark" tintColor={colors.accentViolet} size={13} weight="semibold" />
                <Text style={styles.rowTitle}>{line}</Text>
              </View>
            ))}
            <Text style={styles.sign}>Neha</Text>
          </View>

          <View style={styles.rule} />

          <View style={styles.plans}>
            <Plan
              label="Yearly"
              price={yearlyPrice}
              per="a year"
              footnote={trialLabel ? `${trialLabel} free first` : null}
              badge={savingPercent != null ? `Save ${savingPercent}%` : null}
              selected={yearlyOn}
              disabled={unavailable}
              onPress={() => setSelected(YEARLY_SKU)}
            />
            <Plan
              label="Monthly"
              price={monthlyPrice}
              per="a month"
              footnote={null}
              badge={null}
              selected={!yearlyOn}
              disabled={unavailable}
              onPress={() => setSelected(MONTHLY_SKU)}
            />
          </View>

          {/* The note lives in the scroll, not in the pinned footer. In the footer
              it sat directly over the fine print scrolling underneath, and no
              amount of fade tuning fixed text on text. Here the footer holds one
              thing, the button, which nothing can read through. */}
          {unavailable && (
            <Text style={styles.note}>The App Store did not answer. Try again later.</Text>
          )}
          {note != null && <Text style={styles.note}>{note}</Text>}

          <Pressable onPress={onRestore} disabled={busy != null} hitSlop={10} accessibilityRole="button">
            <Text style={styles.restore}>{busy === 'restore' ? 'Checking...' : 'Restore purchase'}</Text>
          </Pressable>

          {/* Apple requires the renewal terms and both links on the wall itself. */}
          <Text style={styles.fine}>
            Payment is charged to your Apple Account. The subscription renews on its own unless you
            turn it off at least 24 hours before the period ends. Manage it in your Apple Account
            settings.
          </Text>
          <View style={styles.links}>
            <Pressable onPress={() => Linking.openURL(TERMS_URL).catch(() => {})} hitSlop={8}>
              <Text style={styles.link}>Terms</Text>
            </Pressable>
            <Text style={styles.linkDot}>·</Text>
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})} hitSlop={8}>
              <Text style={styles.link}>Privacy</Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* The buy button is pinned rather than laid out at the end of the
            story. Content length is not something this screen controls: her
            text size, a longer price string, a small phone, all of it moves the
            fold, and a paywall whose button is under the fold is a paywall she
            cannot answer. Content scrolls under the fade behind it. */}
        <View
          style={styles.footer}
          pointerEvents="box-none"
          onLayout={(e) => {
            const h = Math.round(e.nativeEvent.layout.height);
            setFooterH((prev) => (prev === h ? prev : h));
          }}
        >
          {/* A gradient alone only DIMMED what scrolled underneath, so the fine
              print still read through the note on top of it. Frosting the
              footer the same way the sheet is frosted actually obscures it, and
              keeps the bottom of the card looking like the rest of the glass
              rather than a painted-on bar. */}
          {/* The footer is OPAQUE and the fade sits entirely above it. Three
              earlier attempts tuned a gradient that ran underneath the footer's
              own text, and every one of them left the fine print readable
              through the note, because a gradient that has to be translucent
              somewhere will always be translucent where the text is. Solid
              footer, fade above it: nothing to tune, nothing to show through. */}
          <LinearGradient
            colors={[...glass.fade]}
            locations={[0, 0.45, 1]}
            pointerEvents="none"
            style={styles.footerFade}
          />
          <View style={[styles.ctaGlow, (busy != null || unavailable) && styles.dim]}>
            <Pressable
              onPress={() => onBuy(selected)}
              disabled={busy != null || unavailable}
              accessibilityRole="button"
              accessibilityLabel={ctaLabel}
              style={styles.ctaWrap}
            >
              <LinearGradient
                colors={[...colors.heroGradient]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                <Text style={styles.ctaText}>{ctaLabel}</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Plan({
  label,
  price,
  per,
  footnote,
  badge,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  price: string | null;
  per: string;
  footnote: string | null;
  badge: string | null;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={price ? `${label}, ${price} ${per}` : label}
      style={[styles.plan, selected && styles.planOn, disabled && styles.dim]}
    >
      {badge != null ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : (
        // Holds the row's two cards the same height whether or not one carries a
        // badge, so the prices sit on one line.
        <View style={styles.badgeGhost} />
      )}
      <Text style={styles.planLabel}>{label}</Text>
      {/* A blank, not a dash: the price slot holds its line so the two cards stay
          aligned, and the CTA below already says why there is no price. */}
      <Text style={styles.planPrice}>{price ?? ' '}</Text>
      <Text style={styles.planPer}>{per}</Text>
      <Text style={styles.planFoot}>{footnote ?? ' '}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },

  // The moon sits behind the sheet, not in the layout, so it costs no height.
  moonLayer: { position: 'absolute', left: 0, right: 0, top: spacing.xxl, alignItems: 'center' },

  // Home's charcoal glass card, full height here because there is no tab bar.
  glassCard: {
    flex: 1,
    margin: spacing.sm,
    borderRadius: radius.card,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  // A light frost over the blur, translucent so the moon glows through it.
  glassTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: glass.scrim,
  },
  close: { position: 'absolute', top: spacing.md, right: spacing.md, zIndex: 2 },

  // Leaves room for the pinned footer so the last row is never trapped under it.
  // Clears the moon's lit core. Measured: a headline sitting ON the core came
  // out at 4.24:1, under the 4.5:1 floor for body text; below it, 13:1+.
  scroll: {
    paddingHorizontal: spacing.xl,
    // Clears the close control and lets the moon read above the headline.
    paddingTop: spacing.xxxl * 4,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: glass.footer,
  },
  // Reaches well above the footer's own content: the note sits at the TOP of
  // the footer, so a fade that only started at the footer's edge left it
  // translucent and the fine print scrolled through the text.
  footerFade: { position: 'absolute', left: 0, right: 0, bottom: '100%', height: FADE_RUN },

  title: { ...typography.heading, color: colors.textOnDark.primary, textAlign: 'center' },
  sub: {
    ...typography.body,
    color: colors.textOnDark.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },

  // No inner card: the sheet IS the surface. Glass stacked on glass goes muddy
  // and reads as two panels arguing, which is exactly the noise this screen
  // cannot spend.
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: glass.border,
    marginTop: spacing.xl,
  },
  card: { marginTop: spacing.lg, gap: spacing.sm },
  note_p: { ...typography.body, color: colors.textOnDark.primary },
  // The signature. DESIGN.md says Poppins is the only typeface in the app, and
  // this is the one deliberate exception: a name set in the UI face reads as a
  // label, and the whole point of this block is that a person signed it. Snell
  // Roundhand ships with iOS, so it costs no asset. apply-poppins respects an
  // explicit fontFamily, so the global enforcement leaves it alone.
  //
  // The extra skew is small on purpose: Snell already leans, and past a few
  // degrees a script face stops looking written and starts looking sheared.
  sign: {
    // Only the FACE is bespoke. Size comes off the scale and the line box is
    // spacing.xxxl, because Snell's ascenders and descenders run past what a
    // Poppins line-height would leave them and the flourishes would clip.
    // Noteworthy over a copperplate script (Snell, Savoye): those read formal,
    // and the note above is plain and direct. This is a hand, not a flourish,
    // which is the voice the block is actually written in. Bold because the
    // light cut thins out on a dark sheet, same reason Snell needed its bold.
    fontFamily: 'Noteworthy-Bold',
    fontSize: fontScale.title,
    lineHeight: spacing.xxxl,
    color: colors.accentViolet,
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.body, color: colors.textOnDark.primary, flex: 1 },

  plans: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  plan: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.border,
  },
  planOn: { backgroundColor: colors.fill.strong, borderColor: colors.accentViolet },
  planLabel: { ...typography.caption, color: colors.textOnDark.secondary },
  planPrice: { ...typography.title, fontFamily: fonts.medium, color: colors.textOnDark.primary },
  planPer: { ...typography.caption, color: colors.textOnDark.secondary },
  planFoot: { ...typography.caption, color: colors.accentViolet, marginTop: spacing.xs },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    height: spacing.xl,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.accentRose,
    marginBottom: spacing.xs,
  },
  // Holds both cards' prices on one line whether or not a card carries a badge.
  badgeGhost: { height: spacing.xl, marginBottom: spacing.xs },
  badgeText: { ...typography.caption, fontFamily: fonts.medium, color: colors.backgroundBottom },

  // DESIGN.md: the primary CTA carries elevation.glow, the app's one glow, and
  // Begin already does. A view with overflow:'hidden' sets masksToBounds, which
  // clips its own shadow away, so the glow sits on a wrapper and the clipping
  // stays on the child. backgroundColor gives the shadow a shape to cast from.
  ctaGlow: {
    borderRadius: radius.button,
    backgroundColor: colors.primarySolid,
    ...elevation.glow,
  },
  ctaWrap: { borderRadius: radius.button, borderCurve: 'continuous', overflow: 'hidden' },
  cta: { paddingVertical: spacing.lg, alignItems: 'center' },
  ctaText: { ...typography.emphasis, color: colors.textOnDark.primary },
  dim: { opacity: 0.5 },

  note: { ...typography.caption, color: colors.textOnDark.primary, marginTop: spacing.lg, textAlign: 'center' },
  restore: { ...typography.body, color: colors.textOnDark.secondary, marginTop: spacing.xl, textAlign: 'center' },

  fine: { ...typography.tagline, color: colors.textOnDark.tertiary, marginTop: spacing.xxl, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  link: { ...typography.tagline, color: colors.textOnDark.secondary, textDecorationLine: 'underline' },
  linkDot: { ...typography.tagline, color: colors.textOnDark.tertiary },
});
