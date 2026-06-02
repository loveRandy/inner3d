import type { FloorPlan, Vec2 } from '@/types/floorPlan';

export interface CanvasViewState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panZ: number;
  worldSpan: number;
}

export function createDefaultViewState(width: number, height: number): CanvasViewState {
  return {
    width,
    height,
    zoom: 1,
    panX: 0,
    panZ: 0,
    worldSpan: 16,
  };
}

export function worldToScreen(point: Vec2, view: CanvasViewState): { x: number; y: number } {
  const scale = (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
  return {
    x: (point.x - view.panX) * scale + view.width / 2,
    y: (point.z - view.panZ) * scale + view.height / 2,
  };
}

export function screenToWorld(sx: number, sy: number, view: CanvasViewState): Vec2 {
  const scale = (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
  return {
    x: (sx - view.width / 2) / scale + view.panX,
    z: (sy - view.height / 2) / scale + view.panZ,
  };
}

export function getViewScale(view: CanvasViewState): number {
  return (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
}

export const FLOOR_PLAN_ZOOM_MIN = 0.25;
export const FLOOR_PLAN_ZOOM_MAX = 4;

export function clampFloorPlanZoom(zoom: number): number {
  return Math.max(FLOOR_PLAN_ZOOM_MIN, Math.min(FLOOR_PLAN_ZOOM_MAX, zoom));
}

/** 以屏幕坐标为锚点缩放，保持鼠标下的世界点位置不变 */
export function zoomViewAtScreen(
  view: CanvasViewState,
  panX: number,
  panZ: number,
  zoom: number,
  screenX: number,
  screenY: number,
  nextZoom: number,
): { panX: number; panZ: number; zoom: number } {
  const clampedZoom = clampFloorPlanZoom(nextZoom);
  if (clampedZoom === zoom) return { panX, panZ, zoom };

  const anchor = screenToWorld(screenX, screenY, { ...view, zoom, panX, panZ });
  const newScale = getViewScale({ ...view, zoom: clampedZoom });
  return {
    zoom: clampedZoom,
    panX: anchor.x - (screenX - view.width / 2) / newScale,
    panZ: anchor.z - (screenY - view.height / 2) / newScale,
  };
}

export function panViewByScreenDelta(
  panX: number,
  panZ: number,
  view: CanvasViewState,
  screenDx: number,
  screenDy: number,
): { panX: number; panZ: number } {
  const scale = getViewScale(view);
  return {
    panX: panX - screenDx / scale,
    panZ: panZ - screenDy / scale,
  };
}

export interface ScreenLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GridLine extends ScreenLine {
  major: boolean;
}

function isMajorGridLine(value: number, sectionSize: number): boolean {
  if (sectionSize <= 0) return false;
  const n = value / sectionSize;
  return Math.abs(n - Math.round(n)) < 1e-4;
}

/** 根据当前视口生成可见范围内的网格线（与 3D Grid 的 cellSize / sectionSize 一致） */
export function buildVisibleGridLines(
  view: CanvasViewState,
  gridSize: number,
  sectionSize = gridSize * 5,
  paddingWorld = 1,
): GridLine[] {
  if (gridSize <= 0) return [];

  const topLeft = screenToWorld(0, 0, view);
  const bottomRight = screenToWorld(view.width, view.height, view);

  const minX = Math.min(topLeft.x, bottomRight.x) - paddingWorld;
  const maxX = Math.max(topLeft.x, bottomRight.x) + paddingWorld;
  const minZ = Math.min(topLeft.z, bottomRight.z) - paddingWorld;
  const maxZ = Math.max(topLeft.z, bottomRight.z) + paddingWorld;

  const startX = Math.floor(minX / gridSize) * gridSize;
  const endX = Math.ceil(maxX / gridSize) * gridSize;
  const startZ = Math.floor(minZ / gridSize) * gridSize;
  const endZ = Math.ceil(maxZ / gridSize) * gridSize;

  const lines: GridLine[] = [];
  for (let x = startX; x <= endX + gridSize * 0.001; x += gridSize) {
    const a = worldToScreen({ x, z: minZ }, view);
    const b = worldToScreen({ x, z: maxZ }, view);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: isMajorGridLine(x, sectionSize) });
  }
  for (let z = startZ; z <= endZ + gridSize * 0.001; z += gridSize) {
    const a = worldToScreen({ x: minX, z }, view);
    const b = worldToScreen({ x: maxX, z }, view);
    lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, major: isMajorGridLine(z, sectionSize) });
  }
  return lines;
}

export function formatLengthMm(meters: number): string {
  return `${Math.round(meters * 1000)}`;
}

export function parseLengthMm(mm: string): number | null {
  const value = Number(mm);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value / 1000;
}

/** 将视图 fit 到多边形外接范围（地台设计画布用） */
export function fitViewToPolygon(
  polygon: Vec2[],
  paddingRatio = 0.1,
): Pick<CanvasViewState, 'panX' | 'panZ' | 'zoom' | 'worldSpan'> {
  if (polygon.length < 3) {
    return { panX: 0, panZ: 0, zoom: 1, worldSpan: 16 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const p of polygon) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  const spanX = maxX - minX;
  const spanZ = maxZ - minZ;
  const span = Math.max(spanX, spanZ, 1) * (1 + paddingRatio * 2);

  return {
    panX: (minX + maxX) / 2,
    panZ: (minZ + maxZ) / 2,
    zoom: 1,
    worldSpan: span,
  };
}

/** 将视图 fit 到户型全部墙体范围（户型平面图面板用） */
export function fitViewToFloorPlanBounds(
  floorPlan: FloorPlan,
  paddingRatio = 0.12,
): Pick<CanvasViewState, 'panX' | 'panZ' | 'zoom' | 'worldSpan'> {
  const points: Vec2[] = [];
  for (const id of floorPlan.wallIds) {
    const wall = floorPlan.walls[id];
    if (wall) {
      points.push(wall.start, wall.end);
    }
  }
  if (points.length === 0) {
    return { panX: 0, panZ: 0, zoom: 1, worldSpan: 16 };
  }
  return fitViewToPolygon(points, paddingRatio);
}
