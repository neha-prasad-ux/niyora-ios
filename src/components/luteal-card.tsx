// The luteal card. Appears on the home screen only during the premenstrual
// window, above the Begin card, and opens into the week's gentle suggestions.
// Styled warm and inviting (not a flat banner) so it reads as something to
// open, not a warning. Voice is warm and true: it names where she is without
// alarm or false reassurance.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { colors } from '@/theme/colors';
import { LUTEAL_CARD_FILL, LUTEAL_CARD_BORDER } from '@/theme/luteal-palette';

export function LutealCard() {
  const onPress = () => {
    Haptics.selectionAsync();
    router.push('/pms-week');
  };

  return (
    <Pressable
      onPress={onPress}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Your PMS window is here. A few gentle things can soften it."
    >
      <View style={styles.textWrap}>
        <Text style={styles.title}>Your PMS window is here</Text>
        <Text style={styles.sub}>A few gentle things can soften it.</Text>
      </View>
      <SymbolView name="chevron.right" tintColor={colors.textSubtitle} size={15} weight="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: LUTEAL_CARD_BORDER,
    backgroundColor: LUTEAL_CARD_FILL,
    marginBottom: 16,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 17,
    lineHeight: 23,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  sub: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 3,
  },
});
