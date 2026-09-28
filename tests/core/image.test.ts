import { describe, it, expect } from 'vitest';
import { createImage, cloneImage, imagesEqual, packPixel } from '../../src/core/image';

describe('image helpers', () => {
  it('creates a transparent image of the right size', () => {
    const img = createImage(3, 2);
    expect(img.data.length).toBe(24);
    expect(img.data.every((v) => v === 0)).toBe(true);
  });

  it('clones without sharing memory', () => {
    const a = createImage(2, 2);
    const b = cloneImage(a);
    b.data[0] = 9;
    expect(a.data[0]).toBe(0);
    expect(imagesEqual(a, b)).toBe(false);
  });

  it('compares equal images and different sizes', () => {
    expect(imagesEqual(createImage(2, 2), createImage(2, 2))).toBe(true);
    expect(imagesEqual(createImage(2, 2), createImage(4, 1))).toBe(false);
  });

  it('packs RGBA into one unsigned int', () => {
    const d = new Uint8ClampedArray([255, 1, 2, 3]);
    expect(packPixel(d, 0)).toBe(0xff010203);
  });
});
