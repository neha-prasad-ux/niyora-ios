/**
 * 2-D smooth value noise.
 *
 * Returns values in [-1, 1].  Uses a sin-based hash so no lookup table is
 * needed, which keeps the function worklet-safe (pure arithmetic, no external
 * state).  Bilinear interpolation with a smoothstep curve gives C1 continuity.
 */
export function noise2D(x: number, y: number): number {
  'worklet';
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;

  // Smoothstep: 3t^2 - 2t^3
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);

  // Hash two integers to a value in [-1, 1].
  const h = (ax: number, ay: number) => {
    const n = Math.sin(ax * 127.1 + ay * 311.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };

  const a = h(xi,     yi    );
  const b = h(xi + 1, yi    );
  const c = h(xi,     yi + 1);
  const d = h(xi + 1, yi + 1);

  // Bilinear blend
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
