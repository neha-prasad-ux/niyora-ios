import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/theme/spacing';

type Props = ViewProps & {
  style?: StyleProp<ViewStyle>;
};

/**
 * The one card surface. Consistent inner padding, radius, border, and the
 * gap below it, so every card on a screen lines up. Pass `style` to override
 * (e.g. an accent border); base values still apply.
 */
export function Card({ style, children, ...rest }: Props) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: radius.card,
    borderCurve: 'continuous',
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
});
