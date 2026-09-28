import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildSheet, sheetJson } from '../../src/export/sheet';
import { buildZip } from '../../src/export/zip';
import { generate } from '../../src/core';
import { bush } from '../helpers/sprites';

const { frames } = generate(bush(), { strength: 2, frames: 6, seed: 1 });

describe('sprite sheet', () => {
  it('lays frames out horizontally', () => {
    const sheet = buildSheet(frames);
    expect(sheet.width).toBe(32 * 6);
    expect(sheet.height).toBe(32);
    // top-left pixel row of cell 3 equals frame 3's first row
    const row = sheet.data.subarray(3 * 32 * 4, 4 * 32 * 4);
    expect(row).toEqual(frames[3].data.subarray(0, 32 * 4));
  });

  it('writes Aseprite-style JSON with a forward wind tag', () => {
    const j = sheetJson(frames, 6, 'bush');
    const keys = Object.keys(j.frames);
    expect(keys.length).toBe(6);
    expect(j.frames['bush 2.png'].frame).toEqual({ x: 64, y: 0, w: 32, h: 32 });
    expect(j.frames['bush 0.png'].duration).toBe(167);
    expect(j.meta.size).toEqual({ w: 192, h: 32 });
    expect(j.meta.frameTags).toEqual([{ name: 'wind', from: 0, to: 5, direction: 'forward' }]);
  });
});

describe('zip', () => {
  it('contains every frame, the sheet and the JSON', () => {
    const files = unzipSync(buildZip(frames, 6, 'bush'));
    expect(Object.keys(files).sort()).toEqual(
      [
        'bush_wind_sheet.json',
        'bush_wind_sheet.png',
        'frames/bush_01.png',
        'frames/bush_02.png',
        'frames/bush_03.png',
        'frames/bush_04.png',
        'frames/bush_05.png',
        'frames/bush_06.png',
      ].sort(),
    );
    expect(JSON.parse(strFromU8(files['bush_wind_sheet.json'])).meta.image).toBe('bush_wind_sheet.png');
  });
});
