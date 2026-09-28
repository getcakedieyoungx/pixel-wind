import { describe, it, expect } from 'vitest';
import { analyze, opaqueBBox } from '../../src/core/analyze';
import { PixelWindError } from '../../src/core/types';
import { blank, put, loadTree, bush } from '../helpers/sprites';

function rect(w: number, h: number, x0: number, y0: number, x1: number, y1: number) {
  const im = blank(w, h);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(im, x, y, [40, 120, 60, 255]);
  return im;
}

describe('analyze', () => {
  it('rejects fully transparent sprites', () => {
    expect(() => analyze(blank(8, 8))).toThrowError(PixelWindError);
    try {
      analyze(blank(8, 8));
    } catch (e) {
      expect((e as PixelWindError).code).toBe('NO_OPAQUE');
    }
  });

  it('rejects sprites larger than 512', () => {
    try {
      analyze(blank(513, 4));
      expect.unreachable();
    } catch (e) {
      expect((e as PixelWindError).code).toBe('TOO_LARGE');
    }
  });

  it('finds the opaque bounding box', () => {
    expect(opaqueBBox(rect(64, 64, 5, 10, 20, 49))).toEqual({ x0: 5, y0: 10, x1: 20, y1: 49 });
    expect(opaqueBBox(blank(4, 4))).toBeNull();
  });

  it('pins the bottom 20% by default', () => {
    // bbox height 40 -> floor(8) = 8 pinned rows -> pinY = 50 - 8 = 42
    expect(analyze(rect(64, 64, 5, 10, 20, 49)).pinY).toBe(42);
  });

  it('clamps a pin override into the bbox', () => {
    const im = rect(64, 64, 5, 10, 20, 49);
    expect(analyze(im, 999).pinY).toBe(50);
    expect(analyze(im, -5).pinY).toBe(10);
    expect(analyze(im, 30.6).pinY).toBe(31);
  });

  it('picks 3..8 clusters above the pin line, top one first', () => {
    for (const img of [loadTree(), bush()]) {
      const p = analyze(img);
      expect(p.clusters.length).toBeGreaterThanOrEqual(3);
      expect(p.clusters.length).toBeLessThanOrEqual(8);
      for (const c of p.clusters) expect(c.y).toBeLessThan(p.pinY);
      expect(p.clusters[0].y).toBe(p.bbox.y0);
      expect(p.clusters[0].lag).toBeCloseTo(0, 10);
      expect(p.clusters[0].amp).toBeCloseTo(1.1, 10);
    }
  });

  it('has no clusters when the pin line is at the top', () => {
    const im = rect(64, 64, 5, 10, 20, 49);
    expect(analyze(im, 10).clusters).toEqual([]);
  });

  it('matches the known values on the demo tree', () => {
    const p = analyze(loadTree());
    expect(p.bbox).toEqual({ x0: 8, y0: 18, x1: 121, y1: 157 });
    expect(p.pinY).toBe(130);
    expect(p.clusters.length).toBe(8);
  });
});
