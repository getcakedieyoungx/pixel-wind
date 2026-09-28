import { describe, it, expect } from 'vitest';
import { WIND8, envAt, windTable } from '../../src/core/envelope';

describe('envelope', () => {
  it('8-frame table is the original choreography', () => {
    expect(windTable(8)).toEqual([...WIND8]);
  });

  it('resampled tables start at rest and have the right length', () => {
    for (const n of [6, 12]) {
      const t = windTable(n);
      expect(t.length).toBe(n);
      expect(t[0]).toBe(0);
    }
  });

  it('samples periodically with linear interpolation', () => {
    expect(envAt(WIND8, 8)).toBe(0);
    expect(envAt(WIND8, 2.5)).toBeCloseTo(0.86, 10);
    expect(envAt(WIND8, -0.5)).toBeCloseTo(-0.15, 10);
  });
});
