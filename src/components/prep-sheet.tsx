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
import { fonts } from '@/theme/fonts';
import { fontScale } from '@/theme/typography';
import { radius, spacing } from '@/theme/spacing';
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
                    <SymbolView name="checkmark" tintColor={colors.textOnDark.primary} size={12} weight="bold" />
                  </View>
                ) : (
                  <SymbolView
                    name="chevron.right"
                    tintColor={colors.textOnDark.faint}
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
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.backgroundTop,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
    overflow: 'hidden',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: spacing.lg,
    alignSelf: 'center',
  },
  kicker: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    color: colors.textTagline,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: fontScale.title,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  band: {
    fontFamily: fonts.semibold,
    fontSize: fontScale.body,
    color: colors.textOnDark.primary,
    letterSpacing: 0.3,
    flexShrink: 0,
  },
  subtitle: {
    fontFamily: fonts.light,
    fontSize: fontScale.body,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: spacing.sm,
  },
  list: { marginTop: spacing.lg },
  listContent: { gap: spacing.md, paddingBottom: spacing.xs },
  node: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.fill.faint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.faint,
    borderRadius: radius.button,
    borderCurve: 'continuous',
    padding: spacing.md,
  },
  swatch: { width: 4, alignSelf: 'stretch', borderRadius: 3 },
  textCol: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  itemSub: {
    fontFamily: fonts.regular,
    fontSize: fontScale.caption,
    lineHeight: 17,
    color: colors.textSubtitle,
    letterSpacing: 0.1,
    marginTop: spacing.xs,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
