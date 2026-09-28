import { createImage, type RGBAImage } from '../core/image';
import type { AutoParams } from '../core/types';

const MAX_DEG = 3;

/** Naive rotation sway, like typical wind shaders — shown side by side to demo the shimmer. */
export function rotateSway(src: RGBAImage, p: AutoParams, frames: number): RGBAImage[] {
  const { width: w, height: h, data } = src;
  const px = p.cx;
  const py = p.pinY;
  const out: RGBAImage[] = [];
  for (let f = 0; f < frames; f++) {
    const a = ((MAX_DEG * Math.PI) / 180) * Math.sin((2 * Math.PI * f) / frames);
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    const img = createImage(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sx = x;
        let sy = y;
        if (y < py) {
          // inverse rotation about the pivot
          const dx = x - px;
          const dy = y - py;
          sx = Math.round(px + dx * cos + dy * sin);
          sy = Math.round(py - dx * sin + dy * cos);
        }
        if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
        const si = (sy * w + sx) * 4;
        img.data.set(data.subarray(si, si + 4), (y * w + x) * 4);
      }
    out.push(img);
  }
  return out;
}
