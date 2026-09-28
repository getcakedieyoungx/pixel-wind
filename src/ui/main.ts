import { rotateSway } from '../compare/rotate';
import { ERRORS, generate, PixelWindError, type FrameCount, type GenerateResult, type RGBAImage, type Strength, type WindOptions } from '../core';
import { encodeGif, gifPalette, hasSemiTransparency } from '../export/gif';
import { encodePng } from '../export/png';
import { buildSheet, sheetJson } from '../export/sheet';
import { buildZip } from '../export/zip';
import { decodeFile, download } from './io';
import { Player } from './player';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const state = {
  src: null as RGBAImage | null,
  name: 'sprite',
  seed: 20260813,
  pinY: undefined as number | undefined,
  result: null as GenerateResult | null,
};

const viewCanvas = $<HTMLCanvasElement>('view');
const view = new Player(viewCanvas);
const cmp = new Player($<HTMLCanvasElement>('cmp'));

function options(): WindOptions {
  return {
    strength: Number($<HTMLSelectElement>('strength').value) as Strength,
    frames: Number($<HTMLSelectElement>('frames').value) as FrameCount,
    seed: state.seed,
    pinY: state.pinY,
  };
}

function fps(): number {
  const v = Number($<HTMLInputElement>('fps').value);
  return Number.isFinite(v) ? Math.min(24, Math.max(1, Math.round(v))) : 6;
}

function showError(msg: string | null): void {
  const el = $('error');
  el.hidden = msg === null;
  el.textContent = msg ?? '';
}

function renderBadges(res: GenerateResult): void {
  const all = res.report.every((r) => r.pass);
  const items = [
    { text: all ? '✓ pixel-perfect' : '✗ check failed', ok: all, title: '' },
    ...res.report.map((r) => ({ text: `${r.pass ? '✓' : '✗'} ${r.name}`, ok: r.pass, title: r.detail })),
  ];
  $('badges').replaceChildren(
    ...items.map((it) => {
      const li = document.createElement('li');
      li.className = it.ok ? 'ok' : 'bad';
      li.textContent = it.text;
      li.title = it.title;
      return li;
    }),
  );
}

function updateExports(res: GenerateResult): void {
  const tooMany = gifPalette(res.frames) === null;
  $<HTMLButtonElement>('dlGif').disabled = tooMany;
  const notes: string[] = [];
  if (tooMany) notes.push(ERRORS.TOO_MANY_COLORS);
  else if (state.src && hasSemiTransparency(state.src)) notes.push(ERRORS.SEMI_TRANSPARENT);
  $('exportNote').textContent = notes.join(' ');
}

function run(): void {
  if (!state.src) return;
  try {
    const opts = options();
    const res = generate(state.src, opts);
    state.result = res;
    state.pinY = res.params.pinY;
    view.pinY = res.params.pinY;
    view.setFrames(res.frames, fps());

    const compareOn = $<HTMLInputElement>('compare').checked;
    $('cmpFig').hidden = !compareOn;
    if (compareOn) cmp.setFrames(rotateSway(state.src, res.params, opts.frames), fps());
    else cmp.stop();

    renderBadges(res);
    updateExports(res);
    showError(res.params.clusters.length === 0 ? ERRORS.PIN_TOO_HIGH : null);
    $('work').hidden = false;
  } catch (e) {
    showError(e instanceof PixelWindError ? e.message : String(e));
    $('work').hidden = state.result === null;
  }
}

async function load(file: Blob, name: string): Promise<void> {
  try {
    state.src = await decodeFile(file);
    state.name = name.replace(/\.png$/i, '').replace(/[^\w-]+/g, '_') || 'sprite';
    state.pinY = undefined;
    state.result = null;
    run();
  } catch (e) {
    showError(e instanceof PixelWindError ? e.message : String(e));
  }
}

// --- loading
const drop = $('drop');
drop.addEventListener('dragover', (e) => {
  e.preventDefault();
  drop.classList.add('over');
});
drop.addEventListener('dragleave', () => drop.classList.remove('over'));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const f = e.dataTransfer?.files[0];
  if (f) void load(f, f.name);
});
$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) void load(f, f.name);
});
$('demo').addEventListener('click', async () => {
  const blob = await (await fetch('/demo-sprite.png')).blob();
  void load(blob, 'demo');
});

// --- controls
for (const id of ['strength', 'frames', 'fps', 'compare']) $(id).addEventListener('change', run);
$('shuffle').addEventListener('click', () => {
  state.seed = Math.floor(Math.random() * 2 ** 31);
  run();
});

// --- pin line drag
let dragging = false;
function pinFromEvent(e: PointerEvent): number {
  const rect = viewCanvas.getBoundingClientRect();
  const scale = viewCanvas.height / rect.height;
  return Math.round(((e.clientY - rect.top) * scale) / view.getZoom());
}
viewCanvas.addEventListener('pointerdown', (e) => {
  if (!state.result) return;
  dragging = true;
  viewCanvas.setPointerCapture(e.pointerId);
  view.pinY = pinFromEvent(e);
  view.draw();
});
viewCanvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  view.pinY = pinFromEvent(e);
  view.draw();
});
viewCanvas.addEventListener('pointerup', (e) => {
  if (!dragging) return;
  dragging = false;
  state.pinY = pinFromEvent(e);
  run();
});

// --- exports
$('dlGif').addEventListener('click', () => {
  if (!state.result) return;
  try {
    download(encodeGif(state.result.frames, { delayMs: 1000 / fps() }), `${state.name}_wind.gif`, 'image/gif');
  } catch (e) {
    showError(e instanceof PixelWindError ? e.message : String(e));
  }
});
$('dlSheet').addEventListener('click', () => {
  if (!state.result) return;
  const { frames } = state.result;
  download(encodePng(buildSheet(frames)), `${state.name}_wind_sheet.png`, 'image/png');
  download(JSON.stringify(sheetJson(frames, fps(), state.name), null, 1), `${state.name}_wind_sheet.json`, 'application/json');
});
$('dlZip').addEventListener('click', () => {
  if (!state.result) return;
  download(buildZip(state.result.frames, fps(), state.name), `${state.name}_wind.zip`, 'application/zip');
});
