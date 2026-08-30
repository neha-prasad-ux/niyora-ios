// The review pass before her record leaves the phone. Nothing exports unseen:
// she reads every line, drops what she does not want, and adds the questions she
// wants to ask. Reached from My Soul.
//
// Two things this screen owes her:
//   1. She decides, entry by entry. An earlier pass asked "who is this for?" and
//      defaulted the sensitive entries from the answer. That inferred a choice
//      she is already making by hand on this screen, and made her categorise a
//      relationship before reading a word. The crisis scan still MARKS an entry
//      so she can see it at a glance, it just no longer decides for her.
//   2. Leaving an entry out removes it from the COUNTS too, not just the quotes.
//      buildTherapistExport applies `exclude` before anything is tallied, so the
//      denominators always describe the document she is actually sending.

import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';

import { BackgroundGradient } from '@/components/background-gradient';
import { BeginButton } from '@/components/begin-button';
import { loadTherapistExport } from '@/lib/therapist-export';
import { summarise } from '@/lib/therapist-export-summary';
import { renderTherapistExportHtml } from '@/lib/therapist-export-html';
import { renderTherapistExport } from '@/lib/therapist-export-text';
import type { TherapistExport } from '@/lib/therapist-export-types';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { moon } from '@/theme/typography';

const PHASE_LABEL = { build: 'build days', pms: 'PMS days', period: 'period days' } as const;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A one-day export reads "2026-08-30 to 2026-08-30 · 0 cycles" otherwise.
const span = (p: TherapistExport['provenance']) =>
  (p.from === p.to ? p.from : `${p.from} to ${p.to}`) +
  (p.cyclesCovered > 0 ? ` · ${plural(p.cyclesCovered, 'cycle')}` : '');

