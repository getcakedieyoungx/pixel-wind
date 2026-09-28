import { mkdirSync, writeFileSync } from 'node:fs';
import { rotateSway } from '../src/compare/rotate';
import { generate } from '../src/core';
import { encodeGif } from '../src/export/gif';
import { buildSheet } from '../src/export/sheet';
import { loadPng } from '../tests/helpers/sprites';

const src = loadPng('public/demo-sprite.png');
const frames = 12 as const;
const ours = generate(src, { strength: 2, frames, seed: 20260813 });
const theirs = rotateSway(src, ours.params, frames);
// each output frame = [rotation | ours] side by side
const pairs = ours.frames.map((f, k) => buildSheet([theirs[k], f]));
mkdirSync('docs/media', { recursive: true });
writeFileSync('docs/media/compare.gif', encodeGif(pairs, { delayMs: 120, scale: 3 }));
console.log('wrote docs/media/compare.gif');
