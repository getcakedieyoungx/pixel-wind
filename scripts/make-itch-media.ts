import { mkdirSync, writeFileSync } from 'node:fs';
import { createImage, generate, type RGBAImage } from '../src/core';
import { encodeGif } from '../src/export/gif';
import { stampMark } from '../src/export/watermark';
import { loadPng } from '../tests/helpers/sprites';

// itch.io page media in the site's palette (src/ui/style.css)
const BG = [0x11, 0x11, 0x11, 255];
const HEAD = [0xa9, 0xd8, 0xd2, 255];
const META = [0x7a, 0x95, 0x95, 255];

const BIG: Record<string, string[]> = {
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#.#.#', '#..##', '#...#', '#...#'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  ' ': ['...', '...', '...', '...', '...', '...', '...'],
};
const SMALL: Record<string, string[]> = {
  S: ['###', '#..', '###', '..#', '###'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  E: ['###', '#..', '##.', '#..', '###'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  '-': ['...', '...', '###', '...', '...'],
  F: ['###', '#..', '##.', '#..', '#..'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  ' ': ['..', '..', '..', '..', '..'],
};

function fill(img: RGBAImage, c: number[]) {
  for (let i = 0; i < img.width * img.height; i++) img.data.set(c, i * 4);
}

function text(img: RGBAImage, s: string, font: Record<string, string[]>, x: number, y: number, k: number, c: number[]) {
  let cx = x;
  for (const ch of s) {
    const g = font[ch];
    g.forEach((row, j) =>
      [...row].forEach((p, i) => {
        if (p !== '#') return;
        for (let dy = 0; dy < k; dy++)
          for (let dx = 0; dx < k; dx++) img.data.set(c, ((y + j * k + dy) * img.width + cx + i * k + dx) * 4);
      }),
    );
    cx += (g[0].length + 1) * k;
  }
}

function paste(dst: RGBAImage, src: RGBAImage, x: number, y: number) {
  for (let j = 0; j < src.height; j++)
    for (let i = 0; i < src.width; i++) {
      const si = (j * src.width + i) * 4;
      if (src.data[si + 3] < 128) continue;
      dst.data.set(src.data.subarray(si, si + 4), ((y + j) * dst.width + x + i) * 4);
    }
}

const tree = loadPng('public/demo-sprite.png');
const { frames } = generate(tree, { strength: 2, frames: 12, seed: 20260813 });

// banner: 480×170 base, exported at 2× (960×340)
const banner = frames.map((f) => {
  const img = createImage(480, 170);
  fill(img, BG);
  text(img, 'PIXEL WIND', BIG, 28, 52, 3, HEAD);
  text(img, 'SHIMMER-FREE WIND', SMALL, 28, 90, 2, META);
  text(img, 'FOR PIXEL ART', SMALL, 28, 104, 2, META);
  paste(img, f, 300, 12);
  return stampMark(img);
});

// the demo tree alone, on the page background
const sway = frames.map((f) => {
  const img = createImage(170, 162);
  fill(img, [0x1a, 0x1a, 0x1a, 255]);
  paste(img, f, 10, 6);
  return stampMark(img);
});

mkdirSync('docs/media', { recursive: true });
writeFileSync('docs/media/itch-banner.gif', encodeGif(banner, { delayMs: 120, scale: 2 }));
writeFileSync('docs/media/itch-sway.gif', encodeGif(sway, { delayMs: 120, scale: 3 }));
console.log('wrote docs/media/itch-banner.gif, docs/media/itch-sway.gif');
