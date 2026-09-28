import { cloneImage, type RGBAImage } from '../core/image';

export const MARK_TEXT = '© YALPO';

// 3×5 pixel glyphs ('#' = ink); © is 5×5
const GLYPHS: Record<string, string[]> = {
  '©': [' ### ', '# ###', '# #  ', '# ###', ' ### '],
  Y: ['# #', '# #', ' # ', ' # ', ' # '],
  A: [' # ', '# #', '###', '# #', '# #'],
  L: ['#  ', '#  ', '#  ', '#  ', '###'],
  P: ['## ', '# #', '## ', '#  ', '#  '],
  O: [' # ', '# #', '# #', '# #', ' # '],
  ' ': ['  ', '  ', '  ', '  ', '  '],
};

const INK = [240, 240, 236, 255];
const EDGE = [24, 24, 28, 255];

/** Copy of `img` with a small outlined "© YALPO" in the bottom-right corner. */
export function stampMark(img: RGBAImage, text = MARK_TEXT): RGBAImage {
  const out = cloneImage(img);
  const glyphs = [...text].map((ch) => GLYPHS[ch] ?? GLYPHS[' ']);
  const width = glyphs.reduce((a, g) => a + g[0].length + 1, -1);
  const x0 = img.width - width - 2;
  const y0 = img.height - 5 - 2;
  const ink = new Set<number>();
  let cx = x0;
  for (const g of glyphs) {
    g.forEach((row, j) => {
      [...row].forEach((c, i) => {
        if (c === '#') ink.add((y0 + j) * img.width + cx + i);
      });
    });
    cx += g[0].length + 1;
  }
  const put = (idx: number, c: number[]) => out.data.set(c, idx * 4);
  // 1 px dark outline around the ink so the mark reads on any background
  for (const idx of ink) {
    const x = idx % img.width;
    const y = Math.floor(idx / img.width);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        const n = ny * img.width + nx;
        if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height && !ink.has(n)) put(n, EDGE);
      }
  }
  for (const idx of ink) if (idx >= 0 && idx < img.width * img.height) put(idx, INK);
  return out;
}
