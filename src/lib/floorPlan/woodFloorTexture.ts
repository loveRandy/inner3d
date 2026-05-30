import * as THREE from 'three';

/** 与 2D 户型画布木纹 pattern 一致的世界单位尺寸（米） */
export const FLOOR_PLANK_WORLD_W = 1.15;
export const FLOOR_PLANK_WORLD_H = 0.16;

let cachedTexture: THREE.CanvasTexture | null = null;

function drawWoodPlankTile(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = '#e8dcc8';
  ctx.fillRect(0, 0, w, h);

  const planks: { x: number; width: number; color: string }[] = [
    { x: 0, width: w * 0.42, color: '#dcc9a8' },
    { x: w * 0.46, width: w * 0.32, color: '#d4bf9a' },
    { x: w * 0.82, width: w * 0.18, color: '#e2d0b4' },
  ];
  for (const plank of planks) {
    ctx.fillStyle = plank.color;
    ctx.fillRect(plank.x, 0, plank.width, h);
  }

  ctx.strokeStyle = '#b8a078';
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.beginPath();
  ctx.moveTo(0, h - ctx.lineWidth);
  ctx.lineTo(w, h - ctx.lineWidth);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(196, 173, 136, 0.55)';
  ctx.lineWidth = Math.max(1, w * 0.004);
  for (const x of [w * 0.42, w * 0.78]) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
}

/** 可平铺的木纹地板贴图（单例缓存） */
export function getWoodFloorTexture(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = Math.round((256 * FLOOR_PLANK_WORLD_H) / FLOOR_PLANK_WORLD_W);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    fallback.wrapS = fallback.wrapT = THREE.RepeatWrapping;
    fallback.colorSpace = THREE.SRGBColorSpace;
    cachedTexture = fallback;
    return fallback;
  }

  drawWoodPlankTile(ctx, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cachedTexture = texture;
  return texture;
}
