import type { RGBAImage } from '../core';

const MAX_VIEW = 480;

/**
 * Plays frames on a canvas at the largest integer zoom that fits its container
 * (never CSS-scaled, so pixels stay square), with an optional pin line.
 */
export class Player {
  pinY: number | null = null;
  private bufs: HTMLCanvasElement[] = [];
  private idx = 0;
  private zoom = 1;
  private timer = 0;

  constructor(private canvas: HTMLCanvasElement) {
    let t = 0;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = window.setTimeout(() => this.fit(), 150);
    });
  }

  setFrames(frames: RGBAImage[], fps: number): void {
    this.bufs = frames.map((f) => {
      const c = document.createElement('canvas');
      c.width = f.width;
      c.height = f.height;
      c.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(f.data), f.width, f.height), 0, 0);
      return c;
    });
    this.idx = 0;
    this.fit();
    this.stop();
    this.timer = window.setInterval(() => {
      this.idx = (this.idx + 1) % this.bufs.length;
      this.draw();
    }, 1000 / fps);
  }

  private fit(): void {
    const b = this.bufs[0];
    if (!b) return;
    const avail = Math.min(MAX_VIEW, this.canvas.parentElement?.clientWidth || MAX_VIEW);
    this.zoom = Math.max(1, Math.floor(Math.min(avail / b.width, MAX_VIEW / b.height)));
    this.canvas.width = b.width * this.zoom;
    this.canvas.height = b.height * this.zoom;
    this.draw();
  }

  getZoom(): number {
    return this.zoom;
  }

  stop(): void {
    window.clearInterval(this.timer);
  }

  draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const b = this.bufs[this.idx];
    if (!b) return;
    ctx.drawImage(b, 0, 0, b.width * this.zoom, b.height * this.zoom);
    if (this.pinY !== null) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.9)';
      ctx.fillRect(0, this.pinY * this.zoom - 1, this.canvas.width, 2);
    }
  }
}
