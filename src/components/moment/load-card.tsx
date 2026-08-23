// The load card (Neha 2026-08-21). For the moment with no moment in it.
//
// "Everything is too much today" meets no lens precondition in the whole set:
// no event, no person, no absolute, no prediction, nothing to re-see. Every
// reading card handed it produced her own sentence back ("it is a heavy day"),
// and it measured the worst output in the scenario run. That was not a prompt
// problem. There was genuinely nothing there to reframe.
//
// So this card does not reframe. Overwhelm is usually not one heavy thing, it is
// eleven small ones that have stopped being separate. The move is to make them
// separate again: she writes them down, then sorts them, and some of them leave.
// The fog becomes a list, and a list can be put down.
//
// The model writes NOTHING here, for the same reason it writes nothing on the
// responsibility card: it cannot know what is on her plate, and a guessed list
// would be an invented fact about her life in the one place she is least able to
// argue with it.
//
// No reframe, no comfort, no verdict at the end. Just the count and where things
// landed, then out to Respond, where "take something off my plate" is waiting.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { ThinkingDots } from '@/components/moment/controls';

import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { moon } from '@/theme/typography';

export type LoadBucket = 'today' | 'wait' | 'notMine';

export const LOAD_COPY = {
  addTitle: 'What is actually on you right now?',
  addWhy: 'One line each. Big or small, it all counts.',
  placeholder: 'The thing you keep remembering',
  add: 'Add',
  next: 'Continue',
  sortTitle: 'Which of these are really yours today?',
  sortWhy: 'Tap each one.',
  today: 'Today',
  wait: 'Can wait',
  notMine: 'Not mine',
  done: 'Done',
  // Deliberately not "here is what I noticed". The finding belongs to her list,
  // not to us.
  readsHead: 'What your list shows',
} as const;

/**
 * What we say once she has sorted. Counts only, no comfort and no conclusion:
 * the intervention already happened when the fog became a list, and a closing
 * reassurance would take the finding off her.
 */
export function loadResult(counts: Record<LoadBucket, number>): string {
  const total = counts.today + counts.wait + counts.notMine;
  if (total === 0) return '';
  const parts = [`${total} ${total === 1 ? 'thing' : 'things'}.`];
  if (counts.today) parts.push(`${counts.today} for today.`);
  if (counts.wait) parts.push(`${counts.wait} can wait.`);
  if (counts.notMine) parts.push(`${counts.notMine} not yours to carry.`);
  return parts.join(' ');
}

