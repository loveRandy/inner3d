import { useMemo } from 'react';
import type { WallSegment } from '@/types/floorPlan';
import { getWallQuad, wallAngleDeg, wallLength } from '@/lib/floorPlan/wallGeometry';
import { ARCH_COLORS } from './architectureStyle';

export function WallSelectionOutline({ wall }: { wall: WallSegment }) {
  const layout = useMemo(() => {
    const quad = getWallQuad(wall);
    const [p0, p1, p2, p3] = quad;
    const cx = (p0.x + p1.x + p2.x + p3.x) / 4;
    const cz = (p0.z + p1.z + p2.z + p3.z) / 4;
    const len = wallLength(wall);
    const angle = wallAngleDeg(wall) * (Math.PI / 180);
    return {
      position: [cx, wall.height / 2, cz] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      size: [len + 0.04, wall.height + 0.04, wall.thickness + 0.06] as [number, number, number],
    };
  }, [wall]);

  return (
    <mesh position={layout.position} rotation={layout.rotation}>
      <boxGeometry args={layout.size} />
      <meshBasicMaterial color={ARCH_COLORS.selection} wireframe transparent opacity={0.85} />
    </mesh>
  );
}
