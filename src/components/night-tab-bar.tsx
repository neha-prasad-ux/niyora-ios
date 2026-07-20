// The tab bar as the misted bottom of the night sky: no slab, no hairline —
// just a dark blur so content softens behind the icons instead of colliding
// with them. The one lit surface is the selection itself: a round glass
// capsule (expo-glass-effect where the OS offers it, a whisper of the orb's
// blue elsewhere) that glides between tabs on a spring, glowing softly, so a
// tab switch is one continuous motion instead of three buttons popping. Every
// tab wears its label — the resting ones dimmed, the selected one at full
// white. Every press lands with the app's selection haptic.
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/colors';

// expo-router vendors react-navigation, so the bar's props type is derived
// from the Tabs component rather than imported from a package path that may
// move between SDKs.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// Slim, Apple-style floating glass bar: balanced air above and below a compact
// body (icon + always-on label), sized so the whole thing reads as one clean
// capsule rather than a tall slab. Everything below derives from these pads so
// the selection capsule and the light-mote target stay locked to the icons.
const BAR_PAD_TOP = 15;
const BAR_PAD_BOTTOM = 15;
const ICON_SLOT = 28;
const LABEL_GAP = 5; // air between the icon and its label
const LABEL_LINE = 13;
const TAB_BODY = ICON_SLOT + LABEL_GAP + LABEL_LINE; // icon slot + always-on label
// The bar no longer spans the screen: it's a rounded pill floated in from the
// edges, so content flows past its sides instead of colliding with a full slab.
export const BAR_SIDE_INSET = 16;
// The full height of the pill (top air + body + bottom air). Consumers add the
// safe-area float below it to know the total space the bar occupies.
export const BAR_CONTENT_HEIGHT = BAR_PAD_TOP + TAB_BODY + BAR_PAD_BOTTOM;
// A true capsule: the radius is exactly half the height, so the ends are full
// semicircles (the iOS floating-glass tab bar shape), not a rounded rectangle.
const BAR_RADIUS = BAR_CONTENT_HEIGHT / 2;
export const BAR_MIN_BOTTOM_PAD = 12; // devices without a home-indicator inset
export const MOON_CENTER_FROM_BAR_TOP = BAR_PAD_TOP + ICON_SLOT / 2;

// Icons carry colour only when lit: the selected tab warms to the orb's
// moonlit blue, the resting tabs stay a dim white.
const INACTIVE_TINT = 'rgba(255, 255, 255, 0.40)';
const ACTIVE_TINT = 'hsl(222, 82%, 84%)';

// The selection highlight: a rounded-rect frost holding the whole tab — icon and
// label both — the one lit surface on an otherwise quiet bar. Its width fills the
// tab (the bar's third) minus an even side pad, so the pill scales with the
// screen and the gap between pills is 2 × PILL_H_PAD.
const PILL_H_PAD = 10; // gap from the pill to each side of its tab
const PILL_HEIGHT = 62;
const PILL_RADIUS = PILL_HEIGHT / 2; // max round: full capsule ends
const PILL_TOP = BAR_PAD_TOP + (TAB_BODY - PILL_HEIGHT) / 2;

// One spring for everything the selection touches (capsule glide, icon lift,
// label rise) so the whole move reads as a single gesture. Under-damped on
// purpose: it overshoots and settles with a bounce, the bubbly part of the feel.
const SELECT_SPRING = { damping: 12, stiffness: 160, mass: 1 };

