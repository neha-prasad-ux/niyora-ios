// One shared checklist UI: a column of tappable rows, each a translucent card
// with a checkbox and a label (and optional examples). Used everywhere we ask
// her to pick or check things, so the feeling step, onboarding, and the
// readiness page all look and feel identical.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';

export type ChecklistItem = { id: string; label: string; examples?: string };

export function Checklist({
  items,
  isChecked,
  onToggle,
}: {
  items: readonly ChecklistItem[];
  isChecked: (id: string) => boolean;
  onToggle: (id: string) => void;
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
              <Text style={styles.label}>{it.label}</Text>
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
    gap: 10,
  },
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
  boxOn: {
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
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
