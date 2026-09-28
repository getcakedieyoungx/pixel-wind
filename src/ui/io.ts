import type { RGBAImage } from '../core';
import { ERRORS, PixelWindError } from '../core';

const PNG_SIG = [137, 80, 78, 71, 13, 10, 26, 10];

export async function decodeFile(file: Blob): Promise<RGBAImage> {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (!PNG_SIG.every((b, i) => head[i] === b)) throw new PixelWindError('NOT_PNG', ERRORS.NOT_PNG);
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  } catch {
    throw new PixelWindError('NOT_PNG', ERRORS.NOT_PNG);
  }
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  const id = ctx.getImageData(0, 0, bmp.width, bmp.height);
  return { width: id.width, height: id.height, data: id.data };
}

export function download(bytes: Uint8Array | string, name: string, type: string): void {
  const blob = new Blob([bytes as BlobPart], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
