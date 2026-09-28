import { describe, it, expect } from 'vitest';
import { stampMark, MARK_TEXT } from '../../src/export/watermark';
import { loadTree } from '../helpers/sprites';

describe('stampMark', () => {
  it('keeps the size and leaves the input untouched', () => {
    const src = loadTree();
    const before = new Uint8ClampedArray(src.data);
    const out = stampMark(src);
    expect(out.width).toBe(src.width);
    expect(out.height).toBe(src.height);
    expect(src.data).toEqual(before);
  });

  it('only changes pixels inside the bottom-right mark box', () => {
    const src = loadTree();
    const out = stampMark(src);
    let changed = 0;
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const i = (y * src.width + x) * 4;
        const diff = [0, 1, 2, 3].some((k) => out.data[i + k] !== src.data[i + k]);
        if (!diff) continue;
        changed++;
        expect(x).toBeGreaterThan(src.width - 40);
        expect(y).toBeGreaterThan(src.height - 10);
      }
    expect(changed).toBeGreaterThan(10);
  });

  it('spells the copyright mark', () => {
    expect(MARK_TEXT).toBe('© YALPO');
  });
});
