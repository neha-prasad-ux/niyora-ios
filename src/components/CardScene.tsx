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
  Path,
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
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Scene coordinate space; the Svg slices to fill whatever the card measures.
const W = 300;
const H = 440;

type SceneKey =
  | 'cold'
  | 'warm'
  | 'walk'
  | 'ink'
  | 'breathe'
  | 'glow'
  | 'read'
  | 'message'
  | 'cave'
  | 'dim';

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
        return 'read';
      case 'bridge-back':
        return 'message';
      case 'cave-mode':
        return 'cave';
      case 'one-tiny-thing':
        return 'glow';
      case 'om-chant':
        // The breathe scene's orb + emanating rings reads as the chant's
        // resonance spreading out.
        return 'breathe';
      // legs-up-the-wall / childs-pose / slow-stretches are pose scenes (a
      // separate, image-backed task) -> dim placeholder for now.
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
      return <WarmScene />;
    case 'walk':
      return <WalkScene />;
    case 'ink':
      return <InkScene reduced={reduced} />;
    case 'breathe':
      return <BreatheScene reduced={reduced} />;
    case 'glow':
      return <GlowScene reduced={reduced} />;
    case 'read':
      return <ReadScene />;
    case 'message':
      return <MessageScene reduced={reduced} />;
    case 'cave':
      return <CaveScene reduced={reduced} />;
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
  { x: 58, r: 4, dur: 5200, delay: 0 },
  { x: 124, r: 3, dur: 5600, delay: 2400 },
  { x: 180, r: 4.5, dur: 4800, delay: 1200 },
  { x: 236, r: 3.2, dur: 5400, delay: 3400 },
  { x: 150, r: 2.8, dur: 6000, delay: 4600 },
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

// --- warm: just a cozy warm colour wash (no animation) ---

function WarmScene() {
  return (
    <>
      <Defs>
        <RadialGradient id="warmbg" cx="0.5" cy="0.66" r="0.9">
          <Stop offset="0" stopColor="hsl(28,54%,30%)" />
          <Stop offset="0.85" stopColor="#140d0a" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#warmbg)" />
    </>
  );
}

// --- walk: a sunset colour wash + a low sun glow (no birds) ---

function WalkScene() {
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
    </>
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
        x={64}
        y={150}
        fill="hsl(250,24%,80%)"
        fontSize={16}
        fontFamily="Poppins-Light"
        opacity={0.45}
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
      <BreathOrb reduced={reduced} />
    </>
  );
}

// Just the soul, breathing big then small (no emanating rings).
function BreathOrb({ reduced }: { reduced: boolean }) {
  const p = useLoop(5200, 0, reduced, true, 0.5);
  const props = useAnimatedProps(() => ({ r: interpolate(p.value, [0, 1], [46, 72]) }));
  return <AnimatedCircle cx={W / 2} cy={150} fill="url(#borb)" animatedProps={props} />;
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

// --- read: just a soft colour wash (no animation) ---

function ReadScene() {
  return (
    <>
      <Defs>
        <RadialGradient id="readbg" cx="0.5" cy="0.4" r="0.78">
          <Stop offset="0" stopColor="hsl(32,24%,24%)" />
          <Stop offset="0.85" stopColor="#100c0a" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#readbg)" />
    </>
  );
}

// --- message: chat bubbles popping into a conversation, right then left ---

type Chat = {
  x: number;
  y: number;
  w: number;
  h: number;
  side: 'right' | 'left';
  dur: number;
  delay: number;
};

const CHAT: Chat[] = [
  { x: 118, y: 96, w: 108, h: 36, side: 'right', dur: 6200, delay: 0 },
  { x: 56, y: 146, w: 96, h: 36, side: 'left', dur: 6200, delay: 1700 },
];

// A message bubble: three rounded corners and one sharp corner (the tail) -- on
// the bottom-right for a sent bubble, bottom-left for a received one.
function bubblePath(c: Chat, r: number): string {
  const { x, y, w, h } = c;
  if (c.side === 'right') {
    return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }
  return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x} ${y + h} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
}

function MessageScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <RadialGradient id="msgbg" cx="0.5" cy="0.42" r="0.7">
          <Stop offset="0" stopColor="hsl(208,30%,24%)" />
          <Stop offset="0.82" stopColor="#0a1018" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#msgbg)" />
      {CHAT.map((c, i) => (
        <ChatBubble key={i} cfg={c} reduced={reduced} />
      ))}
    </>
  );
}

function ChatBubble({ cfg, reduced }: { cfg: Chat; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, false, 1);
  const props = useAnimatedProps(() => ({
    opacity: interpolate(p.value, [0, 0.08, 0.8, 1], [0, 1, 1, 0]),
  }));
  const d = bubblePath(cfg, 13);
  const fill = cfg.side === 'right' ? 'hsla(142,52%,52%,0.85)' : 'hsla(220,12%,72%,0.65)';
  return <AnimatedPath d={d} fill={fill} animatedProps={props} />;
}

// --- cave: a cozy window at night, moon + a few twinkling stars ---

const STARS = [
  { x: 186, y: 126, r: 1.6, dur: 1800, delay: 0 },
  { x: 174, y: 150, r: 1.2, dur: 2300, delay: 700 },
  { x: 110, y: 222, r: 1.5, dur: 2000, delay: 1200 },
  { x: 172, y: 232, r: 1.7, dur: 1700, delay: 400 },
];

function CaveScene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <Defs>
        <RadialGradient id="roombg" cx="0.5" cy="0.55" r="0.92">
          <Stop offset="0" stopColor="hsl(28,28%,18%)" />
          <Stop offset="0.85" stopColor="#0e0a07" />
        </RadialGradient>
        <RadialGradient id="moonglow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="hsl(48,42%,92%)" stopOpacity="0.9" />
          <Stop offset="1" stopColor="hsl(48,42%,92%)" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width={W} height={H} fill="url(#roombg)" />
      {/* glass = night sky */}
      <Rect x={84} y={92} width={132} height={176} rx={8} fill="hsl(222,42%,15%)" />
      <Moon reduced={reduced} />
      {STARS.map((s, i) => (
        <Star key={i} cfg={s} reduced={reduced} />
      ))}
      {/* frame + mullions + sill */}
      <Rect
        x={84}
        y={92}
        width={132}
        height={176}
        rx={8}
        fill="none"
        stroke="hsl(26,30%,28%)"
        strokeWidth={7}
      />
      <Rect x={147} y={92} width={6} height={176} fill="hsl(26,30%,28%)" />
      <Rect x={84} y={177} width={132} height={6} fill="hsl(26,30%,28%)" />
      <Rect x={74} y={266} width={152} height={13} rx={3} fill="hsl(26,28%,24%)" />
    </>
  );
}

function Moon({ reduced }: { reduced: boolean }) {
  const p = useLoop(7000, 0, reduced, true, 0.5);
  const props = useAnimatedProps(() => ({ opacity: interpolate(p.value, [0, 1], [0.5, 0.85]) }));
  return (
    <>
      <AnimatedCircle cx={118} cy={134} r={34} fill="url(#moonglow)" animatedProps={props} />
      <Circle cx={118} cy={134} r={15} fill="hsl(48,36%,90%)" />
    </>
  );
}

function Star({ cfg, reduced }: { cfg: (typeof STARS)[number]; reduced: boolean }) {
  const p = useLoop(cfg.dur, cfg.delay, reduced, true, 0.6);
  const props = useAnimatedProps(() => ({ opacity: interpolate(p.value, [0, 1], [0.2, 0.9]) }));
  return <AnimatedCircle cx={cfg.x} cy={cfg.y} r={cfg.r} fill="hsl(48,40%,92%)" animatedProps={props} />;
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
