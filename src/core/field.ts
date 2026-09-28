import { mulberry32 } from './rng';
import type { AutoParams } from './types';

export interface WindField {
  /** Sway ramp: 0 at the pin line, max at the top, perturbed at clump scale. */
  A: Float32Array;
  /** Per-cluster intensity, smoothly blended between cluster seeds. */
  ampC: Float32Array;
  /** Per-pixel timing lag in 8-frame units (cluster lag + clump jitter). */
  lagF: Float32Array;
  /** Spatial phase so vertical lift never moves the whole crown at once. */
  vphase: Float32Array;
}

// [period px on a 150 px sprite, weight] — matched to leaf clumps
const COMPS: ReadonlyArray<readonly [number, number]> = [
  [11, 1.0],
  [17, 0.8],
  [7, 0.5],
  [23, 0.6],
];

/** Band-limited noise (sum of oriented sinusoids), about ±1. */
function smoothNoise(w: number, h: number, seed: number, scale: number): Float32Array {
  const rng = mulberry32(seed);
  const out = new Float32Array(w * h);
  let total = 0;
  for (const [period, amp] of COMPS) {
    const ang = rng() * 2 * Math.PI;
    const ph = rng() * 2 * Math.PI;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    const p = period * scale;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) out[y * w + x] += amp * Math.sin((2 * Math.PI * (c * x + s * y)) / p + ph);
    total += amp;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function buildField(width: number, height: number, p: AutoParams, seed: number): WindField {
  const n = width * height;
  const A = new Float32Array(n);
  const ampC = new Float32Array(n);
  const lagF = new Float32Array(n);
  const vphase = new Float32Array(n);
  const noiseA = smoothNoise(width, height, seed + 1, p.noiseScale);
  const noiseP = smoothNoise(width, height, seed + 2, p.noiseScale);
  const span = Math.max(1, p.pinY - p.bbox.y0);
  const tau = 9 * p.noiseScale;
  const s = p.noiseScale;

  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const h = Math.pow(Math.min(1, Math.max(0, (p.pinY - y) / span)), 0.9);
      const rad = Math.min(1, Math.abs(x - p.cx) / p.rx);
      // outer crown flutters more than the core
      A[i] = h * (0.72 + 0.5 * rad) * (1 + 0.32 * noiseA[i]);

      let lag = 0;
      if (p.clusters.length > 0) {
        let dmin = Infinity;
        for (const c of p.clusters) dmin = Math.min(dmin, Math.hypot(x - c.x, y - c.y));
        let ws = 0;
        let am = 0;
        let lg = 0;
        for (const c of p.clusters) {
          const wt = Math.exp(-(Math.hypot(x - c.x, y - c.y) - dmin) / tau);
          ws += wt;
          am += wt * c.amp;
          lg += wt * c.lag;
        }
        ampC[i] = am / ws;
        lag = lg / ws;
      }
      lagF[i] = lag + 0.45 * noiseP[i];
      vphase[i] = 1.9 * Math.sin((x * 0.055) / s) + 1.4 * Math.cos((y * 0.07) / s) + 1.1 * Math.sin(((x + y) * 0.031) / s);
    }
  return { A, ampC, lagF, vphase };
}
