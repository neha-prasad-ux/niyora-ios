// AI text, given the moon's material.
//
// The one signal that separates the model's words from authored copy: when the
// moon says HER words back (the grounded echo), the text is filled with a soft
// moonstone sheen in her moon's own hue, so it reads as the moon speaking, not
// as a chat bubble or an instruction. Authored copy stays flat white. One
// signal, used only here, so it means exactly one thing.
//
// Masked gradient text: the words are the mask, a diagonal gradient is the
// fill. The hidden copy inside the gradient sizes it to the same wrap as the
// mask, so multi-line echoes fill correctly.

import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

export function MoonText({
  children,
  style,
  containerStyle,
  hue = 220,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  hue?: number;
}) {
  // A moonstone sheen in her moon's hue. Kept BRIGHT and in a tight band (88-93%
  // lightness): the old version dipped to a muddy 74% mid-tone that read as
  // faint, low-contrast text. This stays legible, near-white with a clear moon
  // tint, while still shimmering rather than sitting flat.
  const colors: [string, string, string] = [
    `hsl(${hue}, 46%, 93%)`,
    `hsl(${hue}, 42%, 88%)`,
    `hsl(${hue}, 48%, 92%)`,
  ];
  return (
    <MaskedView
      style={containerStyle}
      maskElement={<Text style={style}>{children}</Text>}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={[style, styles.hidden]}>{children}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
});
