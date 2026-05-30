import type { FloorPlan, Vec2, WallSegment } from '@/types/floorPlan';
import { wallInnerNormal, wallLength } from './wallGeometry';

const DIM_OFFSET_GAP = 0.35;

export interface WallDimensionSpec {
  key: string;
  wallId: string;
  start: Vec2;
  end: Vec2;
  lengthM: number;
}

function wallMidpoint(wall: WallSegment): Vec2 {
  return {
    x: (wall.start.x + wall.end.x) / 2,
    z: (wall.start.z + wall.end.z) / 2,
  };
}

function offsetNormalToward(wall: WallSegment, target: Vec2): Vec2 {
  const inner = wallInnerNormal(wall);
  const mid = wallMidpoint(wall);
  const toTarget = { x: target.x - mid.x, z: target.z - mid.z };
  const dot = inner.x * toTarget.x + inner.z * toTarget.z;
  return dot >= 0 ? inner : { x: -inner.x, z: -inner.z };
}

function offsetWallCenterline(
  wall: WallSegment,
  normal: Vec2,
): { start: Vec2; end: Vec2 } {
  const distance = wall.thickness / 2 + DIM_OFFSET_GAP;
  return {
    start: {
      x: wall.start.x + normal.x * distance,
      z: wall.start.z + normal.z * distance,
    },
    end: {
      x: wall.end.x + normal.x * distance,
      z: wall.end.z + normal.z * distance,
    },
  };
}

/** 为每个房间的内侧生成墙段长度标注（整段墙长，不按门窗拆分） */
export function buildWallDimensionSpecs(floorPlan: FloorPlan): WallDimensionSpec[] {
  const specs: WallDimensionSpec[] = [];
  const covered = new Set<string>();

  for (const roomId of floorPlan.roomIds) {
    const room = floorPlan.rooms[roomId];
    if (!room) continue;

    for (const wallId of room.wallLoop) {
      const key = `${roomId}:${wallId}`;
      if (covered.has(key)) continue;
      covered.add(key);

      const wall = floorPlan.walls[wallId];
      if (!wall) continue;

      const normal = offsetNormalToward(wall, room.centroid);
      const { start, end } = offsetWallCenterline(wall, normal);
      specs.push({
        key,
        wallId,
        start,
        end,
        lengthM: wallLength(wall),
      });
    }
  }

  const wallsInRooms = new Set(
    specs.map((spec) => spec.wallId),
  );

  for (const wallId of floorPlan.wallIds) {
    if (wallsInRooms.has(wallId)) continue;
    const wall = floorPlan.walls[wallId];
    if (!wall) continue;

    const normal = wallInnerNormal(wall);
    const { start, end } = offsetWallCenterline(wall, normal);
    specs.push({
      key: `orphan:${wallId}`,
      wallId,
      start,
      end,
      lengthM: wallLength(wall),
    });
  }

  return specs;
}
