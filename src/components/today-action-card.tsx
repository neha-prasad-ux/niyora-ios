// The Now tab's single coached action, rendered in the home card language:
// floating tag, gradient field, SemiBold title, whole-card tap. When the ring
// closes the card settles into the calm green done state and stops asking —
// never a second task stacked on a finished day.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import type { TodayAction } from '@/lib/today-action';
import type { RemissionAnswer } from '@/store/remission-log';

// Cosmic violet for the ask (the SOON family from the luteal card), calm green
// once today is done (the same DONE family), so the day visibly settles.
const ASK_GRADIENT: readonly [string, string, string, string] = [
  'rgba(78,72,150,0.52)',
  'rgba(96,84,158,0.52)',
  'rgba(110,96,166,0.5)',
  'rgba(70,88,150,0.5)',
];
const DONE_GRADIENT: readonly [string, string, string, string] = [
  'rgba(64,134,108,0.5)',
  'rgba(86,162,126,0.5)',
  'rgba(92,170,132,0.5)',
  'rgba(58,112,120,0.5)',
];
const GRADIENT_LOCATIONS = [0, 0.42, 0.62, 1] as const;

const REMISSION_OPTIONS: { answer: RemissionAnswer; label: string }[] = [
  { answer: 'yes', label: 'Yes' },
  { answer: 'soft', label: 'Softer' },
  { answer: 'no', label: 'No' },
];

type TodayActionCardProps = {
  action: TodayAction;
  done: boolean;
  onPress: () => void;
  // Rendered as an inline answer row when the action is the remission ask.
  onRemission?: (answer: RemissionAnswer) => void;
};

export function TodayActionCard({ action, done, onPress, onRemission }: TodayActionCardProps) {
  const isRemission = action.id === 'checkin:remission' && onRemission != null;
  const settled = done || action.kind === 'done';

  const title = settled ? 'Done for today' : action.title;
  const caption = settled ? 'See you tomorrow' : action.caption;

  return (
    <View style={styles.wrap}>
      <View style={[styles.tag, settled ? styles.tagDone : styles.tagAsk]}>
        <Text style={styles.tagText}>{settled ? 'Done' : "Today's action"}</Text>
      </View>
      <Pressable
        style={styles.card}
        onPress={settled || isRemission ? undefined : onPress}
        disabled={settled || isRemission}
        accessibilityRole={settled ? 'text' : 'button'}
        accessibilityLabel={`${title}. ${caption}`}
      >
        <LinearGradient
          colors={settled ? DONE_GRADIENT : ASK_GRADIENT}
          locations={GRADIENT_LOCATIONS}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.row}>
          <View style={styles.textCol}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{caption}</Text>
            {isRemission && !settled && (
              <View style={styles.answerRow}>
                {REMISSION_OPTIONS.map((o) => (
                  <Pressable
                    key={o.answer}
                    style={styles.answerPill}
                    onPress={() => onRemission(o.answer)}
                    accessibilityRole="button"
                    accessibilityLabel={`${o.label}`}
                  >
                    <Text style={styles.answerText}>{o.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
          {!settled && !isRemission && (
            <SymbolView
              name="chevron.right"
              tintColor="rgba(255, 255, 255, 0.7)"
              size={15}
              weight="semibold"
              style={styles.chevron}
            />
          )}
          {settled && (
            <SymbolView
              name="checkmark.circle.fill"
              tintColor="rgba(255, 255, 255, 0.75)"
              size={22}
              weight="regular"
              style={styles.chevron}
            />
          )}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    marginLeft: 10,
    marginBottom: -10,
    zIndex: 2,
  },
  tagAsk: { backgroundColor: 'rgba(150, 110, 205, 0.95)' },
  tagDone: { backgroundColor: 'rgba(86, 152, 122, 0.95)' },
  tagText: { fontFamily: 'Poppins-Medium', fontSize: 12, color: '#ffffff', letterSpacing: 0.5 },
  card: {
    minHeight: 104,
    borderRadius: 22,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  textCol: { flex: 1 },
  chevron: { opacity: 0.55, marginRight: -2 },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 23,
    color: '#ffffff',
    letterSpacing: 0.15,
  },
  sub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13.5,
    lineHeight: 19,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.1,
    marginTop: 3,
  },
  answerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  answerPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  answerText: { fontFamily: 'Poppins-Medium', fontSize: 13, color: '#ffffff', letterSpacing: 0.3 },
});
