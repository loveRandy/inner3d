import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Box3, Vector3, type Object3D } from 'three';
import { getAssetById } from '@/features/assets';
import { useEditorStore } from '@/stores/editorStore';
import { useSceneStore } from '@/stores/sceneStore';
import { annotateMeshKeys, findMeshByKey, resolvePartLabels } from '@/lib/scene/meshParts';
import { applyMaterialOverrides } from '@/lib/scene/materialUtils';
import { cloneScene } from '@/lib/scene/modelUtils';
import { publicUrl } from '@/lib/assets/publicUrl';
import { WireframeBounds } from '@/features/scene/WireframeBounds';

const MATERIAL_PREVIEW_BACKGROUND = '#dddddd';

function CameraFramer({ objectRef }: { objectRef: React.RefObject<{ root: import('three').Object3D | null }> }) {
  const { camera } = useThree();
  const framed = useRef(false);

  useFrame(() => {
    if (framed.current || !objectRef.current?.root) return;
    const box = new Box3().setFromObject(objectRef.current.root);
    if (box.isEmpty()) return;

    const center = box.getCenter(new Vector3());
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    const distance = maxDim * 2.2;

    camera.position.set(center.x + distance * 0.6, center.y + distance * 0.5, center.z + distance * 0.6);
    camera.lookAt(center);
    framed.current = true;
  });

  useEffect(() => {
    framed.current = false;
  }, [objectRef]);

  return null;
}

function resolveMeshKeyFromHit(object: Object3D, root: Object3D): string | null {
  let current: Object3D | null = object;
  while (current && current !== root) {
    const meshKey = current.userData.meshKey as string | undefined;
    if (meshKey) return meshKey;
    current = current.parent;
  }
  return null;
}

export function MaterialPreviewContent() {
  const materialMode = useEditorStore((s) => s.materialMode);
  const entityId = materialMode?.entityId;
  const entity = useSceneStore((s) =>
    entityId ? s.document.entities[entityId] : undefined,
  );
  const draftOverrides = materialMode?.draftOverrides ?? {};
  const selectedMeshKey = materialMode?.selectedMeshKey ?? null;
  const ambientIntensity = useSceneStore((s) => s.document.settings.ambientIntensity);
  const overrideKey = JSON.stringify(draftOverrides);

  const asset = entity?.assetId ? getAssetById(entity.assetId) : null;
  const { scene } = useGLTF(asset?.modelUrl ?? publicUrl('/models/kaykit/chair_A.gltf'));

  const objectRef = useRef<{ root: import('three').Object3D | null }>({ root: null });

  const cloned = useMemo(() => {
    if (!entityId) return null;
    const copy = cloneScene(scene);
    annotateMeshKeys(copy, entityId, resolvePartLabels(asset ?? undefined));
    applyMaterialOverrides(copy, draftOverrides);
    objectRef.current.root = copy;
    return copy;
  }, [scene, entityId, asset, overrideKey, draftOverrides]);

  const highlightTarget = useMemo(() => {
    if (!cloned || !selectedMeshKey) return null;
    return findMeshByKey(cloned, selectedMeshKey);
  }, [cloned, selectedMeshKey]);

  /** 选中部件与整模同尺寸时不画线框（单 mesh / 最外层） */
  const showPartWireframe = useMemo(() => {
    if (!cloned || !highlightTarget) return false;

    const wholeBox = new Box3().setFromObject(cloned);
    const partBox = new Box3().setFromObject(highlightTarget);
    if (wholeBox.isEmpty() || partBox.isEmpty()) return false;

    const wholeSize = wholeBox.getSize(new Vector3());
    const partSize = partBox.getSize(new Vector3());
    const tolerance = 0.02;

    return (
      Math.abs(wholeSize.x - partSize.x) > tolerance ||
      Math.abs(wholeSize.y - partSize.y) > tolerance ||
      Math.abs(wholeSize.z - partSize.z) > tolerance
    );
  }, [cloned, highlightTarget]);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!cloned) return;
    const meshKey = resolveMeshKeyFromHit(e.object, cloned);
    if (meshKey) {
      useEditorStore.getState().setSelectedMeshKey(meshKey);
    }
  };

  if (!cloned) return null;

  return (
    <>
      <color attach="background" args={[MATERIAL_PREVIEW_BACKGROUND]} />
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <hemisphereLight args={['#dbeafe', '#f8fafc', 0.35]} />

      <CameraFramer objectRef={objectRef} />
      <OrbitControls makeDefault />

      <group onClick={handleClick}>
        <primitive object={cloned} />
      </group>

      {showPartWireframe && highlightTarget && (
        <WireframeBounds target={highlightTarget} color="#1d4ed8" lineWidth={4} />
      )}
    </>
  );
}
