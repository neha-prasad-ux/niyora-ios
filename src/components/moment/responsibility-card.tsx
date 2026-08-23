// The responsibility card (Neha 2026-08-20). An INPUT card, not a read.
//
// Why it is not a read. The technique is the responsibility pie: before she may
// assign herself a share of an outcome, every other hand on it gets counted
// first, and whatever is left at the end is hers. It only works if SHE does the
// counting. Being told "it was not all you" changes nothing, because she has
// already heard that from everyone who loves her.
//
// Why the model cannot write the hands. Tested 2026-08-20 against three real
// entries. Asked for the other contributing forces it returned "it was morning",
// "a marriage is made by two people" and "it is also ended by two people", or it
// returned nothing at all. That is not a prompt problem. The model has one
// sentence and genuinely does not know the deadline moved, that nobody told her,
// or that she had been covering for someone for four months. A padded list makes
// the whole exercise look like a trick to get her off the hook, which costs the
// card her trust in the one moment it needs it. So the model names only the
// outcome and her own part, which ARE in her words, and she supplies the rest.
//
// The allocation order is the mechanism, not a UI detail. Hers is never editable
// directly: it is the remainder. She arrives at her share instead of being handed
// one, and that is the entire intervention.

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { moon } from '@/theme/typography';

export const RESPONSIBILITY_COPY = {
  addTitle: 'What other factors were involved here?',
  addWhy: 'Now list everything else that contributed and add a score to it.',
  // The outcome is context for the question, not a headline. It used to sit at
  // the top in the voice size, which made her worst moment the loudest thing on
  // the card (matching the scale card fix, Neha 2026-08-21).
  about: 'The outcome',
  // Authored, never generated: a hint list from the model would be the same
  // invented-fact problem in a quieter place.
  //
  // Widened 2026-08-21 (Neha). It used to read "A decision someone else made,
  // something you were not told", so every cue was a PERSON or a piece of
  // INFORMATION. Nothing in it would ever prompt "I had no internet then" or "I
  // had no money of my own", and for why something ended those conditions are
  // usually the heaviest hands on it. A woman looking at a blank field takes the
  // shape of the hint literally, so the hint has to cover conditions too.
  //
  // Landed 2026-08-21 on categories rather than a question. Every question form
  // ("what was not in your control", "what made it harder") asks her to COMPOSE an
  // answer from a blank field about a hard subject, and to judge whether a thing
  // qualifies before she is allowed to write it. Four nouns ask her only to
  // pattern-match against her own life, which is a far shorter route: Neha reached
  // "I had no economic freedom" by thinking hard, not because anything prompted
  // her, and "money" would have got her there in a second.
  //
  // The "etc" is load-bearing. Four categories alone would cap the range and quietly
  // exclude the fifth thing, which is usually what she did not know at the time.
  placeholder: 'Money, time, people, timing, etc',
  add: 'Add',
  // "push" was wrong once the field started cueing money and timing (2026-08-21):
  // a condition does not push an outcome, its absence removes the ground under it.
  // "Score" also matches the word the previous screen already used.
  allocTitle: 'Give each a score',
  allocWhy: 'Give each a size. What is left over is yours.',
  yours: 'Left for you',
  done: 'Done',
  remove: 'Remove',
  next: 'Continue',
  skip: 'Nothing else played a part',
} as const;

/**
 * What we say under her share. It states what happened and stops.
 *
 * At 100 she has given nothing away, and a line nudging her to share it out
 * would be the app arguing with the answer it just asked her for. Same rule as
 * the scale card at 100: name it, do not press it.
 */
export function responsibilityResult(herShare: number): string {
  if (herShare >= 100) return 'You have put all of it on yourself.';
  if (herShare <= 0) return 'You have put none of it on yourself.';
  return `You started with all of it. You are at ${herShare}.`;
}

const STEP = 10;

/** Sentence case, defensively (2026-08-21). The prompt asks for it and the model
 *  still drifts to lowercase, and this string is rendered as her own sentence.
 *  Cheaper to guarantee here than to keep re-asking the model. */
