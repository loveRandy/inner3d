import * as THREE from 'three';
import { getFloorMaterialPresetById } from '@/features/platformDesign/floorMaterials';

const TEXTURE_SIZE = 256;
const THUMB_SIZE = 96;

const textureCache = new Map<string, THREE.CanvasTexture>();
const thumbCache = new Map<string, string>();

type DrawTile = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillBase(ctx: CanvasRenderingContext2D, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

function drawWoodPlanks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  planks: { x: number; width: number; color: string }[],
  seam: string,
) {
  fillBase(ctx, w, h, base);
  for (const p of planks) {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x * w, 0, p.width * w, h);
  }
  ctx.strokeStyle = seam;
  ctx.lineWidth = Math.max(1, h * 0.035);
  ctx.beginPath();
  ctx.moveTo(0, h - ctx.lineWidth);
  ctx.lineTo(w, h - ctx.lineWidth);
  ctx.stroke();
  for (const p of planks.slice(0, -1)) {
    const x = (p.x + p.width) * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

function drawWoodLight(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawWoodPlanks(
    ctx,
    w,
    h,
    '#e8dcc8',
    [
      { x: 0, width: 0.42, color: '#dcc9a8' },
      { x: 0.46, width: 0.32, color: '#d4bf9a' },
      { x: 0.82, width: 0.18, color: '#e2d0b4' },
    ],
    '#b8a078',
  );
}

function drawWoodOak(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawWoodPlanks(
    ctx,
    w,
    h,
    '#d4b896',
    [
      { x: 0, width: 0.35, color: '#c4a574' },
      { x: 0.38, width: 0.28, color: '#b89560' },
      { x: 0.7, width: 0.3, color: '#cea978' },
    ],
    '#8b6914',
  );
}

function drawWoodWalnut(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawWoodPlanks(
    ctx,
    w,
    h,
    '#4a3426',
    [
      { x: 0, width: 0.4, color: '#5c4033' },
      { x: 0.43, width: 0.3, color: '#3d2a20' },
      { x: 0.76, width: 0.24, color: '#6b4a38' },
    ],
    '#2a1a12',
  );
}

function drawWoodTeak(ctx: CanvasRenderingContext2D, w: number, h: number) {
  drawWoodPlanks(
    ctx,
    w,
    h,
    '#c9a66b',
    [
      { x: 0, width: 0.38, color: '#b8956a' },
      { x: 0.42, width: 0.34, color: '#a88455' },
      { x: 0.8, width: 0.2, color: '#c4a060' },
    ],
    '#7a5a30',
  );
}

function drawTileGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tile: string,
  grout: string,
  cols = 4,
  rows = 4,
) {
  fillBase(ctx, w, h, grout);
  const gw = Math.max(1, w * 0.018);
  const tw = (w - gw * (cols + 1)) / cols;
  const th = (h - gw * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gw + c * (tw + gw);
      const y = gw + r * (th + gw);
      ctx.fillStyle = tile;
      ctx.fillRect(x, y, tw, th);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(x, y, tw, th * 0.15);
    }
  }
}

