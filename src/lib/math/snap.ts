import type { Vec3 } from '@/types/scene';

/** TODO: P0 — 网格吸附 */
export function snapToGrid(position: Vec3, gridSize: number): Vec3 {
  if (gridSize <= 0) return position;
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: position.y,
    z: Math.round(position.z / gridSize) * gridSize,
  };
}