export function sentenceCase(t: string): string {
  const s = (t ?? '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export type ResponsibilityResult = {
  hands: { label: string; share: number }[];
  herShare: number;
};

export function ResponsibilityCard({
  outcome,
  hers,
  onDone,
  onSkip,
}: {
  /** The thing she holds herself responsible for, from her own words. */
  outcome: string;
  /** Her genuine part, named honestly. Shown, never allocated by her. */
  hers: string;
  onDone: (r: ResponsibilityResult) => void;
  onSkip: () => void;
}) {
  const [hands, setHands] = useState<{ label: string; share: number }[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<'add' | 'allocate'>('add');

  const used = hands.reduce((n, h) => n + h.share, 0);
  const herShare = Math.max(0, 100 - used);

  const removeHand = (i: number) =>
    setHands((h) => h.filter((_, n) => n !== i));

  const addHand = () => {
    const label = draft.trim();
    if (!label) return;
    setHands((h) => [...h, { label, share: 0 }]);
    setDraft('');
  };

  const bump = (i: number, dir: 1 | -1) => {
    setHands((h) =>
      h.map((x, n) => {
        if (n !== i) return x;
        const next = x.share + dir * STEP;
        // Never let the hands sum past 100: her share is the remainder and a
        // negative remainder would read as her being owed responsibility.
        if (next < 0 || next > x.share + herShare) return x;
        return { ...x, share: next };
      }),
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {phase === 'add' ? RESPONSIBILITY_COPY.addTitle : RESPONSIBILITY_COPY.allocTitle}
      </Text>
      <View style={styles.about}>
        <Text style={styles.aboutLabel}>{RESPONSIBILITY_COPY.about}</Text>
        <Text style={styles.outcome}>{sentenceCase(outcome)}</Text>
      </View>
      <View style={styles.divider} />

      {phase === 'add' ? (
        <>
          <Text style={styles.why}>{RESPONSIBILITY_COPY.addWhy}</Text>

          {hands.map((h, i) => (
            <View key={`${i}-${h.label}`} style={styles.row}>
              <Text style={styles.rowLabel}>{h.label}</Text>
              <Pressable
                onPress={() => removeHand(i)}
                accessibilityRole="button"
                accessibilityLabel={`${RESPONSIBILITY_COPY.remove} ${h.label}`}
                hitSlop={10}
                style={styles.removeBtn}
              >
                <Text style={styles.removeGlyph}>{'\u00d7'}</Text>
              </Pressable>
            </View>
          ))}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={RESPONSIBILITY_COPY.placeholder}
              placeholderTextColor={colors.textOnDark.tertiary}
              onSubmitEditing={addHand}
              returnKeyType="done"
              accessibilityLabel={RESPONSIBILITY_COPY.addTitle}
            />
            <Pressable
              onPress={addHand}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={[styles.addBtn, !draft.trim() && styles.addBtnOff]}
            >
              <Text style={styles.addBtnText}>{RESPONSIBILITY_COPY.add}</Text>
            </Pressable>
          </View>

          {/* The button used to read "Nothing else played a part" whenever no hand
              was COMMITTED, which meant it said that while she was halfway through
              typing one, and tapping it threw her sentence away and skipped the
              card (Neha, on device 2026-08-21). It now reads what is in the field
              too, and commits it on the way through, so her words cannot be lost
              by pressing the only button on screen. */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() => {
                const pending = draft.trim();
                if (pending) {
                  setHands((h) => [...h, { label: pending, share: 0 }]);
                  setDraft('');
                  setPhase('allocate');
                  return;
                }
                if (hands.length) setPhase('allocate');
                else onSkip();
              }}
              accessibilityRole="button"
              style={styles.secondary}
            >
              <Text style={styles.secondaryText}>
                {hands.length || draft.trim()
                  ? RESPONSIBILITY_COPY.next
                  : RESPONSIBILITY_COPY.skip}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.why}>{RESPONSIBILITY_COPY.allocWhy}</Text>

          {hands.map((h, i) => (
            <View key={`${i}-${h.label}`} style={styles.allocRow}>
              <View style={styles.allocLeft}>
                <View style={styles.allocLabelRow}>
                  <Text style={styles.rowLabel}>{h.label}</Text>
                  <Pressable
                    onPress={() => removeHand(i)}
                    accessibilityRole="button"
                    accessibilityLabel={`${RESPONSIBILITY_COPY.remove} ${h.label}`}
                    hitSlop={10}
                  >
                    <Text style={styles.removeGlyph}>{'\u00d7'}</Text>
                  </Pressable>
                </View>
                <View style={styles.barTrack}>
                  <View style={[styles.bar, { flex: Math.max(h.share, 0) }]} />
                  <View style={{ flex: Math.max(100 - h.share, 0) }} />
                </View>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => bump(i, -1)}
                  accessibilityRole="button"
                  accessibilityLabel={`Less for ${h.label}`}
                  style={styles.step}
                >
                  <Text style={styles.stepText}>{'−'}</Text>
                </Pressable>
                <Text style={styles.share}>{h.share}</Text>
                <Pressable
                  onPress={() => bump(i, 1)}
                  accessibilityRole="button"
                  accessibilityLabel={`More for ${h.label}`}
                  style={styles.step}
                >
                  <Text style={styles.stepText}>{'+'}</Text>
                </Pressable>
              </View>
            </View>
          ))}

          {/* Her share, always last and never editable: it is what is left. */}
          <View style={styles.divider} />
          <View style={styles.hersBlock}>
            <Text style={styles.hersLabel}>{RESPONSIBILITY_COPY.yours}</Text>
            <Text style={styles.hersShare}>{herShare}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.bar, styles.barHers, { flex: Math.max(herShare, 0) }]} />
              <View style={{ flex: Math.max(100 - herShare, 0) }} />
            </View>
            {hers ? <Text style={styles.hersWhat}>{sentenceCase(hers)}</Text> : null}
            <Text style={styles.result}>{responsibilityResult(herShare)}</Text>
          </View>

          <View style={styles.ctaRow}>
          <Pressable
            onPress={() => onDone({ hands, herShare })}
            accessibilityRole="button"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>{RESPONSIBILITY_COPY.done}</Text>
          </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { ...moon.title, color: colors.textOnDark.primary },
  // The outcome is context, not the headline: it is her worst moment and it does
  // not get to be the loudest thing on the card.
  about: { gap: 2 },
  aboutLabel: {
    ...moon.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.4,
  },
  outcome: { ...moon.body, color: colors.textOnDark.secondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.fill.strong },
  why: { ...moon.body, color: colors.textOnDark.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeBtn: { paddingHorizontal: spacing.xs },
  removeGlyph: { ...moon.body, color: colors.textOnDark.tertiary },
  allocLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { ...moon.body, color: colors.textOnDark.primary, flex: 1 },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    ...moon.body,
    flex: 1,
    color: colors.textOnDark.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
    paddingVertical: spacing.sm,
  },
  addBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  addBtnOff: { opacity: 0.4 },
  addBtnText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
  allocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.faint,
  },
  allocLeft: { flex: 1, gap: spacing.sm },
  // The pie, unrolled. A flex-width bar per hand, so the share she is giving away
  // is visible as length and not only as a number she has to add up herself.
  barTrack: { flexDirection: 'row', height: 4, borderRadius: radius.pill, overflow: 'hidden',
    backgroundColor: colors.fill.base },
  bar: { backgroundColor: colors.fill.active },
  barHers: { backgroundColor: colors.textOnDark.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  stepText: { ...moon.voice, color: colors.textOnDark.primary },
  share: { ...moon.bodyStrong, color: colors.textOnDark.primary, minWidth: 34, textAlign: 'center' },
  // Her share, centred and last, because it is the number she arrived at rather
  // than one she was handed.
  hersBlock: { gap: spacing.sm, alignItems: 'center' },
  hersLabel: {
    ...moon.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.6,
  },
  hersShare: {
    ...moon.celebrate,
    color: colors.textOnDark.primary,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  hersWhat: { ...moon.caption, color: colors.textOnDark.secondary, textAlign: 'center' },
  result: { ...moon.body, color: colors.textOnDark.primary, textAlign: 'center' },
  ctaRow: { alignItems: 'center', marginTop: spacing.sm },
  // Secondary, the same outlined chip as the scale card and the rest of the flow.
  secondary: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  secondaryText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
});
