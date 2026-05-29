import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import type { Opening, WallSegment } from '@/types/floorPlan';
import { pointOnWallAtOffset, wallAngleDeg, wallInnerNormal } from '@/lib/floorPlan/wallGeometry';
import { fitModelToOpening } from '@/lib/floorPlan/fitModelToOpening';
import { cloneScene } from '@/lib/scene/modelUtils';

interface OpeningGltfMeshProps {
  wall: WallSegment;
  opening: Opening;
  modelUrl: string;
  /** 相对墙厚的深度倍率（窗含墙框时略大于墙厚） */
  depthScale?: number;
  yOffset?: number;
}

export function OpeningGltfMesh({
  wall,
  opening,
  modelUrl,
  depthScale = 1,
  yOffset = 0,
}: OpeningGltfMeshProps) {
  const { scene } = useGLTF(modelUrl);

  const { position, rotation, content } = useMemo(() => {
    const center = pointOnWallAtOffset(wall, opening.offset + opening.width / 2);
    const angle = wallAngleDeg(wall) * (Math.PI / 180);
    const depth = wall.thickness * depthScale;

    const clone = cloneScene(scene);
    fitModelToOpening(clone, opening.width, opening.height, depth);

    if (opening.type === 'door' && opening.flip) {
      clone.scale.x *= -1;
    }

    if (opening.type === 'door') {
      const normal = wallInnerNormal(wall);
      const sign = opening.flip ? -1 : 1;
      const nz = normal.z * sign;
      clone.position.z += nz * wall.thickness * 0.12;
    }

    return {
      position: [center.x, opening.sillHeight + yOffset, center.z] as [number, number, number],
      rotation: [0, -angle, 0] as [number, number, number],
      content: clone,
    };
  }, [wall, opening, scene, depthScale, yOffset]);

  return (
    <group position={position} rotation={rotation}>
      <primitive object={content} castShadow receiveShadow />
    </group>
  );
}
