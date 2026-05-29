import type { FloorPlan, Vec2 } from '@/types/floorPlan';
import { SNAP_ENDPOINT } from '@/types/floorPlan';
import { dist2d } from './wallGeometry';

export function snapToGrid2d(point: Vec2, gridSize: number): Vec2 {
  if (gridSize <= 0) return point;
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    z: Math.round(point.z / gridSize) * gridSize,
  };
}

export function findNearestNode(
  floorPlan: FloorPlan,
  point: Vec2,
  threshold = SNAP_ENDPOINT,
): { nodeId: string; position: Vec2 } | null {
  let best: { nodeId: string; position: Vec2; dist: number } | null = null;
  for (const [nodeId, pos] of Object.entries(floorPlan.nodes)) {
    const d = dist2d(point, pos);
    if (d <= threshold && (!best || d < best.dist)) {
      best = { nodeId, position: pos, dist: d };
    }
  }
  return best ? { nodeId: best.nodeId, position: best.position } : null;
}

export function snapFloorPlanPoint(
  floorPlan: FloorPlan,
  point: Vec2,
  gridSize: number,
  autoJoin: boolean,
): { point: Vec2; nodeId: string | null } {
  const gridSnapped = snapToGrid2d(point, gridSize);
  if (autoJoin) {
    const nearest = findNearestNode(floorPlan, gridSnapped);
    if (nearest) return { point: nearest.position, nodeId: nearest.nodeId };
  }
  return { point: gridSnapped, nodeId: null };
}
