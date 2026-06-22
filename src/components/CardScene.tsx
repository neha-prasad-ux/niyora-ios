// Living full-card scenes that sit behind the result-card text. One per activity
// flavour, matching the approved prototype docs/pms/niyora-pms-scenes.html:
//   cold    -> soft falling droplets + a ripple
//   warm    -> a cozy mug with curling steam
//   walk    -> a low sun and drifting dusk clouds
//   ink     -> ink lines writing then clearing
//   breathe -> a soft orb with emanating rings
//   glow    -> a slow violet glow with drifting sparks
//   dim     -> a still calm gradient (used for the retreat/neutral + pose cards,
//              whose figure scenes are a separate, image-backed task)
//
// Built with react-native-svg + reanimated, the same recipe as orb.tsx. Soft
// edges come from radial gradients rather than blur filters (which RN-SVG does
// not render reliably). Motion is calm and breath-paced. It freezes for
// reduce-motion and for cards sitting deep in the stack (a perf guard).

import { useEffect, useState } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { getActivity } from '@/models/activities';
import { getTechnique } from '@/models/techniques';
import type { RecCard } from '@/models/recommend';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

// Scene coordinate space; the Svg slices to fill whatever the card measures.
const W = 300;
const H = 440;

type SceneKey = 'cold' | 'warm' | 'walk' | 'ink' | 'breathe' | 'glow' | 'dim';

export function sceneKeyFor(card: RecCard): SceneKey {
  if (card.activityId) {
    const a = getActivity(card.activityId);
    switch (a?.id) {
      case 'cold-water':
        return 'cold';
      case 'make-something-warm':
      case 'warm-to-eat':
        return 'warm';
      case 'slow-walk':
        return 'walk';
      case 'get-it-out':
      case 'park-it':
        return 'ink';
      case 'gentle-read':
      case 'something-light':
      case 'one-tiny-thing':
      case 'bridge-back':
        return 'glow';
      // legs-up-the-wall / childs-pose / slow-stretches are pose scenes (a
      // separate, image-backed task) + cave-mode: a still, dim calm for now.
      default:
        return 'dim';
    }
  }
  if (card.techniqueId) {
    const t = getTechnique(card.techniqueId);
    return t?.category === 'breathing' ? 'breathe' : 'glow';
  }
  return 'dim';
}

type Props = { card: RecCard; active: boolean };

export function CardScene({ card, active }: Props) {
  const reduced = useReducedMotion() || !active;
  const key = sceneKeyFor(card);
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      pointerEvents="none"
    >
      {renderScene(key, reduced)}
    </Svg>
  );
}

function renderScene(key: SceneKey, reduced: boolean) {
  switch (key) {
    case 'cold':
      return <ColdScene reduced={reduced} />;
    case 'warm':
      return <WarmScene reduced={reduced} />;
    case 'walk':
      return <WalkScene reduced={reduced} />;
    case 'ink':
      return <InkScene reduced={reduced} />;
    case 'breathe':
      return <BreatheScene reduced={reduced} />;
    case 'glow':
      return <GlowScene reduced={reduced} />;
    case 'dim':
    default:
      return <DimScene />;
  }
}

// --- shared looping helper: a 0..1 progress, optionally yoyo, frozen when reduced ---

function useLoop(duration: number, delay: number, reduced: boolean, yoyo = false, frozen = 0.5) {
  const p = useSharedValue(0);
  useEffect(() => {
    cancelAnimation(p);
    if (reduced) {
      p.value = frozen;
      return;
    }
    p.value = 0;
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, yoyo),
    );
    return () => cancelAnimation(p);
  }, [duration, delay, reduced, yoyo, frozen, p]);
  return p;
}

// --- cold: droplets + ripple ---

const DROPS = [
  { x: 38, r: 4.5, dur: 4600, delay: 0 },
  { x: 92, r: 3, dur: 5200, delay: 1400 },
  { x: 140, r: 5, dur: 4200, delay: 2600 },
  { x: 196, r: 3.5, dur: 5000, delay: 600 },
  { x: 244, r: 4, dur: 4800, delay: 3200 },
  { x: 66, r: 2.8, dur: 5400, delay: 2000 },
  { x: 170, r: 3.2, dur: 4400, delay: 3800 },
  { x: 220, r: 2.6, dur: 5600, delay: 1000 },
  { x: 116, r: 3.8, dur: 4900, delay: 4200 },
];

function ColdScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <LinearGradient id="coldbg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="hsl(210,30%,21%)" />
          <Stop offset="0.62" stopColor="hsl(214,34%,12%)" />
          <Stop offset="1" stopColor="#0a0d14" />
        </LinearGradient>
        <RadialGradient id="dropg" cx="0.4" cy="0.32" r="0.7">
          <Stop offset="0" stopColor="hsl(205,78%,92%)" stopOpacity="0.85" />
          <Stop offset="0.65" stopColor="hsl(205,66%,82%)" stopOpacity="0.18" />
          <Stop offset="1" stopColor="hsl(205,66%,82%)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#coldbg)" />
      {DROPS.map((d, i) => (
        <Drop key={i} cfg={d} reduced={reduced} />
      ))}
      <Ripple delay={0} reduced={reduced} />
      <Ripple delay={2300} reduced={reduced} />
    </>
  );
}

function Drop({ cfg, reduced }: { cfg: (typeof DROPS)[number]; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, false, 0.4);
  const props = useAnimatedProps(() => ({
    cy: interpolate(p.value, [0, 1], [-16, H + 16]),
    opacity: interpolate(p.value, [0, 0.18, 0.8, 1], [0, 0.55, 0.45, 0]),
  }));
  return <AnimatedCircle cx={cfg.x} r={cfg.r} fill="url(#dropg)" animatedProps={props} />;
}

function Ripple({ delay, reduced }: { delay: number; reduced: boolean }) {
  const p = useLoop(4600, delay, reduced, false, 0.5);
  const props = useAnimatedProps(() => ({
    rx: interpolate(p.value, [0, 1], [10, 54]),
    ry: interpolate(p.value, [0, 1], [3, 15]),
    opacity: interpolate(p.value, [0, 1], [0.3, 0]),
  }));
  return (
    <AnimatedEllipse
      cx={W / 2}
      cy={H - 64}
      fill="none"
      stroke="hsl(200,60%,84%)"
      strokeWidth={1}
      strokeOpacity={0.5}
      animatedProps={props}
    />
  );
}

// --- warm: cozy mug + curling steam ---

const SMOKE = [
  { x: 138, dur: 5200, delay: 0 },
  { x: 150, dur: 4600, delay: 1500 },
  { x: 162, dur: 5600, delay: 800 },
  { x: 144, dur: 4900, delay: 3000 },
];

function WarmScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <RadialGradient id="warmbg" cx="0.5" cy="0.72" r="0.85">
          <Stop offset="0" stopColor="hsl(28,52%,28%)" />
          <Stop offset="0.8" stopColor="#140d0a" />
        </RadialGradient>
        <RadialGradient id="cupglow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="hsl(32,70%,55%)" stopOpacity="0.5" />
          <Stop offset="1" stopColor="hsl(32,70%,55%)" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="smokeg" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor="hsl(40,32%,96%)" stopOpacity="0" />
          <Stop offset="0.55" stopColor="hsl(40,34%,96%)" stopOpacity="0.7" />
          <Stop offset="1" stopColor="hsl(40,30%,96%)" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#warmbg)" />
      <Ellipse cx={W / 2} cy={300} rx={78} ry={34} fill="url(#cupglow)" />
      {SMOKE.map((s, i) => (
        <Smoke key={i} cfg={s} reduced={reduced} />
      ))}
      {/* mug body + handle */}
      <Rect x={120} y={278} width={60} height={50} rx={9} fill="hsl(26,30%,30%)" />
      <Rect x={120} y={278} width={60} height={12} rx={6} fill="hsl(28,34%,40%)" />
      <Circle cx={188} cy={300} r={11} fill="none" stroke="hsl(26,30%,30%)" strokeWidth={6} />
    </>
  );
}

