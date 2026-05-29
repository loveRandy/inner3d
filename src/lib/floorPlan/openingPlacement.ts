import type { FloorPlan, Opening, OpeningType, Vec2 } from '@/types/floorPlan';
import {
  DEFAULT_DOOR_HEIGHT,
  DEFAULT_DOOR_WIDTH,
  DEFAULT_OPENING_HEIGHT,
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_SILL,
  DEFAULT_WINDOW_WIDTH,
} from '@/types/floorPlan';
import { randomUUID } from '@/lib/id/randomUUID';
import { projectPointOnWall, wallLength } from './wallGeometry';

const WALL_HIT_DISTANCE = 0.25;
const OPENING_MARGIN = 0.05;

export function defaultOpeningSize(type: OpeningType): {
  width: number;
  height: number;
  sillHeight: number;
} {
  if (type === 'door') {
    return { width: DEFAULT_DOOR_WIDTH, height: DEFAULT_DOOR_HEIGHT, sillHeight: 0 };
  }
  if (type === 'window') {
    return {
      width: DEFAULT_WINDOW_WIDTH,
      height: DEFAULT_WINDOW_HEIGHT,
      sillHeight: DEFAULT_WINDOW_SILL,
    };
  }
  return { width: DEFAULT_DOOR_WIDTH, height: DEFAULT_OPENING_HEIGHT, sillHeight: 0 };
}

export function findWallAtPoint(
  floorPlan: FloorPlan,
  point: Vec2,
): { wallId: string; offset: number } | null {
  let best: { wallId: string; offset: number; distance: number } | null = null;

  for (const wallId of floorPlan.wallIds) {
    const wall = floorPlan.walls[wallId];
    if (!wall) continue;
    const proj = projectPointOnWall(wall, point);
    if (proj.distance > WALL_HIT_DISTANCE) continue;
  if (!best || proj.distance < best.distance) {
      best = { wallId, offset: proj.offset, distance: proj.distance };
    }
  }
  return best ? { wallId: best.wallId, offset: best.offset } : null;
}

export function clampOpeningOffset(
  wallLengthM: number,
  width: number,
  offset: number,
): number {
  const maxOffset = Math.max(OPENING_MARGIN, wallLengthM - width - OPENING_MARGIN);
  return Math.max(OPENING_MARGIN, Math.min(maxOffset, offset - width / 2));
}

export function createOpeningOnWall(
  floorPlan: FloorPlan,
  wallId: string,
  type: OpeningType,
  pickPoint: Vec2,
): Opening | null {
  const wall = floorPlan.walls[wallId];
  if (!wall) return null;

  const proj = projectPointOnWall(wall, pickPoint);
  const defaults = defaultOpeningSize(type);
  const len = wallLength(wall);
  const offset = clampOpeningOffset(len, defaults.width, proj.offset);

  return {
    id: randomUUID(),
    type,
    wallId,
    offset,
    width: defaults.width,
    height: defaults.height,
    sillHeight: defaults.sillHeight,
    flip: false,
  };
}
