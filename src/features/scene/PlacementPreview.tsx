import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Raycaster, Vector2, type Group } from 'three';
import { useSceneStore } from '@/stores/sceneStore';
import { getAssetById } from '@/features/assets';
import { publicUrl } from '@/lib/assets/publicUrl';
import { cloneScene, getGroundOffset } from '@/lib/scene/modelUtils';
import { snapToGrid } from '@/lib/math/snap';

const raycaster = new Raycaster();
const pointerNdc = new Vector2();

export function PlacementPreview() {
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const gridSize = useSceneStore((s) => s.document.settings.gridSize);
  const asset = placementAssetId ? getAssetById(placementAssetId) : null;
  const groupRef = useRef<Group>(null);
  const { camera, scene } = useThree();

  const { scene: gltfScene } = useGLTF(asset?.modelUrl ?? publicUrl('/models/kaykit/chair_A.gltf'));
  const cloned = useMemo(() => (asset ? cloneScene(gltfScene) : null), [gltfScene, asset]);
  const groundOffset = useMemo(
    () => (asset ? getGroundOffset(asset.modelUrl, gltfScene) : 0),
    [asset, gltfScene],
  );

  useFrame((state) => {
    if (!placementAssetId || !groupRef.current || !asset) return;

    pointerNdc.set(state.pointer.x, state.pointer.y);
    raycaster.setFromCamera(pointerNdc, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    const groundHit = hits.find((h) => h.object.userData.isGround);

    if (groundHit) {
      const snapped = snapToGrid({ x: groundHit.point.x, y: 0, z: groundHit.point.z }, gridSize);
      const scaleY = asset.defaultScale?.y ?? 1;
      groupRef.current.position.set(snapped.x, groundOffset * scaleY, snapped.z);
      groupRef.current.visible = true;
    } else {
      groupRef.current.visible = false;
    }
  });

  if (!placementAssetId || !asset || !cloned) return null;

  const scale = asset.defaultScale ?? { x: 1, y: 1, z: 1 };

  return (
    <group ref={groupRef} visible={false}>
      <primitive object={cloned} scale={[scale.x, scale.y, scale.z]} />
    </group>
  );
}
