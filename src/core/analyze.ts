import type { RGBAImage } from './image';
import { ERRORS, MAX_SIZE, PixelWindError, type AutoParams, type BBox, type Cluster } from './types';

export function opaqueBBox(src: RGBAImage): BBox | null {
  const { width: w, height: h, data } = src;
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/**
 * Farthest-point sampling over the opaque pixels above the pin line. The first
 * pick is the topmost pixel; higher clusters move first and furthest.
 */
function pickClusters(src: RGBAImage, bbox: BBox, pinY: number): Cluster[] {
  const { width: w, data } = src;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let y = bbox.y0; y < pinY; y++)
    for (let x = bbox.x0; x <= bbox.x1; x++)
      if (data[(y * w + x) * 4 + 3] > 0) {
        xs.push(x);
        ys.push(y);
      }
  const n = xs.length;
  if (n === 0) return [];

  const count = Math.min(n, Math.max(3, Math.min(8, Math.round(n / 800))));
  const chosen = [0];
  const minD = new Float64Array(n).fill(Infinity);
  for (let k = 1; k < count; k++) {
    const last = chosen[chosen.length - 1];
    let best = -1;
    let bestD = -1;
    for (let i = 0; i < n; i++) {
      const d = (xs[i] - xs[last]) ** 2 + (ys[i] - ys[last]) ** 2;
      if (d < minD[i]) minD[i] = d;
      if (minD[i] > bestD) {
        bestD = minD[i];
        best = i;
      }
    }
    chosen.push(best);
  }

  const span = Math.max(1, pinY - bbox.y0);
  return chosen
    .map((i) => {
      const t = Math.min(1, Math.max(0, (pinY - ys[i]) / span));
      return { x: xs[i], y: ys[i], amp: 0.8 + 0.3 * t, lag: 1.15 * (1 - t) };
    })
    .sort((a, b) => a.y - b.y || a.x - b.x);
}

export function analyze(src: RGBAImage, pinYOverride?: number): AutoParams {
  if (src.width > MAX_SIZE || src.height > MAX_SIZE) throw new PixelWindError('TOO_LARGE', ERRORS.TOO_LARGE);
  const bbox = opaqueBBox(src);
  if (!bbox) throw new PixelWindError('NO_OPAQUE', ERRORS.NO_OPAQUE);

  const hb = bbox.y1 - bbox.y0 + 1;
  const autoPin = bbox.y1 + 1 - Math.max(1, Math.floor(hb * 0.2));
  const pinY = Math.min(bbox.y1 + 1, Math.max(bbox.y0, Math.round(pinYOverride ?? autoPin)));

  return {
    pinY,
    bbox,
    cx: (bbox.x0 + bbox.x1) / 2,
    rx: Math.max(1, (bbox.x1 - bbox.x0 + 1) / 2),
    clusters: pickClusters(src, bbox, pinY),
    // leaf-clump noise was tuned at 7–23 px on a 150 px tree
    noiseScale: Math.max(hb / 150, 3 / 7),
  };
}
