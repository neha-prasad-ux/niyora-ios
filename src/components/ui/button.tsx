// Proof-of-pipeline RNR-style Button. Uses NativeWind utility classes backed
// by Niyora brand tokens (bg-accent, text-primary) to confirm the Tailwind
// pipeline is wired end-to-end. Phase 3 will replace this with the full
// themed component set.
import * as React from 'react';
import { Pressable, Text } from 'react-native';

type ButtonProps = {
  label: string;
  onPress?: () => void;
};

export function Button({ label, onPress }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-accent rounded-xl px-6 py-3 items-center"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text className="text-primary font-poppins-medium tracking-widest uppercase text-begin">
        {label}
      </Text>
    </Pressable>
  );
}