function drawMarble(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  vein: string,
  seed: number,
) {
  fillBase(ctx, w, h, base);
  const rand = mulberry32(seed);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = vein;
  for (let i = 0; i < 8; i++) {
    ctx.lineWidth = 1 + rand() * 2.5;
    ctx.beginPath();
    let x = rand() * w;
    let y = rand() * h;
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (rand() - 0.5) * w * 0.35;
      y += (rand() - 0.3) * h * 0.25;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGranite(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, seed: number) {
  fillBase(ctx, w, h, base);
  const rand = mulberry32(seed);
  for (let i = 0; i < 900; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 0.5 + rand() * 2.5;
    const g = Math.floor(rand() * 40);
    ctx.fillStyle = `rgba(${g},${g},${g},${0.15 + rand() * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNoiseFabric(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  seed: number,
  weave = false,
) {
  fillBase(ctx, w, h, base);
  const rand = mulberry32(seed);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * 18;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
  if (weave) {
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}

function drawCarpet(ctx: CanvasRenderingContext2D, w: number, h: number, base: string, seed: number) {
  fillBase(ctx, w, h, base);
  const rand = mulberry32(seed);
  for (let i = 0; i < 2500; i++) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillStyle = `rgba(0,0,0,${0.02 + rand() * 0.06})`;
    ctx.fillRect(x, y, 1, 1 + rand() * 2);
  }
}

const DRAWERS: Record<string, DrawTile> = {
  'tex-concrete': (ctx, w, h) => drawNoiseFabric(ctx, w, h, '#9ca3af', 11),
  'tex-linen': (ctx, w, h) => drawNoiseFabric(ctx, w, h, '#d6d3d1', 22, true),
  'tex-weave': (ctx, w, h) => drawNoiseFabric(ctx, w, h, '#a8a29e', 33, true),
  'tex-paper': (ctx, w, h) => drawNoiseFabric(ctx, w, h, '#f5f5f4', 44),
  'tile-white': (ctx, w, h) => drawTileGrid(ctx, w, h, '#f8fafc', '#cbd5e1'),
  'tile-gray': (ctx, w, h) => drawTileGrid(ctx, w, h, '#cbd5e1', '#94a3b8'),
  'tile-beige': (ctx, w, h) => drawTileGrid(ctx, w, h, '#e7e5e4', '#a8a29e'),
  'tile-blue': (ctx, w, h) => drawTileGrid(ctx, w, h, '#93c5fd', '#64748b'),
  'stone-marble-white': (ctx, w, h) => drawMarble(ctx, w, h, '#e5e7eb', '#94a3b8', 101),
  'stone-marble-gray': (ctx, w, h) => drawMarble(ctx, w, h, '#94a3b8', '#475569', 102),
  'stone-granite': (ctx, w, h) => drawGranite(ctx, w, h, '#78716c', 103),
  'stone-slate': (ctx, w, h) => drawGranite(ctx, w, h, '#57534e', 104),
  'wood-grain-light': drawWoodLight,
  'wood-oak': drawWoodOak,
  'wood-walnut': drawWoodWalnut,
  'wood-teak': drawWoodTeak,
  'carpet-beige': (ctx, w, h) => drawCarpet(ctx, w, h, '#d6cfc7', 201),
  'carpet-gray': (ctx, w, h) => drawCarpet(ctx, w, h, '#9ca3af', 202),
  'carpet-blue': (ctx, w, h) => drawCarpet(ctx, w, h, '#64748b', 203),
  'carpet-green': (ctx, w, h) => drawCarpet(ctx, w, h, '#6b9080', 204),
};

function drawPreset(ctx: CanvasRenderingContext2D, presetId: string, w: number, h: number) {
  const drawer = DRAWERS[presetId];
  if (drawer) {
    drawer(ctx, w, h);
    return;
  }
  const color = getFloorMaterialPresetById(presetId)?.color ?? '#cccccc';
  fillBase(ctx, w, h, color);
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** 生成可平铺的 Canvas 贴图 */
export function createFloorMaterialCanvasTexture(presetId: string): THREE.CanvasTexture {
  const cached = textureCache.get(presetId);
  if (cached) return cached;

  const preset = getFloorMaterialPresetById(presetId);
  const repeatMm = preset?.repeatMm ?? { x: 600, y: 600 };
  const aspect = repeatMm.x / Math.max(repeatMm.y, 1);
  const width = TEXTURE_SIZE;
  const height = Math.max(64, Math.round(TEXTURE_SIZE / aspect));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (ctx) drawPreset(ctx, presetId, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  textureCache.set(presetId, texture);
  return texture;
}

/** 材质缩略图（用于左侧面板、光标跟随） */
export function getFloorMaterialThumbnailUrl(presetId: string): string {
  const cached = thumbCache.get(presetId);
  if (cached) return cached;

  const canvas = createCanvas(THUMB_SIZE, THUMB_SIZE);
  const ctx = canvas.getContext('2d');
  if (ctx) drawPreset(ctx, presetId, THUMB_SIZE, THUMB_SIZE);

  const url = canvas.toDataURL('image/png');
  thumbCache.set(presetId, url);
  return url;
}

/** 2D SVG pattern 平铺尺寸（米） */
export function getFloorMaterialPatternSizeM(presetId: string): { x: number; z: number } {
  const preset = getFloorMaterialPresetById(presetId);
  const repeatMm = preset?.repeatMm ?? { x: 600, y: 600 };
  return { x: repeatMm.x / 1000, z: repeatMm.y / 1000 };
}
