import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { createImage, type RGBAImage } from '../../src/core/image';

export function blank(w: number, h: number): RGBAImage {
  return createImage(w, h);
}

export function put(img: RGBAImage, x: number, y: number, rgba: readonly number[]): void {
  img.data.set(rgba, (y * img.width + x) * 4);
}

export function loadPng(path: string): RGBAImage {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height, data: new Uint8ClampedArray(png.data) };
}

export function loadTree(): RGBAImage {
  return loadPng(fileURLToPath(new URL('../fixtures/tree.png', import.meta.url)));
}

/** 32×32 round bush on a short trunk, 3 greens + 1 brown. */
export function bush(): RGBAImage {
  const im = blank(32, 32);
  const greens = [
    [46, 94, 58, 255],
    [76, 118, 82, 255],
    [104, 176, 88, 255],
  ];
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if ((x - 16) ** 2 + (y - 13) ** 2 <= 144) put(im, x, y, greens[(x + y) % 3]);
  for (let y = 24; y < 32; y++) for (let x = 14; x <= 17; x++) put(im, x, y, [110, 72, 40, 255]);
  return im;
}

/** 64×16 wide, low grass tuft strip, 2 greens. */
export function grass(): RGBAImage {
  const im = blank(64, 16);
  const greens = [
    [76, 118, 82, 255],
    [104, 176, 88, 255],
  ];
  for (let x = 0; x < 64; x++) {
    const blade = 6 + ((x * 7) % 5);
    for (let y = 15; y > 15 - blade; y--) put(im, x, y, greens[x % 2]);
  }
  return im;
}
