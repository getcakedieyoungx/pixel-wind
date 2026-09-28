import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { encodePng } from '../../src/export/png';
import { bush } from '../helpers/sprites';

describe('encodePng', () => {
  it('round-trips through a real PNG decoder', () => {
    const img = bush();
    const bytes = encodePng(img);
    expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const back = PNG.sync.read(Buffer.from(bytes));
    expect(back.width).toBe(32);
    expect(back.height).toBe(32);
    expect(new Uint8Array(back.data)).toEqual(new Uint8Array(img.data));
  });
});