// The squash-and-stretch pulse fired on every tab change: a quick stretch, then
// a springy settle back — the pill wobbles like a bubble as it lands.
const SQUISH_SPRING = { damping: 9, stiffness: 140, mass: 0.8 };

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
  // The pill fills its tab minus an even side pad, so it scales with the screen.
  const pillWidth = Math.max(0, tabWidth - PILL_H_PAD * 2);

  // The capsule's home, in tab-index space; the spring makes the glide.
  const active = useSharedValue(state.index);
  // 0 at rest; pulsed to 1 and springs back on every change, driving the squash.
  const squish = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      active.value = state.index;
      return;
    }
    active.value = withSpring(state.index, SELECT_SPRING);
    squish.value = withSequence(
      withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
      withSpring(0, SQUISH_SPRING),
    );
  }, [state.index, active, squish, reduceMotion]);

  const pillStyle = useAnimatedStyle(
    () => ({
      width: pillWidth,
      // Stretch along travel, thin down across it, then wobble back to 1 — the
      // bubble squishing as it lands.
      transform: [
        { translateX: active.value * tabWidth + PILL_H_PAD },
        { scaleX: 1 + 0.14 * squish.value },
        { scaleY: 1 - 0.12 * squish.value },
      ],
    }),
    [tabWidth, pillWidth],
  );

  return (
    <View pointerEvents="box-none" style={[styles.bar, { bottom: bottomPad }]}>
      {/* The mist: content stays visible through it but stops competing with
          the icons. Apple's native glass where the OS has it (already in the
          dev client), expo-blur on older iOS, plain dark as the last resort.
          Kept behind the row so the capsule's glass reads over it, and clipped
          to the pill's radius so the frost has clean rounded edges. */}
      {glassAvailable ? (
        <GlassView
          pointerEvents="none"
          style={styles.blur}
          glassEffectStyle="regular"
          colorScheme="dark"
          tintColor="rgba(10, 8, 16, 0.42)"
        />
      ) : blurAvailable ? (
        <BlurView pointerEvents="none" style={styles.blur} tint="dark" intensity={48} />
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
        style={styles.row}
        onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View pointerEvents="none" style={[styles.pill, pillStyle]}>
            {glassAvailable && (
              <GlassView
                style={styles.pillGlass}
                glassEffectStyle="regular"
                colorScheme="dark"
                tintColor="rgba(216, 228, 250, 0.08)"
              />
            )}
            {/* The colour itself, over the glass: the capsule always reads as
                the orb's moonlit blue, glass or not. */}
            <View style={styles.pillTint} />
            {/* Inner shadow: darker at the top and bottom inner edges, clear in
                the middle, so the pill reads as a recessed glass well rather than
                a raised chip — no outer drop shadow. */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(0, 0, 0, 0.28)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.16)']}
              locations={[0, 0.32, 0.68, 1]}
              style={styles.pillInnerShadow}
            />
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
                color: focused ? ACTIVE_TINT : INACTIVE_TINT,
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

  // A bubbly pop as the capsule arrives: the bouncy focus spring overshoots past
  // 1, so the icon springs up a touch bigger and settles back with the pill.
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + 0.12 * focus.value }, { translateY: -2.5 * focus.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({
    // The resting tab keeps a legible, dimmed label (never fully hidden); it
    // lifts to full white as the tab takes focus.
    opacity: 0.55 + 0.45 * focus.value,
    transform: [{ translateY: 1 * (1 - focus.value) }],
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
    // A rounded pill floated in from the edges (bottom is set inline from the
    // safe-area inset), not a slab pinned to the screen. A soft drop shadow
    // lifts it off the night behind so it reads as one clean glass object.
    position: 'absolute',
    left: BAR_SIDE_INSET,
    right: BAR_SIDE_INSET,
    borderRadius: BAR_RADIUS,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BAR_RADIUS,
    // A crisp hairline rim so the glass has a clean edge rather than a fuzzy one.
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    // Lighter than a slab so the pill reads as glass. With expo-blur in the
    // build this sits over a real frost; the dark bottom of the night sky keeps
    // even the no-blur fallback legible while showing content through.
    backgroundColor: 'rgba(10, 8, 16, 0.44)',
  },
  washSolid: {
    // The no-blur fallback: still see-through, just a touch denser so the icons
    // keep a backing when content scrolls under a bar without a real blur.
    backgroundColor: 'rgba(10, 8, 16, 0.52)',
  },
  washOverGlass: {
    backgroundColor: 'rgba(10, 8, 16, 0.14)',
  },
  row: {
    flexDirection: 'row',
    paddingTop: BAR_PAD_TOP,
    paddingBottom: BAR_PAD_BOTTOM,
  },
  // The moonlit capsule the selection rests in, with its glow bleeding softly
  // past the edges (the shadow of the translucent shape is the glow). The
  // faint fill also gives the shadow a shape to cast from — clipping happens
  // on the glass layer inside, never on the shadow-carrying view.
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    // A whisper of fill and a soft luminous rim instead of a matte outline. No
    // outer drop shadow — the depth comes from the inner shadow layered inside,
    // so the pill reads as recessed lit glass rather than a raised chip. The
    // inner-shadow layer clips to the radius, so the pill clips too.
    backgroundColor: 'rgba(214, 226, 250, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(220, 230, 252, 0.22)',
    overflow: 'hidden',
  },
  pillInnerShadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_RADIUS,
  },
  pillTint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_RADIUS,
    // A pale, airy wash rather than a solid grey fill — lighter and more
    // transparent so content still glows through it.
    backgroundColor: 'rgba(216, 228, 250, 0.07)',
  },
  pillGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: PILL_RADIUS,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    // Just the body (icon + label); the row supplies the top and bottom air.
    // (Previously this pulled in BAR_PAD_BOTTOM twice and left a dead gap below
    // each label, inflating the whole bar.)
    height: TAB_BODY,
  },
  iconSlot: {
    width: 64,
    height: ICON_SLOT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: LABEL_LINE,
    marginTop: LABEL_GAP,
    letterSpacing: 0.4,
    color: 'rgba(255, 255, 255, 0.88)',
  },
});
