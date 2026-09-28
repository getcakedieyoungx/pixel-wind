/**
 * Lean per frame: rest -> lean right -> soft max -> back through neutral ->
 * slight left -> ease back. Wraps last -> first continuously.
 */
export const WIND8: readonly number[] = [0.0, 0.35, 0.72, 1.0, 0.6, 0.1, -0.48, -0.3];

/** Periodic linear sample of `table` at fractional index `t`. */
export function envAt(table: readonly number[], t: number): number {
  const n = table.length;
  const tt = ((t % n) + n) % n;
  const i0 = Math.floor(tt);
  const frac = tt - i0;
  return table[i0 % n] * (1 - frac) + table[(i0 + 1) % n] * frac;
}

/** WIND8 resampled to `frames` steps; index 0 is always the rest pose. */
export function windTable(frames: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < frames; i++) out.push(envAt(WIND8, (i * 8) / frames));
  return out;
}
