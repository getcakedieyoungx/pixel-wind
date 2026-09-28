import { generate } from '../core';
import { decodeFile } from './io';

const FPS = 6;

/**
 * Hero: yalpo's tree (© all rights reserved) swaying on the dark page, nothing
 * else. Drawn at 1:1 into a small canvas and scaled by a whole number in CSS.
 */
export async function startHero(canvas: HTMLCanvasElement): Promise<void> {
  const tree = await decodeFile(await (await fetch('demo-sprite.png')).blob());
  const frames = generate(tree, { strength: 2, frames: 8, seed: 11 }).frames.map((f) => {
    const c = document.createElement('canvas');
    c.width = f.width;
    c.height = f.height;
    c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
    return c;
  });

  canvas.width = tree.width;
  canvas.height = tree.height;
  let tick = 0;

  function fit(): void {
    const box = canvas.parentElement!;
    // largest whole-number zoom that keeps the tree within ~72% of the height and the width
    const s = Math.max(1, Math.floor(Math.min((box.clientHeight * 0.72) / tree.height, (box.clientWidth * 0.9) / tree.width)));
    canvas.style.width = `${tree.width * s}px`;
    canvas.style.height = `${tree.height * s}px`;
  }

  function draw(): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frames[tick % frames.length], 0, 0);
  }

  fit();
  draw();
  let t = 0;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = window.setTimeout(fit, 150);
  });
  window.setInterval(() => {
    tick++;
    draw();
  }, 1000 / FPS);
}
