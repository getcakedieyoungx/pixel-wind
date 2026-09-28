import { describe, it, expect } from 'vitest';
import { generate, PixelWindError } from '../../src/core';
import { imagesEqual } from '../../src/core/image';
import type { FrameCount, Strength } from '../../src/core/types';
import { loadTree, bush, grass, blank } from '../helpers/sprites';

const sprites = { tree: loadTree(), bush: bush(), grass: grass() };

describe('generate', () => {
  for (const [name, src] of Object.entries(sprites))
    for (const seed of [1, 2, 20260813])
      for (const frames of [6, 8, 12] as FrameCount[])
        for (const strength of [1, 2, 3] as Strength[])
          it(`${name} seed=${seed} frames=${frames} strength=${strength}: all invariants pass`, () => {
            const r = generate(src, { strength, frames, seed });
            const failed = r.report.filter((x) => !x.pass);
            expect(failed).toEqual([]);
            expect(r.frames.some((fr) => !imagesEqual(fr, src))).toBe(true);
          });

  it('honours a pin override', () => {
    const r = generate(sprites.tree, { strength: 2, frames: 8, seed: 1, pinY: 60 });
    expect(r.params.pinY).toBe(60);
  });

  it('returns a static loop when nothing is above the pin', () => {
    const src = sprites.bush;
    const r = generate(src, { strength: 2, frames: 8, seed: 1, pinY: 0 });
    expect(r.params.clusters).toEqual([]);
    expect(r.frames.every((fr) => imagesEqual(fr, src))).toBe(true);
  });

  it('throws PixelWindError for empty sprites', () => {
    expect(() => generate(blank(4, 4), { strength: 2, frames: 8, seed: 1 })).toThrowError(PixelWindError);
  });
});
