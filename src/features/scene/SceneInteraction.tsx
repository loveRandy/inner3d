import { useEffect, useRef } from 'react';
import type { Mesh } from 'three';
import { Mesh as MeshClass } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSceneStore } from '@/stores/sceneStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useEditorStore } from '@/stores/editorStore';
import { createAddModelCommand } from '@/lib/commands';
import { getAssetById } from '@/features/assets';
import { publicUrl } from '@/lib/assets/publicUrl';
import { getGroundOffset } from '@/lib/scene/modelUtils';
import { snapToGrid } from '@/lib/math/snap';

export function SceneInteraction() {
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const setSelection = useSceneStore((s) => s.setSelection);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const execute = useHistoryStore((s) => s.execute);
  const isTransformDragging = useEditorStore((s) => s.isTransformDragging);
  const gizmoPointerActive = useEditorStore((s) => s.gizmoPointerActive);
  const meshRef = useRef<Mesh>(null);

  const asset = placementAssetId ? getAssetById(placementAssetId) : null;
  const { scene } = useGLTF(asset?.modelUrl ?? publicUrl('/models/kaykit/chair_A.gltf'));
  const groundOffset = asset ? getGroundOffset(asset.modelUrl, scene) : 0;

  // 有选中物体时禁用地面射线，避免点击 XYZ 轴时射线穿透到地面导致失焦
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const blockGroundRaycast =
      !placementAssetId &&
      (selectedIds.length > 0 || isTransformDragging || gizmoPointerActive);

    if (blockGroundRaycast) {
      mesh.raycast = () => {};
    } else {
      mesh.raycast = MeshClass.prototype.raycast;
    }
  }, [placementAssetId, selectedIds, isTransformDragging, gizmoPointerActive]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();

    if (placementAssetId && asset) {
      const point = e.point;
      const snapped = snapToGrid({ x: point.x, y: 0, z: point.z }, gridSize);
      execute(
        createAddModelCommand(placementAssetId, {
          x: snapped.x,
          y: groundOffset * (asset.defaultScale?.y ?? 1),
          z: snapped.z,
        }),
      );
      return;
    }

    if (isTransformDragging || gizmoPointerActive) return;

    setSelection([]);
    setHoveredEntity(null);
  };

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={handlePointerDown}
      userData={{ isGround: true }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}
