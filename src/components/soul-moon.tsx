// Her moon, the one Home shows: same Orb call, same warm rose halo, her real
// brightness and material read from her moon state, breathing on the same 4s in
// / 6s out cadence.
//
// It exists so a second screen cannot end up with a moon that merely resembles
// the one on Home. Home's own call (app/(tabs)/now.tsx) is still inline because
// it drives the orb from that screen's live breath and light-mote animations;
// anywhere the moon is just present rather than driven, use this.

import { useEffect, useState } from 'react';

import { Orb } from '@/components/orb';
import { foldLedger } from '@/lib/moon-light';
import { bodyHue } from '@/models/tiers';
import { getLightLedger } from '@/store/light-ledger';
import { getMoonState } from '@/store/moon-state';

const BREATH_IN = 4; // seconds, inhale
const BREATH_OUT = 6; // seconds, exhale (longer = calming), matching Home

type Soul = { fullness: number; material: Parameters<typeof Orb>[0]['material']; light: number };

export function SoulMoon({ size }: { size: number }) {
  const [soul, setSoul] = useState<Soul | null>(null);
  const [breath, setBreath] = useState<'inhale' | 'exhale'>('inhale');

  useEffect(() => {
    let alive = true;
    Promise.all([getMoonState(), getLightLedger()])
      .then(([moon, ledger]) => {
        if (!alive) return;
        setSoul({
          fullness: moon.fullness,
          material: moon.material,
          light: foldLedger(ledger).lifetimeLight,
        });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (current: 'inhale' | 'exhale') => {
      timer = setTimeout(
        () => {
          if (!alive) return;
          const next = current === 'inhale' ? 'exhale' : 'inhale';
          setBreath(next);
          schedule(next);
        },
        (current === 'inhale' ? BREATH_IN : BREATH_OUT) * 1000,
      );
    };
    schedule('inhale');
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // Nothing until her real state loads: a default moon flashing into her actual
  // one reads as the app correcting itself.
  if (soul == null) return null;

  return (
    <Orb
      size={size}
      phase={breath}
      phaseDuration={breath === 'inhale' ? BREATH_IN : BREATH_OUT}
      breathRange={{ min: 0.97, max: 1.03 }}
      warmHalo
      hue={bodyHue(soul.light)}
      brightness={soul.fullness}
      illum={soul.fullness}
      material={soul.material}
    />
  );
}
