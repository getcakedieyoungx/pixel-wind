import { envAt, windTable } from './envelope';
import type { WindField } from './field';
import { createImage, type RGBAImage } from './image';
import { mulberry32 } from './rng';
import type { AutoParams, WindOptions } from './types';

export interface RenderResult {
  frames: RGBAImage[];
  maxDx: number;
  maxDy: number;
}

/** strength 2 -> 1.85, the amplitude tuned on the original tree */
const AMP_PER_STRENGTH = 0.925;
const MAX_TIPS = 24;

/** Opaque pixels with ≤3 opaque neighbours above the pin line, a seeded sample of at most 24. */
function findTips(src: RGBAImage, pinY: number, seed: number): Uint8Array {
  const { width: w, height: h, data } = src;
  const cand: number[] = [];
  for (let y = 0; y < Math.min(pinY, h); y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] === 0) continue;
      let nb = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && xx < w && yy >= 0 && yy < h && data[(yy * w + xx) * 4 + 3] > 0) nb++;
        }
      if (nb <= 3) cand.push(i);
    }
  const rng = mulberry32(seed + 3);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  const map = new Uint8Array(w * h);
  for (const i of cand.slice(0, MAX_TIPS)) map[i] = 1;
  return map;
}

export function renderFrames(src: RGBAImage, p: AutoParams, field: WindField, opts: WindOptions): RenderResult {
  const { width: w, height: h, data } = src;
  const N = opts.frames;
  const table = windTable(N);
  const vmax = Math.max(...table.map((v) => Math.abs(v)));
  const amax = opts.strength * AMP_PER_STRENGTH;
  const tips = findTips(src, p.pinY, opts.seed);
  const frames: RGBAImage[] = [];
  let maxDx = 0;
  let maxDy = 0;

  for (let f = 0; f < N; f++) {
    const out = createImage(w, h);
    const od = out.data;
    const tipAt = new Uint8Array(w * h);
    // vertical lift scales with how hard the wind blows; 0 on the rest frame
    const gate = Math.abs(table[f]) / vmax;

    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let dx = 0;
        let dy = 0;
        if (f !== 0 && y < p.pinY) {
          const lagN = (field.lagF[i] * N) / 8;
          const wv = envAt(table, f - lagN);
          const vert = gate * Math.sin(2 * Math.PI * ((f - lagN) / N + field.vphase[i] / 8));
          const base = amax * field.A[i] * field.ampC[i];
          dx = Math.max(-opts.strength, Math.min(opts.strength, Math.round(base * wv)));
          dy = Math.max(-1, Math.min(1, Math.round(base * 0.42 * vert)));
        }
        maxDx = Math.max(maxDx, Math.abs(dx));
        maxDy = Math.max(maxDy, Math.abs(dy));

        const sx = x - dx;
        const sy = y - dy;
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue; // stays transparent
        const si = sy * w + sx;
        od[i * 4] = data[si * 4];
        od[i * 4 + 1] = data[si * 4 + 1];
        od[i * 4 + 2] = data[si * 4 + 2];
        od[i * 4 + 3] = data[si * 4 + 3];
        if (data[si * 4 + 3] > 0) tipAt[i] = tips[si];
      }

    // leaf-tip flutter: 1 extra px of silhouette travel on strong frames
    if (Math.abs(table[f]) > 0.45) {
      const step = table[f] >= 0 ? 1 : -1;
      for (let y = 0; y < h; y++)
        for (let k = 0; k < w; k++) {
          // walk against the motion so a moved tip is never moved twice
          const x = step > 0 ? w - 1 - k : k;
          const i = y * w + x;
          if (!tipAt[i]) continue;
          const nx = x + step;
          if (nx < 0 || nx >= w) continue;
          const ni = y * w + nx;
          if (od[ni * 4 + 3] !== 0) continue;
          od.copyWithin(ni * 4, i * 4, i * 4 + 4);
          od.fill(0, i * 4, i * 4 + 4);
        }
    }
    frames.push(out);
  }
  return { frames, maxDx, maxDy };
}
