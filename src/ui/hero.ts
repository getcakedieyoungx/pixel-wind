import { generate, type RGBAImage } from '../core';
import { decodeFile } from './io';

// Scene colours (art, not UI chrome): flat sky bands, no gradients.
const SKY = ['#5ec4cc', '#72cdd3', '#8ad7d9', '#a6e2de'];
const CLOUD = ['#f4fcfb', '#d6f1f1', '#afdfe2'];
const HILL_FAR = '#8acbb7';
const HILL_NEAR = '#66b08f';
const GROUND = ['#3f8c4f', '#2f6b56'];
const FPS = 6;

type Frames = HTMLCanvasElement[];

function toCanvas(img: RGBAImage): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
  return c;
}

async function load(url: string): Promise<RGBAImage> {
  return decodeFile(await (await fetch(url)).blob());
}

function sway(img: RGBAImage, seed: number, strength: 1 | 2): Frames {
  return generate(img, { strength, frames: 8, seed }).frames.map(toCanvas);
}

/** A puffy cloud: union of discs, lit from the top-left, 3 flat tones. */
function cloud(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const discs: [number, number, number][] = [];
  for (let i = 0; i < 7; i++) {
    const r = h * (0.28 + rnd() * 0.18);
    discs.push([r + rnd() * (w - 2 * r), h - r - rnd() * h * 0.25, r]);
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let best = -1;
      for (const [cx, cy, r] of discs) {
        const d = Math.hypot(x - cx, y - cy) / r;
        // light from above: tops of the puffs bright, undersides shaded
        if (d <= 1) best = Math.max(best, -(y - cy) / r - 0.15 * ((x - cx) / r));
      }
      if (best === -1) continue;
      ctx.fillStyle = CLOUD[best > -0.2 ? 0 : best > -0.65 ? 1 : 2];
      ctx.fillRect(x, y, 1, 1);
    }
  return c;
}

function hills(ctx: CanvasRenderingContext2D, W: number, base: number, amp: number, colour: string, k: number): void {
  ctx.fillStyle = colour;
  for (let x = 0; x < W; x++) {
    const h = Math.max(0, Math.round(amp * (0.6 + 0.4 * Math.sin(x * 0.021 * k + k) + 0.25 * Math.sin(x * 0.057 * k + 2 * k))));
    ctx.fillRect(x, base - h, 1, h + 1);
  }
}

export async function startHero(canvas: HTMLCanvasElement): Promise<void> {
  // the hero tree is yalpo's own art (© all rights reserved), shown as the demo
  const [tree, grass] = await Promise.all(['/demo-sprite.png', '/art/grass.png'].map(load));
  const treeF = sway(tree, 11, 2);
  const grassF = sway(grass, 14, 1);
  const clouds = [cloud(120, 44, 1), cloud(160, 56, 2), cloud(90, 34, 3)];

  let W = 0;
  let H = 0;
  let tick = 0;
  let bg: HTMLCanvasElement | null = null;

  function layout(): void {
    const vw = canvas.parentElement!.clientWidth;
    const vh = canvas.parentElement!.clientHeight;
    // zoom so the tree fills about two thirds of the height, but the scene stays wider than the tree
    const byHeight = Math.round((vh * 0.64) / tree.height);
    const byWidth = Math.floor(vw / (tree.width * 1.25));
    const s = Math.max(2, Math.min(8, byHeight, byWidth));
    W = Math.ceil(vw / s);
    H = Math.ceil(vh / s);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = `${W * s}px`;
    canvas.style.height = `${H * s}px`;

    // static background: sky bands, hills, ground
    bg = document.createElement('canvas');
    bg.width = W;
    bg.height = H;
    const g = bg.getContext('2d')!;
    const horizon = Math.round(H * 0.7);
    SKY.forEach((c, i) => {
      g.fillStyle = c;
      const y0 = Math.round((horizon * i) / SKY.length);
      g.fillRect(0, y0, W, horizon - y0);
    });
    hills(g, W, horizon, H * 0.1, HILL_FAR, 1);
    g.fillStyle = HILL_NEAR; // no gap between the far hills and the field
    g.fillRect(0, horizon, W, 4);
    hills(g, W, horizon + 3, H * 0.05, HILL_NEAR, 1.7);
    g.fillStyle = GROUND[0];
    g.fillRect(0, horizon + 3, W, H);
    g.fillStyle = GROUND[1];
    g.fillRect(0, H - 8, W, 8);
  }

  function draw(): void {
    if (!bg) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bg, 0, 0);
    const horizon = Math.round(H * 0.7);

    // clouds drift one whole pixel every other tick
    const drift = Math.floor(tick / 2);
    const cy = [0.1, 0.3, 0.5];
    clouds.forEach((c, i) => {
      const span = W + c.width;
      const x = Math.round(((i * 0.37 * span + drift * (1 + i * 0.5)) % span) - c.width);
      ctx.drawImage(c, x, Math.round(horizon * cy[i]));
    });

    const f = tick % 8;
    const baseBack = horizon + 6;
    const baseFront = H - 4;
    const narrow = W < 260;
    for (let x = 0; x < W; x += grassF[0].width) ctx.drawImage(grassF[(f + 2) % 8], x, baseBack - grassF[0].height + 2);
    // scattered tufts across the field, fixed positions
    const field = H - baseBack;
    for (let i = 0; i < 7; i++) {
      const x = Math.round(((i * 0.618034) % 1) * W) - 40;
      const y = baseBack + Math.round(field * (0.25 + ((i * 0.3819) % 1) * 0.5));
      ctx.drawImage(grassF[(f + i) % 8], 0, 0, 48, grassF[0].height, x, y - grassF[0].height, 48, grassF[0].height);
    }
    const c = treeF[f];
    ctx.drawImage(c, Math.round(W * (narrow ? 0.5 : 0.66) - c.width / 2), baseFront - c.height);
    for (let x = -30; x < W; x += grassF[0].width) ctx.drawImage(grassF[f], x, H - grassF[0].height);
  }

  layout();
  draw();
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      layout();
      draw();
    }, 150);
  });
  window.setInterval(() => {
    tick++;
    draw();
  }, 1000 / FPS);
}
