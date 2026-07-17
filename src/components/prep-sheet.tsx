// The PrepSheet: tapping the preparedness bar on the Now card slides this up
// (not a new screen), reusing the "know why" sheet pattern but tall and
// scrollable. It shows this part of the cycle's prep items as a short path with
// done markers — a *map* of what helps, never a backlog. Tapping an item
// dismisses the sheet and hands off to that screen (the action is never nested
// inside the sheet). See docs/pms/niyora-pms-preparedness-spec.md (v2).

import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import { PILLAR_HUE, type PrepItem, type PrepItemKey } from '@/lib/prep-items';

export function PrepSheet({
  visible,
  phaseLabel,
  band,
  items,
  onClose,
  onSelect,
}: {
  visible: boolean;
  phaseLabel: string;
  band: string;
  items: PrepItem[];
  onClose: () => void;
  onSelect: (key: PrepItemKey) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      >
        <Pressable style={styles.sheet} onPress={() => {}}>
          <LinearGradient
            colors={['#2b2142', '#181226', '#0e0b14']}
            locations={[0, 0.6, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.handle} />

          <Text style={styles.kicker}>{phaseLabel}</Text>
          <View style={styles.headRow}>
            <Text style={styles.title}>Your PMS preparedness</Text>
            <Text style={styles.band} numberOfLines={1}>
              {band}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            What helps, this part of your cycle. Nothing is required.
          </Text>

          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((it) => (
              <Pressable
                key={it.key}
                style={styles.node}
                onPress={() => onSelect(it.key)}
                accessibilityRole="button"
                accessibilityLabel={`${it.title}. ${it.sub}${it.done ? '. Done' : ''}`}
              >
                <View style={[styles.swatch, { backgroundColor: PILLAR_HUE[it.pillar] }]} />
                <View style={styles.textCol}>
                  <Text style={styles.itemTitle}>{it.title}</Text>
                  <Text style={styles.itemSub}>{it.sub}</Text>
                </View>
                {it.done ? (
                  <View style={[styles.check, { backgroundColor: PILLAR_HUE[it.pillar] }]}>
                    <SymbolView name="checkmark" tintColor="#ffffff" size={12} weight="bold" />
                  </View>
                ) : (
                  <SymbolView
                    name="chevron.right"
                    tintColor="rgba(255,255,255,0.4)"
                    size={14}
                    weight="regular"
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: 34,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 18,
    alignSelf: 'center',
  },
  kicker: {
    fontFamily: 'Poppins-Medium',
    fontSize: 12.5,
    color: colors.textTagline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 10,
    marginTop: 6,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 19,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  band: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    color: '#ffffff',
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  subtitle: {
    fontFamily: 'Poppins-Light',
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 8,
  },
  list: { marginTop: 16 },
  listContent: { gap: 12, paddingBottom: 4 },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 14,
  },
  swatch: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  textCol: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontFamily: 'Poppins-Medium',
    fontSize: 15.5,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  itemSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12.5,
    lineHeight: 17,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: 2,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
