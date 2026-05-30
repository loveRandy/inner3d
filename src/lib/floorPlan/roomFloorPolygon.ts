import type { FloorPlan, Room, Vec2, WallSegment } from '@/types/floorPlan';
import { dist2d, getWallQuad } from './wallGeometry';

function midpoint(a: Vec2, b: Vec2): Vec2 {
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

/** 取墙体四边形中朝向房间内侧的一条边（沿墙走向的两角点） */
export function getWallInnerEdgeCorners(
  wall: WallSegment,
  toward: Vec2,
): { startCorner: Vec2; endCorner: Vec2 } {
  const [p0, p1, p2, p3] = getWallQuad(wall);
  const sideA = midpoint(p0, p1);
  const sideB = midpoint(p2, p3);
  const useSideA = dist2d(sideA, toward) <= dist2d(sideB, toward);

  if (useSideA) {
    return { startCorner: p0, endCorner: p1 };
  }
  return { startCorner: p3, endCorner: p2 };
}

function intersectInnerEdges(origin1: Vec2, dir1: Vec2, origin2: Vec2, dir2: Vec2): Vec2 {
  const cross = dir1.x * dir2.z - dir1.z * dir2.x;
  if (Math.abs(cross) < 1e-10) {
    return {
      x: (origin1.x + origin2.x) / 2,
      z: (origin1.z + origin2.z) / 2,
    };
  }
  const dx = origin2.x - origin1.x;
  const dz = origin2.z - origin1.z;
  const t = (dx * dir2.z - dz * dir2.x) / cross;
  return {
    x: origin1.x + dir1.x * t,
    z: origin1.z + dir1.z * t,
  };
}

/** 按墙环拓扑顺序排列墙段 */
export function getOrderedRoomWalls(floorPlan: FloorPlan, room: Room): WallSegment[] {
  const wallIds = room.wallLoop;
  if (wallIds.length === 0) return [];

  const ordered: WallSegment[] = [];
  let prevNodeId: string | null = null;

  for (let i = 0; i < wallIds.length; i++) {
    const wall = floorPlan.walls[wallIds[i]];
    if (!wall) return [];

    if (prevNodeId === null) {
      const nextWall = floorPlan.walls[wallIds[(i + 1) % wallIds.length]];
      if (!nextWall) {
        ordered.push(wall);
        prevNodeId = wall.endNodeId;
        continue;
      }
      const connectsAtEnd =
        wall.endNodeId === nextWall.startNodeId || wall.endNodeId === nextWall.endNodeId;
      prevNodeId = connectsAtEnd ? wall.endNodeId : wall.startNodeId;
      ordered.push(wall);
      continue;
    }

    ordered.push(wall);
    prevNodeId = prevNodeId === wall.startNodeId ? wall.endNodeId : wall.startNodeId;
  }

  return ordered;
}

/** 根据墙环拓扑顺序，生成房间内地面填充多边形（墙体内侧边界，墙角 miter 求交） */
export function getRoomFloorPolygon(floorPlan: FloorPlan, room: Room): Vec2[] {
  const walls = getOrderedRoomWalls(floorPlan, room);
  if (walls.length < 3) return [];

  const edges = walls.map((wall) => {
    const { startCorner, endCorner } = getWallInnerEdgeCorners(wall, room.centroid);
    return {
      origin: startCorner,
      dir: { x: endCorner.x - startCorner.x, z: endCorner.z - startCorner.z },
    };
  });

  const verts: Vec2[] = [];
  for (let i = 0; i < edges.length; i++) {
    const prev = edges[(i - 1 + edges.length) % edges.length];
    const curr = edges[i];
    verts.push(intersectInnerEdges(prev.origin, prev.dir, curr.origin, curr.dir));
  }

  return verts;
}
