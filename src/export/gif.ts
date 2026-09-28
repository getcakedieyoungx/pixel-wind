import * as gifenc from 'gifenc';
import type { RGBAImage } from '../core/image';
import { ERRORS, PixelWindError } from '../core/types';

// Bundlers resolve gifenc's ESM build; plain Node gets its CJS build, whose named
// exports only appear on `default`.
const GIFEncoder: typeof gifenc.GIFEncoder =
  gifenc.GIFEncoder ?? (gifenc as unknown as { default: typeof gifenc }).default.GIFEncoder;

export const GIF_MAX_COLOURS = 255;
const ALPHA_THRESHOLD = 128;

const rgbKey = (d: Uint8ClampedArray, i: number) => (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];

/** Exact palette of opaque colours; index 0 is reserved for transparency. Null if too many. */
export function gifPalette(frames: RGBAImage[]): number[][] | null {
  const seen = new Set<number>();
  const pal: number[][] = [[0, 0, 0]];
  for (const f of frames)
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < ALPHA_THRESHOLD) continue;
      const key = rgbKey(f.data, i);
      if (seen.has(key)) continue;
      if (pal.length > GIF_MAX_COLOURS) return null;
      seen.add(key);
      pal.push([f.data[i], f.data[i + 1], f.data[i + 2]]);
    }
  return pal;
}

export function hasSemiTransparency(img: RGBAImage): boolean {
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 0 && img.data[i] < 255) return true;
  return false;
}

export function encodeGif(frames: RGBAImage[], opts: { delayMs: number; scale?: number }): Uint8Array {
  const pal = gifPalette(frames);
  if (!pal) throw new PixelWindError('TOO_MANY_COLORS', ERRORS.TOO_MANY_COLORS);
  const lookup = new Map<number, number>();
  pal.forEach((c, i) => {
    if (i > 0) lookup.set((c[0] << 16) | (c[1] << 8) | c[2], i);
  });
  // colour tables are power-of-two sized
  let size = 2;
  while (size < pal.length) size *= 2;
  const palette = pal.concat(Array.from({ length: size - pal.length }, () => [0, 0, 0]));

  const s = Math.max(1, Math.floor(opts.scale ?? 1));
  const w = frames[0].width * s;
  const h = frames[0].height * s;
  const gif = GIFEncoder();
  frames.forEach((f, k) => {
    const index = new Uint8Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const si = (Math.floor(y / s) * f.width + Math.floor(x / s)) * 4;
        if (f.data[si + 3] < ALPHA_THRESHOLD) continue;
        index[y * w + x] = lookup.get(rgbKey(f.data, si))!;
      }
    gif.writeFrame(index, w, h, {
      palette: k === 0 ? palette : undefined,
      delay: opts.delayMs,
      transparent: true,
      transparentIndex: 0,
      repeat: 0,
      dispose: 2, // clear to transparent between frames
    });
  });
  gif.finish();
  return gif.bytes();
}
