export type Strength = 1 | 2 | 3;
export type FrameCount = 6 | 8 | 12;

export interface WindOptions {
  strength: Strength;
  frames: FrameCount;
  seed: number;
  /** Rows y >= pinY never move. Omit for automatic. */
  pinY?: number;
}

export interface Cluster {
  x: number;
  y: number;
  amp: number;
  lag: number;
}

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface AutoParams {
  pinY: number;
  bbox: BBox;
  cx: number;
  rx: number;
  clusters: Cluster[];
  noiseScale: number;
}

export interface InvariantResult {
  name: string;
  pass: boolean;
  detail: string;
}

export const MAX_SIZE = 512;

export const ERRORS = {
  NOT_PNG: 'Only PNG files are supported.',
  NO_OPAQUE: 'The sprite has no opaque pixels.',
  TOO_LARGE: 'Max 512×512 (plenty for pixel art).',
  PIN_TOO_HIGH: 'Move the pin line up — nothing above it to animate.',
  TOO_MANY_COLORS: 'GIF supports max 255 colours + transparency. Use the sprite sheet or ZIP instead.',
  SEMI_TRANSPARENT: 'Semi-transparent pixels are thresholded at 50% in the GIF.',
} as const;

export type PixelWindErrorCode = 'NOT_PNG' | 'NO_OPAQUE' | 'TOO_LARGE' | 'TOO_MANY_COLORS';

export class PixelWindError extends Error {
  constructor(
    public readonly code: PixelWindErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PixelWindError';
  }
}
