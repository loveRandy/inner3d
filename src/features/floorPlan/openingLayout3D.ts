import type { Opening, WallSegment } from '@/types/floorPlan';
import {
  pointOnWallAtOffset,
  wallAngleDeg,
  wallInnerNormal,
} from '@/lib/floorPlan/wallGeometry';

/** 门窗相对墙面的外凸距离，避免与墙体重叠闪烁 */
export const OPENING_SURFACE_EPS = 0.045;

export interface OpeningLayout3D {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  thickness: number;
  sillY: number;
  /** 内侧墙面在局部 Z 上的位置（相对墙心） */
  innerFaceLocalZ: number;
  /** 外侧墙面在局部 Z 上的位置 */
  outerFaceLocalZ: number;
}

function getWallAlignOffset(wall: WallSegment): number {
  const half = wall.thickness / 2;
  if (wall.align === 'inner') return half;
  if (wall.align === 'outer') return -half;
  return 0;
}

/** 局部 +Z 轴在世界 XZ 平面的方向（与墙旋转 [0,-angle,0] 一致） */
function localZDirection(angleRad: number) {
  return { x: Math.sin(angleRad), z: Math.cos(angleRad) };
}

/** 计算墙内/外表面在局部坐标 Z 上的位置 */
export function getWallFaceLocalZ(wall: WallSegment): { inner: number; outer: number } {
  const angle = wallAngleDeg(wall) * (Math.PI / 180);
  const normal = wallInnerNormal(wall);
  const half = wall.thickness / 2;
  const lz = localZDirection(angle);
  const dot = normal.x * lz.x + normal.z * lz.z;
  const inner = -half * dot;
  return { inner, outer: -inner };
}

/** 在指定墙面上挂载构件的局部 Z（含外凸） */
export function getMountLocalZ(
  faceLocalZ: number,
  frameDepth: number,
  eps = OPENING_SURFACE_EPS,
): number {
  const outward = frameDepth / 2 + eps;
  const sign = faceLocalZ === 0 ? 1 : Math.sign(faceLocalZ);
  return faceLocalZ + sign * outward;
}

export function getOpeningLayout3D(wall: WallSegment, opening: Opening): OpeningLayout3D {
  const normal = wallInnerNormal(wall);
  const alignOff = getWallAlignOffset(wall);
  const along = pointOnWallAtOffset(wall, opening.offset + opening.width / 2);
  const angle = wallAngleDeg(wall) * (Math.PI / 180);
  const faces = getWallFaceLocalZ(wall);

  return {
    position: [
      along.x + normal.x * alignOff,
      opening.sillHeight + opening.height / 2,
      along.z + normal.z * alignOff,
    ],
    rotation: [0, -angle, 0],
    width: opening.width,
    height: opening.height,
    thickness: wall.thickness,
    sillY: opening.sillHeight,
    innerFaceLocalZ: faces.inner,
    outerFaceLocalZ: faces.outer,
  };
}

/** 门扇朝向的内侧墙面（flip 时换到外侧） */
export function getDoorFaceLocalZ(layout: OpeningLayout3D, flip?: boolean): number {
  return flip ? layout.outerFaceLocalZ : layout.innerFaceLocalZ;
}

/** 窗 / 门洞：双面可见，返回内外两个挂载 Z */
export function getDualFaceMountZ(
  layout: OpeningLayout3D,
  frameDepth: number,
): { inner: number; outer: number } {
  return {
    inner: getMountLocalZ(layout.innerFaceLocalZ, frameDepth),
    outer: getMountLocalZ(layout.outerFaceLocalZ, frameDepth),
  };
}