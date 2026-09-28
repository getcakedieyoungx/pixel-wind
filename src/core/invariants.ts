import { packPixel, type RGBAImage } from './image';
import type { InvariantResult } from './types';

export interface InvariantContext {
  pinY: number;
  strength: number;
  maxDx: number;
  maxDy: number;
}

function changedPixels(a: RGBAImage, b: RGBAImage): number {
  let c = 0;
  for (let i = 0; i < a.data.length; i += 4) if (packPixel(a.data, i) !== packPixel(b.data, i)) c++;
  return c;
}

export function checkInvariants(src: RGBAImage, frames: RGBAImage[], ctx: InvariantContext): InvariantResult[] {
  const out: InvariantResult[] = [];

  const restDiff = changedPixels(src, frames[0]);
  out.push({
    name: 'rest-frame',
    pass: restDiff === 0,
    detail: restDiff === 0 ? 'Frame 1 is identical to your sprite.' : `Frame 1 differs from your sprite in ${restDiff} px.`,
  });

  const colours = new Set<number>();
  const alphas = new Set<number>();
  for (let i = 0; i < src.data.length; i += 4) {
    alphas.add(src.data[i + 3]);
    if (src.data[i + 3] > 0) colours.add(packPixel(src.data, i));
  }
  let newColour = 0;
  let badAlpha = 0;
  for (const f of frames)
    for (let i = 0; i < f.data.length; i += 4) {
      const a = f.data[i + 3];
      if (!alphas.has(a)) badAlpha++;
      if (a > 0 && !colours.has(packPixel(f.data, i))) newColour++;
    }
  out.push({
    name: 'no-new-colours',
    pass: newColour === 0,
    detail: newColour === 0 ? 'Every pixel uses a colour from your sprite.' : `${newColour} px use colours not in your sprite.`,
  });
  out.push({
    name: 'alpha',
    pass: badAlpha === 0,
    detail: badAlpha === 0 ? 'No new transparency levels.' : `${badAlpha} px have transparency levels not in your sprite.`,
  });

  const start = Math.max(0, ctx.pinY) * src.width * 4;
  let pinBad = 0;
  for (const f of frames)
    for (let i = start; i < src.data.length; i += 4) if (packPixel(f.data, i) !== packPixel(src.data, i)) pinBad++;
  out.push({
    name: 'pinned-rows',
    pass: pinBad === 0,
    detail: pinBad === 0 ? 'Everything below the pin line stays still.' : `${pinBad} px moved below the pin line.`,
  });

  out.push({
    name: 'max-displacement',
    pass: ctx.maxDx <= ctx.strength && ctx.maxDy <= 1,
    detail: `Max move ${ctx.maxDx} px sideways, ${ctx.maxDy} px vertically (limit ${ctx.strength} / 1).`,
  });

  if (frames.length < 2) {
    out.push({ name: 'seamless-loop', pass: true, detail: 'Single frame.' });
    return out;
  }
  const steps: number[] = [];
  for (let k = 0; k + 1 < frames.length; k++) steps.push(changedPixels(frames[k], frames[k + 1]));
  const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
  const wrap = changedPixels(frames[frames.length - 1], frames[0]);
  out.push({
    name: 'seamless-loop',
    pass: wrap <= Math.max(2 * mean, 4),
    detail: `Last → first changes ${wrap} px (other steps average ${mean.toFixed(0)}).`,
  });
  return out;
}