export function LoadCard({
  onDone,
  onSorted,
  reads,
  readsLoading,
}: {
  onDone: (items: { text: string; bucket: LoadBucket | null }[]) => void;
  /** Fired once, when every item has a bucket. The parent fetches the read-back:
   *  the model finally has content to work on, and reading her own list back
   *  structurally is the one thing she cannot do from inside a pile of eleven
   *  things. See reflect_load_read. */
  onSorted?: (items: { text: string; bucket: LoadBucket }[]) => void;
  /** What her list shows. Empty is a legitimate answer and renders nothing. */
  reads?: string[];
  readsLoading?: boolean;
}) {
  const [items, setItems] = useState<{ text: string; bucket: LoadBucket | null }[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<'add' | 'sort'>('add');

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setItems((x) => [...x, { text, bucket: null }]);
    setDraft('');
  };

  const cycle = (i: number) =>
    setItems((x) =>
      x.map((it, n) => {
        if (n !== i) return it;
        const order: LoadBucket[] = ['today', 'wait', 'notMine'];
        const at = it.bucket ? order.indexOf(it.bucket) : -1;
        return { ...it, bucket: order[(at + 1) % order.length] };
      }),
    );

  const counts = items.reduce(
    (acc, it) => {
      if (it.bucket) acc[it.bucket] += 1;
      return acc;
    },
    { today: 0, wait: 0, notMine: 0 } as Record<LoadBucket, number>,
  );
  const sorted = items.length > 0 && items.every((it) => it.bucket);
  // Ask once per completed sort, never on every re-render or every extra tap.
  const asked = useRef(false);
  useEffect(() => {
    if (!sorted || asked.current || !onSorted) return;
    asked.current = true;
    onSorted(items as { text: string; bucket: LoadBucket }[]);
  }, [sorted, items, onSorted]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>
        {phase === 'add' ? LOAD_COPY.addTitle : LOAD_COPY.sortTitle}
      </Text>
      <Text style={styles.why}>{phase === 'add' ? LOAD_COPY.addWhy : LOAD_COPY.sortWhy}</Text>
      <View style={styles.divider} />

      {items.map((it, i) =>
        phase === 'add' ? (
          <View key={`${i}-${it.text}`} style={styles.row}>
            <Text style={styles.rowLabel}>{it.text}</Text>
            <Pressable
              onPress={() => setItems((x) => x.filter((_, n) => n !== i))}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${it.text}`}
              hitSlop={10}
            >
              <Text style={styles.removeGlyph}>{'×'}</Text>
            </Pressable>
          </View>
        ) : (
          // One tap cycles the bucket. Three separate buttons per row would be
          // nine targets on a screen she opened because everything is too much.
          <Pressable
            key={`${i}-${it.text}`}
            onPress={() => cycle(i)}
            accessibilityRole="button"
            accessibilityLabel={`${it.text}. ${it.bucket ? LOAD_COPY[it.bucket] : 'Not sorted'}. Tap to change`}
            style={styles.row}
          >
            <Text style={styles.rowLabel}>{it.text}</Text>
            <View style={[styles.bucket, it.bucket === 'today' && styles.bucketToday]}>
              <Text style={[styles.bucketText, it.bucket === 'today' && styles.bucketTextOn]}>
                {it.bucket ? LOAD_COPY[it.bucket] : LOAD_COPY.today}
              </Text>
            </View>
          </Pressable>
        ),
      )}

      {phase === 'add' ? (
        <>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={LOAD_COPY.placeholder}
              placeholderTextColor={colors.textOnDark.placeholder}
              onSubmitEditing={add}
              returnKeyType="next"
              accessibilityLabel={LOAD_COPY.addTitle}
            />
            <Pressable
              onPress={add}
              disabled={!draft.trim()}
              accessibilityRole="button"
              style={!draft.trim() && styles.addOff}
            >
              <Text style={styles.addText}>{LOAD_COPY.add}</Text>
            </Pressable>
          </View>
          {items.length || draft.trim() ? (
            <View style={styles.ctaRow}>
              <Pressable
                onPress={() => {
                  const pending = draft.trim();
                  if (pending) {
                    setItems((x) => [...x, { text: pending, bucket: null }]);
                    setDraft('');
                  }
                  setPhase('sort');
                }}
                accessibilityRole="button"
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>{LOAD_COPY.next}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : (
        <>
          {sorted ? (
            <>
              <View style={styles.divider} />
              <Text style={styles.result}>{loadResult(counts)}</Text>
              {readsLoading ? (
                <View style={styles.readsWrap}>
                  <ThinkingDots />
                </View>
              ) : reads?.length ? (
                <View style={styles.readsWrap}>
                  <Text style={styles.readsHead}>{LOAD_COPY.readsHead}</Text>
                  {reads.map((r, i) => (
                    <Text key={`${i}-${r}`} style={styles.readLine}>
                      {r}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
          <View style={styles.ctaRow}>
            <Pressable onPress={() => onDone(items)} accessibilityRole="button" style={styles.secondary}>
              <Text style={styles.secondaryText}>{LOAD_COPY.done}</Text>
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
  why: { ...moon.body, color: colors.textOnDark.secondary },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowLabel: { ...moon.body, color: colors.textOnDark.primary, flex: 1 },
  removeGlyph: { ...moon.body, color: colors.textOnDark.tertiary },
  bucket: {
    borderRadius: radius.pill,
    paddingVertical: 2,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  bucketToday: { backgroundColor: colors.fill.active, borderColor: 'transparent' },
  bucketText: { ...moon.caption, color: colors.textOnDark.tertiary },
  bucketTextOn: { color: colors.textOnDark.primary },
  inputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    ...moon.body,
    flex: 1,
    color: colors.textOnDark.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.strong,
    paddingVertical: spacing.sm,
  },
  addOff: { opacity: 0.4 },
  addText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
  result: { ...moon.body, color: colors.textOnDark.primary, textAlign: 'center' },
  readsWrap: { gap: spacing.sm, marginTop: spacing.sm },
  readsHead: {
    ...moon.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  readLine: { ...moon.body, color: colors.textOnDark.primary, textAlign: 'center' },
  ctaRow: { alignItems: 'center', marginTop: spacing.sm },
  secondary: {
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.strong,
  },
  secondaryText: { ...moon.bodyStrong, color: colors.textOnDark.primary },
});
