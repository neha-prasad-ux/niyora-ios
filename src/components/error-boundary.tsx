import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';

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
    gap: 24,
  },
  message: {
    fontFamily: 'Poppins-Light',
    fontSize: 16,
    color: colors.textSubtitle,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  buttonLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.textPrimary,
  },
});
