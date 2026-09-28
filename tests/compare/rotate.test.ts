import { describe, it, expect } from 'vitest';
import { rotateSway } from '../../src/compare/rotate';
import { analyze } from '../../src/core/analyze';
import { imagesEqual } from '../../src/core/image';
import { loadTree } from '../helpers/sprites';

describe('rotateSway', () => {
  const src = loadTree();
  const p = analyze(src);
  const fr = rotateSway(src, p, 8);

  it('returns N frames, frame 0 unrotated', () => {
    expect(fr.length).toBe(8);
    expect(imagesEqual(fr[0], src)).toBe(true);
  });

  it('rotates the canopy on later frames', () => {
    expect(imagesEqual(fr[2], src)).toBe(false);
  });

  it('keeps rows below the pin line', () => {
    const start = p.pinY * src.width * 4;
    for (const f of fr) expect(f.data.subarray(start)).toEqual(src.data.subarray(start));
  });
});