export default function TherapistExportScreen() {
  const [doc, setDoc] = useState<TherapistExport | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Everything she wrote goes unless she says otherwise. It is her record, and
  // she is reading it line by line before it moves.
  const [excludedSet, setExcludedSet] = useState<Record<string, true>>({});
  const [questions, setQuestions] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadTherapistExport()
        .then((d) => {
          if (!alive) return;
          setDoc(d);
          setLoaded(true);
        })
        .catch(() => {
          if (alive) setLoaded(true);
        });
      return () => {
        alive = false;
      };
    }, []),
  );

  const excluded = useMemo(() => Object.keys(excludedSet), [excludedSet]);

  const triedFor = useCallback(
    (at: string) => doc?.tried.find((t) => t.at === at) ?? null,
    [doc],
  );

  const toggle = (at: string, include: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    setExcludedSet(({ [at]: _dropped, ...rest }) =>
      include ? rest : { ...rest, [at]: true },
    );
  };

  const addQuestion = () => {
    const q = draft.trim();
    if (!q) return;
    Haptics.selectionAsync().catch(() => {});
    setQuestions((list) => [...list, q]);
    setDraft('');
  };

  const onShare = async () => {
    Haptics.selectionAsync().catch(() => {});
    // Rebuild from the store with her choices applied, so the shared document is
    // recounted, never the full model with quotes filtered out afterwards.
    const finalDoc = await loadTherapistExport({ exclude: excluded, questions }).catch(
      () => null,
    );
    if (!finalDoc) return;
    // A PDF, not a wall of text in a message body. printToFileAsync renders the
    // same document a clinician would print, and the share sheet then offers
    // Files, Mail and AirDrop with a real attachment.
    //
    // Falling back to text if the render fails is not belt-and-braces: printing
    // can fail on a full disk, and a woman on her way to an appointment should
    // still leave with her record rather than a dead button.
    try {
      const { uri } = await Print.printToFileAsync({
        html: renderTherapistExportHtml(finalDoc),
      });
      await Share.share({ url: uri });
    } catch {
      await Share.share({ message: renderTherapistExport(finalDoc) }).catch(() => {});
    }
  };

  const p = doc?.provenance;
  // Everything the card says is derived from the entries still switched on, so
  // the numbers describe the document she is actually sending, not the store.
  const shown = useMemo(
    () => (doc?.excerpts ?? []).filter((e) => !excludedSet[e.at]),
    [doc, excludedSet],
  );
  const pattern = useMemo(() => summarise(shown), [shown]);

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close">
            <Text style={styles.close}>Close</Text>
          </Pressable>
          <Text style={styles.headerTitle}>For your appointment</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loaded && doc == null ? (
            <Text style={styles.empty}>
              Nothing to send yet. This fills up as you write moments.
            </Text>
          ) : doc != null && p != null ? (
            <>
              <View style={styles.summary}>
                <Text style={styles.summaryLine}>{span(p)}</Text>
                <Text style={styles.summaryLine}>
                  {plural(shown.length, 'entry', 'entries')} on {plural(p.daysLogged, 'day')}
                </Text>
                {pattern ? <Text style={styles.summaryQuiet}>{pattern}</Text> : null}
              </View>

              <Text style={styles.sectionTitle}>Your words</Text>
              <Text style={styles.hint}>
                {shown.length} of {doc.excerpts.length} · tap one to leave it out
              </Text>
              {doc.excerpts.map((e) => {
                const on = !excludedSet[e.at];
                const tried = triedFor(e.at);
                return (
                  <Pressable
                    key={e.at}
                    onPress={() => toggle(e.at, !on)}
                    style={[styles.entry, !on && styles.entryOff]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${e.date}, ${e.feeling}`}>
                    <Text style={styles.entryMeta}>
                      {e.date}
                      {e.phase ? ` · ${PHASE_LABEL[e.phase]}` : ''}
                      {e.source === 'predicted' ? ' (est.)' : ''} · {e.feeling}
                      {e.crisis ? ' · sensitive' : ''}
                    </Text>
                    <Text style={styles.entryText}>{e.text}</Text>
                    {tried ? <Text style={styles.triedText}>Tried: {tried.text}</Text> : null}
                  </Pressable>
                );
              })}

              <Text style={styles.sectionTitle}>Questions to ask</Text>
              {questions.map((q, i) => (
                <Pressable
                  key={`${q}-${i}`}
                  onPress={() => setQuestions((list) => list.filter((_, n) => n !== i))}
                  style={styles.question}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove question: ${q}`}>
                  <Text style={styles.questionText}>
                    {i + 1}. {q}
                  </Text>
                </Pressable>
              ))}
              <View style={styles.askRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={addQuestion}
                  returnKeyType="done"
                  placeholder="Add a question"
                  placeholderTextColor={colors.textOnDark.placeholder}
                  style={styles.input}
                  accessibilityLabel="Add a question for your appointment"
                />
                <Pressable
                  onPress={addQuestion}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Add question">
                  <Text style={styles.add}>Add</Text>
                </Pressable>
              </View>
            </>
          ) : null}
        </ScrollView>

        {doc != null && (
          <View style={styles.footer}>
            <BeginButton fullWidth label="Download Report" onPress={onShare} />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  headerSpacer: { width: 48 },
  close: { ...moon.body, color: colors.textOnDark.tertiary, width: 48 },
  headerTitle: { ...moon.bodyStrong, color: colors.textPrimary },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  sectionTitle: { ...moon.title, color: colors.textPrimary, marginTop: spacing.lg },
  hint: { ...moon.caption, color: colors.textOnDark.tertiary, marginBottom: spacing.xs },
  summary: {
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.faint,
    gap: spacing.xs,
  },
  summaryLine: { ...moon.body, color: colors.textOnDark.primary },
  summaryQuiet: { ...moon.caption, color: colors.textOnDark.tertiary },
  entry: {
    padding: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.faint,
    gap: spacing.xs,
  },
  // Left out: still readable, visibly not going. Never hidden, she has to be
  // able to see what she is dropping and put it back.
  entryOff: { opacity: 0.35, borderColor: colors.border.faint },
  entryMeta: { ...moon.caption, color: colors.textOnDark.tertiary },
  entryText: { ...moon.body, color: colors.textOnDark.primary },
  triedText: { ...moon.caption, color: colors.textOnDark.secondary },
  question: { paddingVertical: spacing.sm },
  questionText: { ...moon.body, color: colors.textOnDark.primary },
  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...moon.body,
    color: colors.textOnDark.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.control,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.faint,
  },
  add: { ...moon.bodyStrong, color: colors.textPrimary },
  empty: {
    ...moon.body,
    color: colors.textOnDark.secondary,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
