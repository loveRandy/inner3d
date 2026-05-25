import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { MathUtils, type Group } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { useEditorStore } from '@/stores/editorStore';
import { getAssetById } from '@/features/assets';
import { applyEntityId, cloneScene } from '@/lib/scene/modelUtils';
import { annotateMeshKeys, resolvePartLabels } from '@/lib/scene/meshParts';
import { applyMaterialOverrides } from '@/lib/scene/materialUtils';
import { resolveRootEntityId } from '@/lib/transform/worldTransform';

interface SceneObjectProps {
  entityId: string;
  /** 是否注册到主视口 refs（俯视图应设为 false，避免覆盖主视口引用） */
  registerSceneRef?: boolean;
}

export function SceneObject({ entityId, registerSceneRef = true }: SceneObjectProps) {
  const entity = useSceneStore((s) => s.document.entities[entityId]);
  const entities = useSceneStore((s) => s.document.entities);
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const toggleSelection = useSceneStore((s) => s.toggleSelection);
  const setHoveredEntity = useSceneStore((s) => s.setHoveredEntity);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const isTransformDragging = useEditorStore((s) => s.isTransformDragging);
  const registerRef = useSceneRefsStore((s) => s.registerRef);
  const objectRef = useRef<Group | null>(null);

  const selectableId = useMemo(
    () => resolveRootEntityId(entityId, entities, rootIds),
    [entityId, entities, rootIds],
  );

  const isGroupChild = selectableId !== entityId;

  const bindRef = useCallback(
    (node: Group | null) => {
      objectRef.current = node;
      if (!isGroupChild && registerSceneRef) {
        registerRef(entityId, node);
      }
      if (node) {
        node.userData.entityId = entityId;
        node.userData.selectableId = selectableId;
      }
    },
    [entityId, selectableId, isGroupChild, registerRef, registerSceneRef],
  );

  useEffect(() => {
    if (isGroupChild || !registerSceneRef) return undefined;
    return () => registerRef(entityId, null);
  }, [entityId, isGroupChild, registerRef, registerSceneRef]);

  useEffect(() => {
    if (!objectRef.current || !entity || isTransformDragging) return;
    const t = entity.transform;
    objectRef.current.position.set(t.position.x, t.position.y, t.position.z);
    objectRef.current.rotation.set(
      MathUtils.degToRad(t.rotation.x),
      MathUtils.degToRad(t.rotation.y),
      MathUtils.degToRad(t.rotation.z),
    );
    objectRef.current.scale.set(t.scale.x, t.scale.y, t.scale.z);
  }, [entity, isTransformDragging]);

  if (!entity || entity.visible === false) return null;

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (entity.locked) return;
    if (useEditorStore.getState().gizmoPointerActive) return;
    toggleSelection(selectableId, e.nativeEvent.shiftKey);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (placementAssetId) return;
    setHoveredEntity(selectableId);
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredEntity(null);
  };

  if (entity.type === 'group') {
    return (
      <group
        ref={bindRef}
        onPointerDown={handlePointerDown}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {entity.children?.map((childId) => (
          <SceneObject key={childId} entityId={childId} />
        ))}
      </group>
    );
  }

  const asset = getAssetById(entity.assetId ?? '');
  if (!asset) return null;

  return (
    <ModelMesh
      ref={bindRef}
      modelUrl={asset.modelUrl}
      entityId={entityId}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );
}

interface ModelMeshProps {
  modelUrl: string;
  entityId: string;
  onPointerDown: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}

const ModelMesh = forwardRef<Group, ModelMeshProps>(function ModelMesh(
  { modelUrl, entityId, onPointerDown, onPointerOver, onPointerOut },
  ref,
) {
  const { scene } = useGLTF(modelUrl);
  const entity = useSceneStore((s) => s.document.entities[entityId]);
  const asset = getAssetById(entity?.assetId ?? '');
  const overrideKey = JSON.stringify(entity?.materialOverrides ?? {});

  const cloned = useMemo(() => {
    const copy = cloneScene(scene);
    applyEntityId(copy, entityId);
    annotateMeshKeys(copy, entityId, resolvePartLabels(asset));
    applyMaterialOverrides(copy, entity?.materialOverrides ?? {});
    return copy;
  }, [scene, entityId, asset, overrideKey, entity?.materialOverrides]);

  return (
    <group
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
    >
      <primitive object={cloned} />
    </group>
  );
});
