// The tab bar as the misted bottom of the night sky: no slab, no hairline —
// just a dark blur so content softens behind the icons instead of colliding
// with them. The one lit surface is the selection itself: a round glass
// capsule (expo-glass-effect where the OS offers it, a whisper of the orb's
// blue elsewhere) that glides between tabs on a spring, glowing softly, so a
// tab switch is one continuous motion instead of three buttons popping. Only
// the tab under the capsule wears its label. Every press lands with the app's
// selection haptic.
//
// The geometry constants are exported for light-motes.tsx, which needs to know
// where the Now tab's moon sits to fly earned light into it.

import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requireOptionalNativeModule } from 'expo';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

// expo-router vendors react-navigation, so the bar's props type is derived
// from the Tabs component rather than imported from a package path that may
// move between SDKs.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

export const BAR_CONTENT_HEIGHT = 50; // icon slot + label, above the inset pad
export const BAR_MIN_BOTTOM_PAD = 12; // devices without a home-indicator inset
export const MOON_CENTER_FROM_BAR_TOP = 20; // paddingTop 6 + half the 28px slot

const INACTIVE_TINT = 'rgba(255, 255, 255, 0.40)';

// The selection capsule: round (radius = half height), wide enough to hold
// icon + label with air, and the one lit surface on a transparent bar.
const PILL_WIDTH = 76;
const PILL_TOP = 2;
const PILL_HEIGHT = 48;

// One spring for everything the selection touches (capsule glide, icon lift,
// label rise) so the whole move reads as a single gesture.
const SELECT_SPRING = { damping: 19, stiffness: 190, mass: 0.9 };

const glassAvailable = isLiquidGlassAvailable();

// expo-blur is a native module; a dev client built before it was added would
// render BlurView as a red "Unimplemented component" box. Probe the binary and
// fall back to a deeper wash until the next native build.
const blurAvailable = requireOptionalNativeModule('ExpoBlur') != null;

if (__DEV__) {
  // One line in Metro that settles "why does the bar look flat": glass needs
  // iOS 26 + an Xcode 26 build, blur needs the client rebuilt with expo-blur.
  console.log(
    `[night-tab-bar] backdrop: ${glassAvailable ? 'liquid glass' : blurAvailable ? 'expo-blur' : 'plain wash (rebuild the dev client for blur)'}`,
  );
}

export function NightTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, BAR_MIN_BOTTOM_PAD);
  const reduceMotion = useReducedMotion();

  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = state.routes.length > 0 ? rowWidth / state.routes.length : 0;

  // The capsule's home, in tab-index space; the spring makes the glide.
  const active = useSharedValue(state.index);
  useEffect(() => {
    if (reduceMotion) {
      active.value = state.index;
    } else {
      active.value = withSpring(state.index, SELECT_SPRING);
    }
  }, [state.index, active, reduceMotion]);

  const pillStyle = useAnimatedStyle(
    () => ({
      transform: [{ translateX: active.value * tabWidth + (tabWidth - PILL_WIDTH) / 2 }],
    }),
    [tabWidth],
  );

  return (
    <View pointerEvents="box-none" style={styles.bar}>
      {/* The mist: content stays visible through it but stops competing with
          the icons. Apple's native glass where the OS has it (already in the
          dev client), expo-blur on older iOS, plain dark as the last resort.
          Kept behind the row so the capsule's glass reads over it. */}
      {glassAvailable ? (
        <GlassView
          pointerEvents="none"
          style={styles.blur}
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor="rgba(10, 8, 16, 0.45)"
        />
      ) : blurAvailable ? (
        <BlurView pointerEvents="none" style={styles.blur} tint="dark" intensity={40} />
      ) : null}
      {/* The bar's own night colour over the mist — the original bar's dark,
          eased to let each backdrop breathe: glass carries its own material,
          blur needs a bit more, bare needs to do all the work itself. */}
      <View
        pointerEvents="none"
        style={[
          styles.wash,
          glassAvailable ? styles.washOverGlass : !blurAvailable && styles.washSolid,
        ]}
      />
      <View
        style={[styles.row, { paddingBottom: bottomPad }]}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]}>
            {glassAvailable && (
              <GlassView
                style={styles.pillGlass}
                glassEffectStyle="regular"
                colorScheme="dark"
                tintColor="rgba(165, 184, 213, 0.14)"
              />
            )}
            {/* The colour itself, over the glass: the capsule always reads as
                the orb's moonlit blue, glass or not. */}
            <View style={styles.pillTint} />
          </Animated.View>
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = options.title ?? route.name;
          const onPress = () => {
            Haptics.selectionAsync().catch(() => {});
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };
          return (
            <TabButton
              key={route.key}
              label={label}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
            >
              {options.tabBarIcon?.({
                focused,
                color: focused ? colors.textPrimary : INACTIVE_TINT,
                size: 24,
              })}
            </TabButton>
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  label,
  focused,
  onPress,
  onLongPress,
  children,
}: {
  label: string;
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const focus = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) {
      focus.value = focused ? 1 : 0;
    } else {
      focus.value = withSpring(focused ? 1 : 0, SELECT_SPRING);
    }
  }, [focused, focus, reduceMotion]);

  // A gentle lift as the capsule arrives; the capsule carries the glow, the
  // icon only rises to meet it.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.06 * focus.value }, { translateY: -1.5 * focus.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: focus.value,
    transform: [{ translateY: 2 * (1 - focus.value) }],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={{ top: 8 }}
      style={styles.tab}
    >
      <View style={styles.iconSlot}>
        <Animated.View style={iconStyle}>{children}</Animated.View>
      </View>
      <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 8, 16, 0.75)',
  },
  washSolid: {
    backgroundColor: 'rgba(10, 8, 16, 0.92)',
  },
  washOverGlass: {
    backgroundColor: 'rgba(10, 8, 16, 0.18)',
  },
  row: {
    flexDirection: 'row',
    paddingTop: 6,
  },
  // The moonlit capsule the selection rests in, with its glow bleeding softly
  // past the edges (the shadow of the translucent shape is the glow). The
  // faint fill also gives the shadow a shape to cast from — clipping happens
  // on the glass layer inside, never on the shadow-carrying view.
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    width: PILL_WIDTH,
    height: PILL_HEIGHT,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(165, 184, 213, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(165, 184, 213, 0.18)',
    shadowColor: 'hsl(220, 70%, 74%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 13,
  },
  pillTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_HEIGHT / 2,
    backgroundColor: 'rgba(165, 184, 213, 0.11)',
  },
  pillGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_HEIGHT / 2,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    height: BAR_CONTENT_HEIGHT - 6,
  },
  iconSlot: {
    width: 64,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
    letterSpacing: 0.4,
    color: 'rgba(255, 255, 255, 0.88)',
  },
});
