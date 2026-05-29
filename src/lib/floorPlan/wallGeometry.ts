import type { Vec2, WallAlign, WallSegment } from '@/types/floorPlan';

export function dist2d(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.hypot(dx, dz);
}

export function wallLength(wall: WallSegment): number {
  return dist2d(wall.start, wall.end);
}

export function wallAngleDeg(wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  return (Math.atan2(dz, dx) * 180) / Math.PI;
}

/** 墙段方向单位向量 */
export function wallDirection(wall: WallSegment): Vec2 {
  const len = wallLength(wall);
  if (len < 1e-6) return { x: 1, z: 0 };
  return {
    x: (wall.end.x - wall.start.x) / len,
    z: (wall.end.z - wall.start.z) / len,
  };
}

/** 内侧法线（逆时针 90°） */
export function wallInnerNormal(wall: WallSegment): Vec2 {
  const dir = wallDirection(wall);
  return { x: -dir.z, z: dir.x };
}

function offsetPoint(point: Vec2, normal: Vec2, amount: number): Vec2 {
  return { x: point.x + normal.x * amount, z: point.z + normal.z * amount };
}

/** 根据定位线计算墙体四边形角点（用于 2D/3D 渲染） */
export function getWallQuad(wall: WallSegment): [Vec2, Vec2, Vec2, Vec2] {
  const half = wall.thickness / 2;
  const normal = wallInnerNormal(wall);
  let offset = 0;
  if (wall.align === 'inner') offset = half;
  else if (wall.align === 'outer') offset = -half;

  const centerStart = offsetPoint(wall.start, normal, offset);
  const centerEnd = offsetPoint(wall.end, normal, offset);

  const p0 = offsetPoint(centerStart, normal, half);
  const p1 = offsetPoint(centerEnd, normal, half);
  const p2 = offsetPoint(centerEnd, normal, -half);
  const p3 = offsetPoint(centerStart, normal, -half);
  return [p0, p1, p2, p3];
}

export function applyOrtho(start: Vec2, end: Vec2): Vec2 {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  if (Math.abs(dx) >= Math.abs(dz)) return { x: end.x, z: start.z };
  return { x: start.x, z: end.z };
}

export function pointOnWallAtOffset(wall: WallSegment, offset: number): Vec2 {
  const dir = wallDirection(wall);
  return {
    x: wall.start.x + dir.x * offset,
    z: wall.start.z + dir.z * offset,
  };
}

export function projectPointOnWall(
  wall: WallSegment,
  p: Vec2,
): { offset: number; distance: number; t: number } {
  const dx = wall.end.x - wall.start.x;
  const dz = wall.end.z - wall.start.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-8) {
    return { offset: 0, distance: dist2d(p, wall.start), t: 0 };
  }
  const t = Math.max(
    0,
    Math.min(1, ((p.x - wall.start.x) * dx + (p.z - wall.start.z) * dz) / lenSq),
  );
  const proj = { x: wall.start.x + t * dx, z: wall.start.z + t * dz };
  return {
    offset: t * Math.sqrt(lenSq),
    distance: dist2d(p, proj),
    t,
  };
}

export function setWallLengthFromEnd(wall: WallSegment, lengthM: number): Vec2 {
  const dir = wallDirection(wall);
  return {
    x: wall.start.x + dir.x * lengthM,
    z: wall.start.z + dir.z * lengthM,
  };
}

export function setWallLengthFromStart(wall: WallSegment, lengthM: number): Vec2 {
  const dir = wallDirection(wall);
  return {
    x: wall.end.x - dir.x * lengthM,
    z: wall.end.z - dir.z * lengthM,
  };
}

export function rotateWallEnd(wall: WallSegment, angleDeg: number): Vec2 {
  const len = wallLength(wall);
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: wall.start.x + Math.cos(rad) * len,
    z: wall.start.z + Math.sin(rad) * len,
  };
}

export function alignLabel(align: WallAlign): string {
  if (align === 'inner') return '内部';
  if (align === 'outer') return '外部';
  return '中心';
}
