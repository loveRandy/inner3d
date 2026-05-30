import { getAssetById } from '@/features/assets';
import { publicUrl } from '@/lib/assets/publicUrl';
import { footprintCenter } from '@/lib/scene/modelFootprint';
import { getEntityFootprintCorners } from '@/lib/floorPlan/modelPick';
import { worldToScreen, type CanvasViewState } from '@/lib/floorPlan/canvasView';
import { useModelFootprintStore } from '@/stores/modelFootprintStore';
import { useSceneStore } from '@/stores/sceneStore';
import type { SceneEntity, Transform } from '@/types/scene';

function pointsToSvg(
  corners: { x: number; z: number }[],
  view: CanvasViewState,
): string {
  return corners
    .map((p) => {
      const s = worldToScreen(p, view);
      return `${s.x},${s.y}`;
    })
    .join(' ');
}

interface ModelSymbol2DProps {
  entityId: string;
  entity: SceneEntity;
  view: CanvasViewState;
  transformOverride?: Transform;
  isSelected?: boolean;
  isHovered?: boolean;
  isPreview?: boolean;
}

export function ModelSymbol2D({
  entityId,
  entity,
  view,
  transformOverride,
  isSelected,
  isHovered,
  isPreview,
}: ModelSymbol2DProps) {
  const entities = useSceneStore((s) => s.document.entities);
  const footprints = useModelFootprintStore((s) => s.footprints);

  const renderEntities =
    transformOverride && entities[entityId]
      ? { ...entities, [entityId]: { ...entities[entityId], transform: transformOverride } }
      : entities;

  const displayCorners = getEntityFootprintCorners(entityId, renderEntities, footprints);
  if (displayCorners.length < 3) return null;

  const worldTransform = transformOverride ?? useSceneStore.getState().getEntityWorldTransform(entityId);
  const center = footprintCenter(displayCorners);
  const screenCenter = worldToScreen(center, view);
  const asset = entity.type === 'model' ? getAssetById(entity.assetId ?? '') : null;
  const thumbnail = asset?.thumbnail ? publicUrl(asset.thumbnail) : null;
  const rotationDeg = -worldTransform.rotation.y;

  const screenCorners = displayCorners.map((p) => worldToScreen(p, view));
  const minX = Math.min(...screenCorners.map((s) => s.x));
  const maxX = Math.max(...screenCorners.map((s) => s.x));
  const minY = Math.min(...screenCorners.map((s) => s.y));
  const maxY = Math.max(...screenCorners.map((s) => s.y));
  const imgW = maxX - minX;
  const imgH = maxY - minY;

  const classSuffix = `${isPreview ? ' is-preview' : ''}${isSelected ? ' is-selected' : ''}${isHovered ? ' is-hovered' : ''}${entity.locked ? ' is-locked' : ''}`;

  return (
    <g className={`floor-plan-canvas__model-symbol${classSuffix}`}>
      <polygon
        points={pointsToSvg(displayCorners, view)}
        className="floor-plan-canvas__model-footprint"
      />
      {thumbnail && imgW > 8 && imgH > 8 && (
        <g transform={`translate(${screenCenter.x}, ${screenCenter.y}) rotate(${rotationDeg})`}>
          <image
            href={thumbnail}
            x={-imgW / 2}
            y={-imgH / 2}
            width={imgW}
            height={imgH}
            preserveAspectRatio="xMidYMid meet"
            opacity={0.88}
            pointerEvents="none"
          />
        </g>
      )}
      <polygon
        points={pointsToSvg(displayCorners, view)}
        className="floor-plan-canvas__model-outline"
        fill="none"
        pointerEvents="none"
      />
      <text
        x={screenCenter.x}
        y={screenCenter.y + 4}
        textAnchor="middle"
        className="floor-plan-canvas__model-label"
        pointerEvents="none"
      >
        {entity.name}
      </text>
    </g>
  );
}
