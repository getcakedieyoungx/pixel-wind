import { analyze } from './analyze';
import { buildField } from './field';
import type { RGBAImage } from './image';
import { checkInvariants } from './invariants';
import { renderFrames } from './render';
import type { AutoParams, InvariantResult, WindOptions } from './types';

export interface GenerateResult {
  frames: RGBAImage[];
  report: InvariantResult[];
  params: AutoParams;
}

export function generate(src: RGBAImage, opts: WindOptions): GenerateResult {
  const params = analyze(src, opts.pinY);
  const field = buildField(src.width, src.height, params, opts.seed);
  const { frames, maxDx, maxDy } = renderFrames(src, params, field, opts);
  const report = checkInvariants(src, frames, { pinY: params.pinY, strength: opts.strength, maxDx, maxDy });
  return { frames, report, params };
}
