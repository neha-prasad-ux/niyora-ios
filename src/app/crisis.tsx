// The crisis resource screen. Reachable from any distress screen, and where
// self-harm-adjacent reflection input routes directly. It never offers an
// activity, a reflection, or a reframe: just real support and a way out.

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BackgroundGradient } from '@/components/background-gradient';
import { colors } from '@/theme/colors';
import { FIND_A_HELPLINE_URL, EMERGENCY_FALLBACK } from '@/lib/crisis';

export default function CrisisScreen() {
  const goBack = () => {
    Haptics.selectionAsync();
    router.back();
  };

  const openHelpline = () => {
    Haptics.selectionAsync();
    Linking.openURL(FIND_A_HELPLINE_URL).catch(() => {});
  };

  return (
    <View style={styles.root}>
      <BackgroundGradient />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <SymbolView name="chevron.left" tintColor={colors.textTagline} size={16} weight="medium" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>You deserve real support</Text>
          <Text style={styles.body}>
            What you are feeling matters, and you do not have to hold it alone. Talking to a
            trained person can help right now.
          </Text>

          <Pressable
            onPress={openHelpline}
            style={styles.primaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Find a helpline"
          >
            <Text style={styles.primaryBtnText}>Find a helpline</Text>
            <SymbolView
              name="arrow.up.right"
              tintColor={colors.textPrimary}
              size={14}
              weight="semibold"
            />
          </Pressable>
          <Text style={styles.helplineNote}>
            Opens Find A Helpline, which shows free, confidential lines for your country.
          </Text>

          <Text style={styles.fallback}>{EMERGENCY_FALLBACK}</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topBar: {
    height: 32,
    justifyContent: 'center',
  },
  content: {
    paddingTop: 8,
    paddingBottom: 36,
  },
  title: {
    fontFamily: 'Poppins-Medium',
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },
  body: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    lineHeight: 25,
    color: colors.textPrimary,
    letterSpacing: 0.2,
    marginTop: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.beginBorder,
    backgroundColor: 'rgba(115, 57, 172, 0.25)',
  },
  primaryBtnText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 16,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  helplineNote: {
    fontFamily: 'Poppins-Light',
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSubtitle,
    letterSpacing: 0.2,
    marginTop: 12,
    textAlign: 'center',
  },
  fallback: {
    fontFamily: 'Poppins-Light',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textTagline,
    letterSpacing: 0.2,
    marginTop: 30,
    paddingTop: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.10)',
  },
});
