import { describe, it, expect } from 'vitest';
import { analyze } from '../../src/core/analyze';
import { buildField } from '../../src/core/field';
import { renderFrames } from '../../src/core/render';
import { imagesEqual } from '../../src/core/image';
import type { WindOptions } from '../../src/core/types';
import { loadTree, bush } from '../helpers/sprites';

function run(opts: WindOptions, img = loadTree()) {
  const p = analyze(img, opts.pinY);
  const field = buildField(img.width, img.height, p, opts.seed);
  return { img, p, field, ...renderFrames(img, p, field, opts) };
}

describe('buildField', () => {
  it('is zero at and below the pin line, positive above', () => {
    const img = loadTree();
    const p = analyze(img);
    const f = buildField(img.width, img.height, p, 1);
    for (let x = 0; x < img.width; x++) expect(f.A[p.pinY * img.width + x]).toBe(0);
    expect(f.A[(p.bbox.y0 + 5) * img.width + 75]).toBeGreaterThan(0);
  });

  it('has zero cluster amplitude when there are no clusters', () => {
    const img = bush();
    const p = analyze(img, 0);
    const f = buildField(img.width, img.height, p, 1);
    expect(f.ampC.every((v) => v === 0)).toBe(true);
  });
});

describe('renderFrames', () => {
  it('returns N frames of the source size, frame 0 identical', () => {
    const r = run({ strength: 2, frames: 8, seed: 1 });
    expect(r.frames.length).toBe(8);
    expect(r.frames[0].width).toBe(150);
    expect(imagesEqual(r.frames[0], r.img)).toBe(true);
  });

  it('keeps rows below the pin line untouched', () => {
    const r = run({ strength: 3, frames: 12, seed: 2 });
    const start = r.p.pinY * r.img.width * 4;
    for (const fr of r.frames) expect(fr.data.subarray(start)).toEqual(r.img.data.subarray(start));
  });

  it('actually moves the canopy', () => {
    const r = run({ strength: 2, frames: 8, seed: 1 });
    expect(r.frames.some((fr) => !imagesEqual(fr, r.img))).toBe(true);
  });

  it('respects the displacement caps', () => {
    for (const strength of [1, 2, 3] as const) {
      const r = run({ strength, frames: 8, seed: 3 });
      expect(r.maxDx).toBeLessThanOrEqual(strength);
      expect(r.maxDy).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic per seed and varies across seeds', () => {
    const a = run({ strength: 2, frames: 8, seed: 5 });
    const b = run({ strength: 2, frames: 8, seed: 5 });
    const c = run({ strength: 2, frames: 8, seed: 6 });
    a.frames.forEach((fr, i) => expect(imagesEqual(fr, b.frames[i])).toBe(true));
    expect(a.frames.some((fr, i) => !imagesEqual(fr, c.frames[i]))).toBe(true);
  });
});
