import { createImage, type RGBAImage } from '../core/image';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SheetJson {
  frames: Record<
    string,
    {
      frame: Rect;
      rotated: false;
      trimmed: false;
      spriteSourceSize: Rect;
      sourceSize: { w: number; h: number };
      duration: number;
    }
  >;
  meta: {
    app: string;
    version: string;
    image: string;
    format: 'RGBA8888';
    size: { w: number; h: number };
    scale: '1';
    frameTags: { name: string; from: number; to: number; direction: 'forward' }[];
  };
}

export function buildSheet(frames: RGBAImage[]): RGBAImage {
  const w = frames[0].width;
  const h = frames[0].height;
  const sheet = createImage(w * frames.length, h);
  frames.forEach((f, k) => {
    for (let y = 0; y < h; y++) sheet.data.set(f.data.subarray(y * w * 4, (y + 1) * w * 4), (y * sheet.width + k * w) * 4);
  });
  return sheet;
}

/** Same shape as Aseprite's "Export Sprite Sheet" JSON (hash), so engines' importers accept it. */
export function sheetJson(frames: RGBAImage[], fps: number, name: string): SheetJson {
  const w = frames[0].width;
  const h = frames[0].height;
  const duration = Math.round(1000 / fps);
  const out: SheetJson['frames'] = {};
  frames.forEach((_, k) => {
    out[`${name} ${k}.png`] = {
      frame: { x: k * w, y: 0, w, h },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
      duration,
    };
  });
  return {
    frames: out,
    meta: {
      app: 'https://github.com/getcakedieyoungx/pixel-wind',
      version: '0.1.0',
      image: `${name}_wind_sheet.png`,
      format: 'RGBA8888',
      size: { w: w * frames.length, h },
      scale: '1',
      frameTags: [{ name: 'wind', from: 0, to: frames.length - 1, direction: 'forward' }],
    },
  };
}
