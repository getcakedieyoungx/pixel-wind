import { strToU8, zipSync } from 'fflate';
import type { RGBAImage } from '../core/image';
import { encodePng } from './png';
import { buildSheet, sheetJson } from './sheet';

export function buildZip(frames: RGBAImage[], fps: number, name: string): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  frames.forEach((f, k) => {
    files[`frames/${name}_${String(k + 1).padStart(2, '0')}.png`] = encodePng(f);
  });
  files[`${name}_wind_sheet.png`] = encodePng(buildSheet(frames));
  files[`${name}_wind_sheet.json`] = strToU8(JSON.stringify(sheetJson(frames, fps, name), null, 1));
  // PNGs are already deflated
  return zipSync(files, { level: 0 });
}
