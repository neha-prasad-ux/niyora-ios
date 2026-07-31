// One shared checklist UI: a column of tappable rows, each a translucent card
// with a checkbox and a label (and optional examples). Ported from v2-pms for
// the readiness page.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import { fontScale } from '@/theme/typography';
import { fonts } from '@/theme/fonts';
import { spacing, radius } from '@/theme/spacing';

export type ChecklistItem = { id: string; label: string; examples?: string };

export function Checklist({
  items,
  isChecked,
  onToggle,
  emphasizeTitle = false,
}: {
  items: readonly ChecklistItem[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
  // When true, titles carry more weight (Poppins-Medium) for stronger hierarchy
  // against the muted examples. Defaults off so existing callers are unchanged.
  emphasizeTitle?: boolean;
}) {
  return (
    <View style={styles.list}>
      {items.map((it) => {
        const on = isChecked(it.id);
        return (
          <Pressable
            key={it.id}
            onPress={() => onToggle(it.id)}
            style={styles.row}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={it.examples ? `${it.label}. ${it.examples}` : it.label}
          >
            <View style={[styles.box, on && styles.boxOn]}>
              {on && <SymbolView name="checkmark" tintColor="#3a2d52" size={13} weight="bold" />}
            </View>
            <View style={styles.text}>
              <Text style={[styles.label, emphasizeTitle && styles.labelStrong]}>{it.label}</Text>
              {it.examples ? <Text style={styles.examples}>{it.examples}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.button,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.base,
    backgroundColor: colors.fill.faint,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: {
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  labelStrong: {
    fontFamily: fonts.medium,
    fontSize: fontScale.emphasis,
  },
  examples: {
    fontFamily: fonts.light,
    fontSize: fontScale.caption,
    color: colors.textOnDark.tertiary,
    letterSpacing: 0.2,
    marginTop: spacing.xs,
  },
});
