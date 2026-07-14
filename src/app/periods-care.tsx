// The Periods-care checklist: soothing things for the heavy days, opened from
// the Grow tab. A gentle list, not a program — tick what you've done today and
// it holds until tomorrow. Ticking earns no light (the period is the rest
// phase); it just lets the list remember. Rows that map to a real activity are
// tappable: they open the full guided activity (which does earn light, like any
// activity), so "legs up the wall" et al. can actually be visited, not just
// checked. The plain comforts (heat pad, water, an early night) are ticks only.
// Copy is the neutrally-warm voice per DESIGN.md (no em dashes, no mantras).

import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { getActivity } from '@/models/activities';
import { todayYmd } from '@/store/pms-readiness';
import { getPeriodsCare, togglePeriodsCare } from '@/store/periods-care';

type CareItem = {
  id: string;
  label: string;
  examples: string;
  // When set (and the id resolves in models/activities), the row opens that
  // guided activity so she can see how to do it.
  activityId?: string;
};

// Curated for the period itself: warmth, rest, and the low-effort soothers.
// Most map to a real activity (visitable); the plain comforts do not.
const PERIOD_CARE: readonly CareItem[] = [
  { id: 'heat-on-belly', label: 'Warmth on your belly', examples: 'A heat pad or a bottle eases the cramp.' },
  { id: 'legs-up-the-wall', label: 'Legs up the wall', examples: 'Calm without any effort.', activityId: 'legs-up-the-wall' },
  { id: 'warm-drink', label: 'Make something warm to drink', examples: 'Warmth your body reads as safe.', activityId: 'make-something-warm' },
  { id: 'warm-to-eat', label: 'Eat something warm', examples: 'Steady energy instead of a crash.', activityId: 'warm-to-eat' },
  { id: 'childs-pose', label: "Curl into child's pose", examples: 'Eases your back and your belly.', activityId: 'childs-pose' },
  { id: 'slow-walk', label: 'A slow walk outside', examples: 'Lets the tension burn off.', activityId: 'slow-walk' },
  { id: 'water', label: 'Keep water close', examples: 'Hydration takes the edge off cramps and fog.' },
  { id: 'gentle-read', label: 'Read something comforting', examples: 'Somewhere soft to land.', activityId: 'gentle-read' },
  { id: 'early-night', label: 'Take the early night', examples: 'Sleep does a lot of the repair.' },
  { id: 'pull-back', label: 'Hide out for a bit', examples: 'Permission to pull back.', activityId: 'cave-mode' },
];

export default function PeriodsCareScreen() {
  const today = useMemo(() => todayYmd(), []);
  const [done, setDone] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getPeriodsCare(today)
        .then((ids) => alive && setDone(ids))
        .catch(() => {});
      return () => {
        alive = false;
      };
    }, [today]),
  );

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    // Optimistic flip so the tick feels instant; the store is the source of truth.
    setDone((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    togglePeriodsCare(today, id)
      .then(setDone)
      .catch(() => {});
  };

  const open = (activityId: string) => {
    Haptics.selectionAsync().catch(() => {});
    router.push({ pathname: '/activity', params: { id: activityId } });
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    router.back();
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <View style={styles.head}>
          <Text style={styles.header}>Period care</Text>
          <Text style={styles.subhead}>Small, soothing things for the heavy days. Tick what helps, tap to see how.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.list}>
            {PERIOD_CARE.map((item) => (
              <CareRow
                key={item.id}
                item={item}
                checked={done.includes(item.id)}
                onToggle={() => toggle(item.id)}
                onOpen={() => open(item.activityId as string)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function CareRow({
  item,
  checked,
  onToggle,
  onOpen,
}: {
  item: CareItem;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  // Only offer to open when the id actually resolves to an activity, so a wrong
  // id degrades to a plain tick rather than a dead tap.
  const canOpen = item.activityId != null && getActivity(item.activityId) != null;
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${item.label}, mark done`}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked && <SymbolView name="checkmark" tintColor="#3a2d52" size={13} weight="bold" />}
        </View>
      </Pressable>
      <Pressable
        style={styles.text}
        onPress={canOpen ? onOpen : onToggle}
        accessibilityRole={canOpen ? 'button' : 'checkbox'}
        accessibilityState={canOpen ? undefined : { checked }}
        accessibilityLabel={canOpen ? `${item.label}. ${item.examples}. See how.` : `${item.label}. ${item.examples}`}
      >
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.examples}>{item.examples}</Text>
      </Pressable>
      {canOpen && (
        <SymbolView name="chevron.right" tintColor="rgba(255, 255, 255, 0.4)" size={14} weight="regular" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundBottom },
  safe: { flex: 1, paddingHorizontal: 24 },
  topBar: { height: 32, justifyContent: 'center' },
  head: { alignItems: 'center', paddingTop: 6, paddingBottom: 8 },
  header: {
    fontFamily: 'Poppins-Medium',
    fontSize: 23,
    lineHeight: 31,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
  },
  subhead: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 8,
  },
  scroll: { paddingTop: 16, paddingBottom: 28 },
  list: { alignSelf: 'stretch', gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { borderColor: '#ffffff', backgroundColor: '#ffffff' },
  text: { flex: 1 },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16.5,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  examples: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 0.2,
    marginTop: 2,
  },
});
