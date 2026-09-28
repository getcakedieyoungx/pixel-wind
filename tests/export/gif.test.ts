import { describe, it, expect } from 'vitest';
import { encodeGif, gifPalette, hasSemiTransparency } from '../../src/export/gif';
import { generate, PixelWindError } from '../../src/core';
import { blank, bush, put } from '../helpers/sprites';

/** Graphic Control Extension blocks: 0x21 0xF9 0x04 packed delayLo delayHi transIdx 0x00 */
function gces(bytes: Uint8Array) {
  const out: { delayCs: number; transparent: boolean }[] = [];
  for (let i = 0; i + 7 < bytes.length; i++)
    if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9 && bytes[i + 2] === 0x04 && bytes[i + 7] === 0x00)
      out.push({ delayCs: bytes[i + 4] | (bytes[i + 5] << 8), transparent: (bytes[i + 3] & 1) === 1 });
  return out;
}

describe('gif', () => {
  const { frames } = generate(bush(), { strength: 2, frames: 8, seed: 1 });

  it('writes a looping, transparent GIF with one frame per image', () => {
    const bytes = encodeGif(frames, { delayMs: 160 });
    expect(String.fromCharCode(...bytes.subarray(0, 6))).toBe('GIF89a');
    expect(new TextDecoder().decode(bytes).includes('NETSCAPE2.0')).toBe(true);
    const g = gces(bytes);
    expect(g.length).toBe(8);
    expect(g.every((x) => x.delayCs === 16 && x.transparent)).toBe(true);
  });

  it('builds an exact palette with a transparent slot', () => {
    const pal = gifPalette(frames)!;
    expect(pal[0]).toEqual([0, 0, 0]);
    expect(pal.length).toBe(1 + 4); // 3 greens + brown
  });

  it('refuses more than 255 colours', () => {
    const img = blank(16, 17);
    for (let i = 0; i < 256; i++) put(img, i % 16, Math.floor(i / 16), [i, 255 - i, (i * 7) % 256, 255]);
    expect(gifPalette([img])).toBeNull();
    expect(() => encodeGif([img], { delayMs: 100 })).toThrowError(PixelWindError);
  });

  it('detects semi-transparent pixels', () => {
    const img = bush();
    expect(hasSemiTransparency(img)).toBe(false);
    put(img, 0, 0, [10, 10, 10, 100]);
    expect(hasSemiTransparency(img)).toBe(true);
  });
});
