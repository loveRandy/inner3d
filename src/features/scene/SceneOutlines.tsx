import { useMemo } from 'react';
import { useSceneStore } from '@/stores/sceneStore';
import { useSceneRefsStore } from '@/stores/sceneRefsStore';
import { CombinedWireframeBounds, WireframeBounds } from './WireframeBounds';

/** 浅色背景下高对比度线框配色 */
const OUTLINE_COLORS = {
  hover: 'yellow',
  selected: '#1d4ed8',
  multiSelect: '#ea580c',
} as const;

export function SceneOutlines() {
  const hoveredEntityId = useSceneStore((s) => s.hoveredEntityId);
  const selectedIds = useSceneStore((s) => s.selectedIds);
  const rootIds = useSceneStore((s) => s.document.rootIds);
  const placementAssetId = useSceneStore((s) => s.placementAssetId);
  const refs = useSceneRefsStore((s) => s.refs);

  const topLevelSelected = useMemo(
    () => selectedIds.filter((id) => rootIds.includes(id)),
    [selectedIds, rootIds],
  );

  const showMultiSelectPreview = topLevelSelected.length >= 2;
  const hoverTarget =
    !placementAssetId && hoveredEntityId && !showMultiSelectPreview
      ? refs[hoveredEntityId]
      : null;

  const multiSelectTargets = useMemo(
    () => topLevelSelected.map((id) => refs[id]),
    [topLevelSelected, refs],
  );

  const hoverIsSelected =
    hoveredEntityId != null && selectedIds.includes(hoveredEntityId);

  return (
    <>
      {showMultiSelectPreview && (
        <CombinedWireframeBounds
          targets={multiSelectTargets}
          color={OUTLINE_COLORS.multiSelect}
          lineWidth={5}
        />
      )}
      {hoverTarget && !hoverIsSelected && (
        <WireframeBounds
          target={hoverTarget}
          color={OUTLINE_COLORS.hover}
          lineWidth={4.5}
        />
      )}
      {!showMultiSelectPreview &&
        selectedIds.length === 1 &&
        refs[selectedIds[0]] && (
          <WireframeBounds
            target={refs[selectedIds[0]]}
            color={OUTLINE_COLORS.selected}
            lineWidth={4}
          />
        )}
    </>
  );
}
