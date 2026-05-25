import { Html } from '@react-three/drei';
import { createPortal } from '@react-three/fiber';
import { useMemo } from 'react';
import { Box3 } from 'three';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { useEditorStore } from '@/stores/editorStore';
import { countMeshes } from '@/lib/scene/meshParts';

export function MaterialModeButton() {
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.document.entities);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const refs = useSceneRefsStore((s) => s.refs);
  const enterMaterialMode = useEditorStore((s) => s.enterMaterialMode);
  const materialMode = useEditorStore((s) => s.materialMode);

  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
  const entity = selectedId ? entities[selectedId] : null;
  const target = selectedId ? refs[selectedId] : null;

  const meshCount = useMemo(() => (target ? countMeshes(target) : 0), [target]);

  const labelOffsetY = useMemo(() => {
    if (!target) return 1;
    const box = new Box3().setFromObject(target);
    if (box.isEmpty()) return 1;
    const topLocal = target.worldToLocal(box.max.clone());
    return topLocal.y + 0.12;
  }, [target]);

  if (
    materialMode?.active ||
    placementAssetId ||
    !entity ||
    entity.type !== 'model' ||
    entity.locked ||
    !target ||
    meshCount === 0
  ) {
    return null;
  }

  return createPortal(
    <Html center position={[0, labelOffsetY, 0]} style={{ pointerEvents: 'auto' }}>
      <button
        type="button"
        className="material-mode-button"
        onClick={(e) => {
          e.stopPropagation();
          enterMaterialMode(selectedId!);
        }}
      >
        材质替换
      </button>
    </Html>,
    target,
  );
}
