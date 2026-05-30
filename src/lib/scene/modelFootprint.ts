import { Box3, Object3D } from 'three';
import type { Transform } from '@/types/scene';
import type { Vec2 } from '@/types/floorPlan';

export interface ModelFootprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const DEG2RAD = Math.PI / 180;

export function computeFootprintFromObject(scene: Object3D): ModelFootprint {
  const box = new Box3().setFromObject(scene);
  return {
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z,
  };
}

export function createDefaultFootprint(size = 0.5): ModelFootprint {
  const half = size / 2;
  return { minX: -half, maxX: half, minZ: -half, maxZ: half };
}

function localFootprintCorners(footprint: ModelFootprint): Vec2[] {
  return [
    { x: footprint.minX, z: footprint.minZ },
    { x: footprint.maxX, z: footprint.minZ },
    { x: footprint.maxX, z: footprint.maxZ },
    { x: footprint.minX, z: footprint.maxZ },
  ];
}

export function transformFootprintCorners(footprint: ModelFootprint, transform: Transform): Vec2[] {
  const ry = transform.rotation.y * DEG2RAD;
  const cos = Math.cos(ry);
  const sin = Math.sin(ry);
  const sx = transform.scale.x;
  const sz = transform.scale.z;

  return localFootprintCorners(footprint).map((corner) => {
    const lx = corner.x * sx;
    const lz = corner.z * sz;
    return {
      x: transform.position.x + lx * cos - lz * sin,
      z: transform.position.z + lx * sin + lz * cos,
    };
  });
}

export function footprintCenter(corners: Vec2[]): Vec2 {
  const sum = corners.reduce(
    (acc, c) => ({ x: acc.x + c.x, z: acc.z + c.z }),
    { x: 0, z: 0 },
  );
  return { x: sum.x / corners.length, z: sum.z / corners.length };
}

export function boundsFromCorners(corners: Vec2[]): ModelFootprint {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const c of corners) {
    minX = Math.min(minX, c.x);
    maxX = Math.max(maxX, c.x);
    minZ = Math.min(minZ, c.z);
    maxZ = Math.max(maxZ, c.z);
  }
  return { minX, maxX, minZ, maxZ };
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersects =
      zi > point.z !== zj > point.z &&
      point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
