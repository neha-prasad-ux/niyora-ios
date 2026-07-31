import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { spacing } from '../theme/spacing';
import { fontScale } from '../theme/typography';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.message}>Something went sideways.</Text>
          <TouchableOpacity onPress={this.reset} activeOpacity={0.7} style={styles.button}>
            <Text style={styles.buttonLabel}>Tap to restart</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBottom,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxl,
  },
  message: {
    fontFamily: fonts.light,
    fontSize: fontScale.emphasis,
    color: colors.textSubtitle,
  },
  button: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  buttonLabel: {
    fontFamily: fonts.medium,
    fontSize: fontScale.caption,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
});
