import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import type { CanvasViewState } from './canvasView';
import { worldToScreen } from './canvasView';
import { dist2d } from './wallGeometry';

export interface AlignSnapResult {
  point: Vec2;
  verticalGuides: number[];
  horizontalGuides: number[];
  intersection: Vec2 | null;
}

export interface ScreenGuideLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  axis: 'x' | 'z';
}

const GUIDE_PIXEL_THRESHOLD = 12;

/** 根据屏幕像素换算世界坐标吸附阈值 */
export function alignThresholdWorld(view: CanvasViewState): number {
  const scale = (Math.min(view.width, view.height) / view.worldSpan) * view.zoom;
  return GUIDE_PIXEL_THRESHOLD / Math.max(scale, 0.01);
}

/** 收集可对齐的参考点（墙端点、节点、当前链起点） */
export function collectAlignRefPoints(
  floorPlan: FloorPlan,
  chainStart: Vec2 | null,
): Vec2[] {
  const points: Vec2[] = [];

  for (const wall of Object.values(floorPlan.walls)) {
    points.push(wall.start, wall.end);
  }
  for (const pos of Object.values(floorPlan.nodes)) {
    points.push(pos);
  }
  if (chainStart) points.push(chainStart);

  return dedupePoints(points, 0.02);
}

function dedupePoints(points: Vec2[], minDist: number): Vec2[] {
  const result: Vec2[] = [];
  for (const p of points) {
    if (!result.some((q) => dist2d(p, q) < minDist)) {
      result.push(p);
    }
  }
  return result;
}

/**
 * 将点对齐到参考点的 X / Z，用于直角墙绘制
 */
export function applyAlignSnap(
  point: Vec2,
  refs: Vec2[],
  threshold: number,
  excludeNear?: Vec2,
): AlignSnapResult {
  let bestDx = threshold;
  let bestDz = threshold;
  let snapX: number | null = null;
  let snapZ: number | null = null;
  const verticalGuides: number[] = [];
  const horizontalGuides: number[] = [];

  for (const ref of refs) {
    if (excludeNear && dist2d(ref, excludeNear) < 0.02) continue;

    const dx = Math.abs(point.x - ref.x);
    if (dx < bestDx) {
      bestDx = dx;
      snapX = ref.x;
    }
    if (dx < threshold && !verticalGuides.includes(ref.x)) {
      verticalGuides.push(ref.x);
    }

    const dz = Math.abs(point.z - ref.z);
    if (dz < bestDz) {
      bestDz = dz;
      snapZ = ref.z;
    }
    if (dz < threshold && !horizontalGuides.includes(ref.z)) {
      horizontalGuides.push(ref.z);
    }
  }

  const snapped: Vec2 = {
    x: snapX ?? point.x,
    z: snapZ ?? point.z,
  };

  const intersection =
    snapX !== null && snapZ !== null ? { x: snapX, z: snapZ } : null;

  return {
    point: snapped,
    verticalGuides,
    horizontalGuides,
    intersection,
  };
}

/** 世界坐标对齐线 → 屏幕贯穿线 */
export function buildScreenGuideLines(
  align: Pick<AlignSnapResult, 'verticalGuides' | 'horizontalGuides'>,
  view: CanvasViewState,
): ScreenGuideLine[] {
  const lines: ScreenGuideLine[] = [];
  const half = view.worldSpan / 2;

  for (const x of align.verticalGuides) {
    const top = worldToScreen({ x, z: view.panZ - half }, view);
    const bottom = worldToScreen({ x, z: view.panZ + half }, view);
    lines.push({
      x1: top.x,
      y1: 0,
      x2: bottom.x,
      y2: view.height,
      axis: 'x',
    });
  }

  for (const z of align.horizontalGuides) {
    const left = worldToScreen({ x: view.panX - half, z }, view);
    const right = worldToScreen({ x: view.panX + half, z }, view);
    lines.push({
      x1: 0,
      y1: left.y,
      x2: view.width,
      y2: right.y,
      axis: 'z',
    });
  }

  return lines;
}
