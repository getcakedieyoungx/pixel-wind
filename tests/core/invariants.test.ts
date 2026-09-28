import { describe, it, expect } from 'vitest';
import { checkInvariants } from '../../src/core/invariants';
import { cloneImage, type RGBAImage } from '../../src/core/image';
import { bush, put } from '../helpers/sprites';

const ctx = { pinY: 26, strength: 2, maxDx: 2, maxDy: 1 };
const byName = (r: ReturnType<typeof checkInvariants>, n: string) => r.find((x) => x.name === n)!;

function frames(n: number, src: RGBAImage) {
  return Array.from({ length: n }, () => cloneImage(src));
}

describe('checkInvariants', () => {
  it('passes a static loop and reports all six checks in order', () => {
    const src = bush();
    const r = checkInvariants(src, frames(8, src), ctx);
    expect(r.map((x) => x.name)).toEqual([
      'rest-frame',
      'no-new-colours',
      'alpha',
      'pinned-rows',
      'max-displacement',
      'seamless-loop',
    ]);
    expect(r.every((x) => x.pass)).toBe(true);
  });

  it('fails rest-frame when frame 0 differs', () => {
    const src = bush();
    const fr = frames(8, src);
    put(fr[0], 16, 5, [0, 0, 0, 0]);
    expect(byName(checkInvariants(src, fr, ctx), 'rest-frame').pass).toBe(false);
  });

  it('fails no-new-colours on a foreign colour', () => {
    const src = bush();
    const fr = frames(8, src);
    put(fr[3], 16, 5, [255, 0, 255, 255]);
    expect(byName(checkInvariants(src, fr, ctx), 'no-new-colours').pass).toBe(false);
  });

  it('fails alpha on a new transparency level', () => {
    const src = bush();
    const fr = frames(8, src);
    put(fr[3], 16, 5, [46, 94, 58, 128]);
    expect(byName(checkInvariants(src, fr, ctx), 'alpha').pass).toBe(false);
  });

  it('fails pinned-rows when something moves below the pin', () => {
    const src = bush();
    const fr = frames(8, src);
    put(fr[2], 15, 30, [0, 0, 0, 0]);
    expect(byName(checkInvariants(src, fr, ctx), 'pinned-rows').pass).toBe(false);
  });

  it('fails max-displacement over the cap', () => {
    const src = bush();
    const r = checkInvariants(src, frames(8, src), { ...ctx, maxDx: 3 });
    expect(byName(r, 'max-displacement').pass).toBe(false);
  });

  it('fails seamless-loop when the wrap jump is much bigger than the steps', () => {
    const src = bush();
    const fr = frames(4, src);
    for (let x = 4; x < 28; x++) for (let y = 1; y < 20; y++) put(fr[3], x, y, [0, 0, 0, 0]);
    expect(byName(checkInvariants(src, fr, ctx), 'seamless-loop').pass).toBe(false);
  });
});
