import type { Opening, WallSegment } from '@/types/floorPlan';
import { pointOnWallAtOffset, wallAngleDeg } from '@/lib/floorPlan/wallGeometry';

export interface OpeningLayout3D {
  position: [number, number, number];
  rotation: [number, number, number];
  width: number;
  height: number;
  thickness: number;
  sillY: number;
  innerSign: number;
}

export function getOpeningLayout3D(wall: WallSegment, opening: Opening): OpeningLayout3D {
  const center = pointOnWallAtOffset(wall, opening.offset + opening.width / 2);
  const angle = wallAngleDeg(wall) * (Math.PI / 180);
  return {
    position: [center.x, opening.sillHeight + opening.height / 2, center.z],
    rotation: [0, -angle, 0],
    width: opening.width,
    height: opening.height,
    thickness: wall.thickness,
    sillY: opening.sillHeight,
    innerSign: opening.flip ? -1 : 1,
  };
}