function Smoke({ cfg, reduced }: { cfg: (typeof SMOKE)[number]; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, false, 0.4);
  const props = useAnimatedProps(() => ({
    cy: interpolate(p.value, [0, 1], [276, 150]),
    cx: interpolate(p.value, [0, 0.5, 1], [cfg.x, cfg.x - 10, cfg.x + 10]),
    ry: interpolate(p.value, [0, 1], [16, 40]),
    opacity: interpolate(p.value, [0, 0.25, 0.6, 1], [0, 0.6, 0.4, 0]),
  }));
  return <AnimatedEllipse rx={7} fill="url(#smokeg)" animatedProps={props} />;
}

// --- walk: low sun + drifting dusk clouds ---

const WALK_CLOUDS = [
  { y: 150, w: 90, h: 18, dur: 26000, delay: 0, op: 0.5 },
  { y: 220, w: 120, h: 22, dur: 32000, delay: 6000, op: 0.42 },
  { y: 290, w: 76, h: 16, dur: 22000, delay: 12000, op: 0.46 },
];

function WalkScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <LinearGradient id="walkbg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="hsl(234,34%,22%)" />
          <Stop offset="0.52" stopColor="hsl(16,44%,30%)" />
          <Stop offset="0.72" stopColor="hsl(30,58%,42%)" />
          <Stop offset="1" stopColor="hsl(26,38%,20%)" />
        </LinearGradient>
        <RadialGradient id="sung" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="hsl(36,90%,72%)" stopOpacity="0.95" />
          <Stop offset="0.5" stopColor="hsl(28,80%,56%)" stopOpacity="0.55" />
          <Stop offset="1" stopColor="hsl(28,80%,56%)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#walkbg)" />
      <Circle cx={W / 2} cy={300} r={86} fill="url(#sung)" />
      {WALK_CLOUDS.map((c, i) => (
        <Cloud key={i} cfg={c} reduced={reduced} />
      ))}
    </>
  );
}

function Cloud({ cfg, reduced }: { cfg: (typeof WALK_CLOUDS)[number]; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, false, 0.3);
  const props = useAnimatedProps(() => ({
    x: interpolate(p.value, [0, 1], [-cfg.w, W]),
  }));
  return (
    <AnimatedRect
      y={cfg.y}
      width={cfg.w}
      height={cfg.h}
      rx={cfg.h / 2}
      fill="hsl(18,32%,18%)"
      fillOpacity={cfg.op}
      animatedProps={props}
    />
  );
}

// --- ink: a feeling being typed out, "I feel..." ---

const INK_PHRASE = 'I feel...';

function InkScene({ reduced }: { reduced: boolean }) {
  // Typewriter: type the phrase, hold, erase, repeat. Trailing "|" is the
  // cursor. Frozen (fully typed) for reduce-motion or when the card is inactive.
  const [shown, setShown] = useState(INK_PHRASE);
  useEffect(() => {
    if (reduced) {
      const t = setTimeout(() => setShown(INK_PHRASE), 0);
      return () => clearTimeout(t);
    }
    let i = 0;
    let phase: 'type' | 'hold' | 'erase' = 'type';
    let held = 0;
    const t0 = setTimeout(() => setShown(''), 0);
    const id = setInterval(() => {
      if (phase === 'type') {
        i += 1;
        setShown(INK_PHRASE.slice(0, i));
        if (i >= INK_PHRASE.length) phase = 'hold';
      } else if (phase === 'hold') {
        held += 1;
        if (held > 7) {
          held = 0;
          phase = 'erase';
        }
      } else {
        i -= 1;
        setShown(INK_PHRASE.slice(0, Math.max(0, i)));
        if (i <= 0) phase = 'type';
      }
    }, 230);
    return () => {
      clearTimeout(t0);
      clearInterval(id);
    };
  }, [reduced]);

  return (
    <>
      <Defs>
        <RadialGradient id="inkbg" cx="0.5" cy="0.4" r="0.72">
          <Stop offset="0" stopColor="hsl(244,26%,22%)" />
          <Stop offset="0.8" stopColor="#0b0913" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#inkbg)" />
      <SvgText
        x={56}
        y={152}
        fill="hsl(250,36%,91%)"
        fontSize={32}
        fontFamily="PatrickHand"
        opacity={0.92}
      >
        {`${shown}|`}
      </SvgText>
    </>
  );
}

// --- breathe: orb + emanating rings ---

function BreatheScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <RadialGradient id="breathebg" cx="0.5" cy="0.34" r="0.7">
          <Stop offset="0" stopColor="hsl(248,38%,24%)" />
          <Stop offset="0.78" stopColor="#0c0a16" />
        </RadialGradient>
        <RadialGradient id="borb" cx="0.38" cy="0.32" r="0.7">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.97" />
          <Stop offset="0.5" stopColor="hsl(220,30%,90%)" stopOpacity="0.92" />
          <Stop offset="1" stopColor="hsl(220,40%,76%)" stopOpacity="0.8" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#breathebg)" />
      <Ring delay={0} reduced={reduced} />
      <Ring delay={1700} reduced={reduced} />
      <Ring delay={3400} reduced={reduced} />
      <BreathOrb reduced={reduced} />
    </>
  );
}

function BreathOrb({ reduced }: { reduced: boolean }) {
  const p = useLoop(5000, 0, reduced, true, 0.5);
  const props = useAnimatedProps(() => ({ r: interpolate(p.value, [0, 1], [54, 64]) }));
  return <AnimatedCircle cx={W / 2} cy={150} fill="url(#borb)" animatedProps={props} />;
}

function Ring({ delay, reduced }: { delay: number; reduced: boolean }) {
  const p = useLoop(5000, delay, reduced, false, 0.4);
  const props = useAnimatedProps(() => ({
    r: interpolate(p.value, [0, 1], [36, 156]),
    opacity: interpolate(p.value, [0, 1], [0.55, 0]),
  }));
  return (
    <AnimatedCircle
      cx={W / 2}
      cy={150}
      fill="none"
      stroke="hsl(220,60%,82%)"
      strokeWidth={1}
      animatedProps={props}
    />
  );
}

// --- glow: slow violet glow + drifting sparks ---

const SPARKS = [
  { x: 60, r: 2.5, dur: 9000, delay: 0 },
  { x: 110, r: 3, dur: 7400, delay: 2000 },
  { x: 150, r: 2, dur: 10000, delay: 4200 },
  { x: 196, r: 2.8, dur: 8200, delay: 1200 },
  { x: 240, r: 2.2, dur: 9600, delay: 5200 },
  { x: 90, r: 2.4, dur: 8800, delay: 6400 },
];

function GlowScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <RadialGradient id="glowbg" cx="0.5" cy="0.38" r="0.7">
          <Stop offset="0" stopColor="hsl(276,40%,26%)" />
          <Stop offset="0.8" stopColor="#0e0a18" />
        </RadialGradient>
        <RadialGradient id="glowc" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="hsl(280,60%,70%)" stopOpacity="0.45" />
          <Stop offset="0.65" stopColor="hsl(280,60%,70%)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#glowbg)" />
      <Glow reduced={reduced} />
      {SPARKS.map((s, i) => (
        <Spark key={i} cfg={s} reduced={reduced} />
      ))}
    </>
  );
}

function Glow({ reduced }: { reduced: boolean }) {
  const p = useLoop(6000, 0, reduced, true, 0.5);
  const props = useAnimatedProps(() => ({
    r: interpolate(p.value, [0, 1], [86, 118]),
    opacity: interpolate(p.value, [0, 1], [0.4, 0.8]),
  }));
  return <AnimatedCircle cx={W / 2} cy={160} fill="url(#glowc)" animatedProps={props} />;
}

function Spark({ cfg, reduced }: { cfg: (typeof SPARKS)[number]; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, false, 0.5);
  const props = useAnimatedProps(() => ({
    cy: interpolate(p.value, [0, 1], [H, -10]),
    opacity: interpolate(p.value, [0, 0.2, 0.8, 1], [0, 0.8, 0.6, 0]),
  }));
  return <AnimatedCircle cx={cfg.x} r={cfg.r} fill="hsl(285,60%,85%)" animatedProps={props} />;
}

// --- dim: a still calm gradient (retreat / neutral / pose placeholder) ---

function DimScene() {
  return (
    <>
      <Defs>
        <LinearGradient id="dimbg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="hsl(214,28%,17%)" />
          <Stop offset="0.7" stopColor="hsl(250,26%,12%)" />
          <Stop offset="1" stopColor="#0a0810" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#dimbg)" />
    </>
  );
}
